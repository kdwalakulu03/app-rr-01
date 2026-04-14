import { Router } from 'express';
import { pool, withTransaction } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import type { PoolClient } from 'pg';

export const itineraryRouter = Router();

// ============================================
// Interest → Place Category Mapping
// ============================================
const INTEREST_CATEGORY_MAP: Record<string, string[]> = {
  food: ['food_drink'],
  culture: ['culture', 'attractions'],
  nature: ['nature'],
  photography: ['nature', 'attractions', 'culture'],
  adventure: ['activities', 'nature'],
  shopping: ['shopping'],
  relaxation: ['wellness', 'nature'],
  nightlife: ['nightlife'],
  beaches: ['nature', 'activities'],
  wildlife: ['nature', 'activities'],
};

// Activities per day based on pace
const ACTIVITIES_PER_DAY: Record<string, number> = {
  relaxed: 4,
  normal: 6,
  fast: 8,
};

// Buffer radius (meters) for spatial grouping within a single day
// Activities within this radius can be visited comfortably on foot/tuktuk
const DAY_BUFFER_RADIUS: Record<string, number> = {
  relaxed: 3000,  // 3 km — stay compact
  normal: 5000,   // 5 km — general walking + tuktuk
  fast: 8000,     // 8 km — willing to travel more
};

// Time slots for scheduling
const TIME_SLOTS = [
  { start: '08:00', label: 'morning-early', hours: 8 },
  { start: '09:30', label: 'morning', hours: 9.5 },
  { start: '11:00', label: 'late-morning', hours: 11 },
  { start: '12:30', label: 'lunch', hours: 12.5 },
  { start: '14:00', label: 'afternoon-early', hours: 14 },
  { start: '15:30', label: 'afternoon', hours: 15.5 },
  { start: '17:00', label: 'late-afternoon', hours: 17 },
  { start: '18:30', label: 'evening-early', hours: 18.5 },
  { start: '20:00', label: 'evening', hours: 20 },
  { start: '21:30', label: 'night', hours: 21.5 },
];

// Default duration estimates by category (minutes)
const CATEGORY_DURATION: Record<string, number> = {
  food_drink: 75,
  attractions: 90,
  culture: 90,
  nature: 120,
  activities: 120,
  wellness: 90,
  shopping: 60,
  nightlife: 120,
};

// Avg travel speed assumptions (m/s) for transit time estimates
const TRAVEL_SPEED_MS = 6; // ~22 km/h — accounts for stopping/walking between

interface PlaceForItinerary {
  id: number;
  name: string;
  city: string;
  mainCategory: string;
  subCategory: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  rating: number | null;
  reviewCount: number;
  priceLevel: number | null;
  imageUrl: string | null;
  avgDurationMinutes: number | null;
  distFromSeed?: number; // meters from the seed point — filled by spatial query
}

// ============================================
// ============================================
// Core generation logic — exported for use in trips.ts auto-generate
// ============================================
export async function generateItineraryForTrip(tripId: number): Promise<{ totalActivities: number; dayCount: number }> {
  // ---- 1. Load trip + days ------------------------------------------------
  const tripResult = await pool.query(
    'SELECT * FROM trips WHERE id = $1',
    [tripId],
  );
  if (tripResult.rows.length === 0) throw new AppError('Trip not found', 404, 'NOT_FOUND');
  const trip = tripResult.rows[0];

  const daysResult = await pool.query(
    'SELECT id, day_number, date, city FROM trip_days WHERE trip_id = $1 ORDER BY day_number',
    [tripId],
  );
  const tripDays = daysResult.rows;
  if (tripDays.length === 0) throw new AppError('Trip has no days', 400, 'INVALID_STATE');

  // Clear existing activities
  await pool.query('DELETE FROM trip_activities WHERE trip_id = $1', [tripId]);

  // ---- 2. Derive parameters -----------------------------------------------
  const interests: string[] = trip.interests || [];
  const pace: string = trip.pace || 'normal';
  const budgetLevel: string = trip.budget_level || 'moderate';
  const cities: string[] = trip.cities || [];
  const countryCode: string = trip.country_code;
  const activitiesPerDay = ACTIVITIES_PER_DAY[pace] || 6;
  const bufferRadius = DAY_BUFFER_RADIUS[pace] || 5000;
  const maxPriceLevel = budgetLevel === 'budget' ? 2 : budgetLevel === 'luxury' ? 5 : 3;

  // Build target categories from interests
  const targetCategories = new Set<string>();
  for (const interest of interests) {
    (INTEREST_CATEGORY_MAP[interest] || []).forEach(c => targetCategories.add(c));
  }
  targetCategories.add('food_drink');
  targetCategories.add('attractions');
  if (interests.length === 0) {
    targetCategories.add('culture');
    targetCategories.add('nature');
    targetCategories.add('activities');
  }

  const catArray = Array.from(targetCategories);

  // ---- 3. For each city pick spatial "seed" centroids ----------------------
  const cityCentroids: Record<string, { lng: number; lat: number }> = {};
  for (const city of cities) {
    const centroidResult = await pool.query(`
      SELECT
        ST_X(ST_Centroid(ST_Collect(location))) as lng,
        ST_Y(ST_Centroid(ST_Collect(location))) as lat
      FROM (
        SELECT location
        FROM places
        WHERE country_code = $1
          AND city ILIKE $2
          AND main_category = ANY($3)
          AND is_active = true
          AND location IS NOT NULL
        ORDER BY COALESCE(rating, 0) DESC, review_count DESC
        LIMIT 50
      ) top_places
    `, [countryCode, city, catArray]);

    if (centroidResult.rows[0]?.lng) {
      cityCentroids[city] = {
        lng: parseFloat(centroidResult.rows[0].lng),
        lat: parseFloat(centroidResult.rows[0].lat),
      };
    }
  }

  // ---- 4. Generate activities per day using GIS buffer zones ---------------
  const usedPlaceIds = new Set<number>();
  let totalActivities = 0;

  await withTransaction(async (client: PoolClient) => {
    for (const day of tripDays) {
      const dayCity = day.city || cities[0] || null;
      if (!dayCity) continue;

      const centroid = cityCentroids[dayCity];
      if (!centroid) continue;

      const dayPlan = buildDayPlan(activitiesPerDay, interests);

      let seedLng = centroid.lng;
      let seedLat = centroid.lat;

      interface DayActivity {
        place: PlaceForItinerary;
        timeSlotIndex: number;
        startTime: string;
        duration: number;
        travelMinutes: number;
      }
      const dayActivities: DayActivity[] = [];

      for (const slot of dayPlan) {
        const place = await findNearestPlace(
          client,
          countryCode,
          dayCity,
          slot.category,
          catArray,
          seedLng,
          seedLat,
          bufferRadius,
          maxPriceLevel,
          usedPlaceIds,
        );

        if (!place) continue;

        usedPlaceIds.add(place.id);

        const distMeters = place.distFromSeed || 0;
        const travelMinutes = Math.round(distMeters / TRAVEL_SPEED_MS / 60);

        dayActivities.push({
          place,
          timeSlotIndex: slot.timeSlotIndex,
          startTime: TIME_SLOTS[slot.timeSlotIndex]?.start || '10:00',
          duration: place.avgDurationMinutes || CATEGORY_DURATION[place.mainCategory] || 60,
          travelMinutes,
        });

        seedLng = place.longitude;
        seedLat = place.latitude;
      }

      const ordered = nearestNeighborOrder(dayActivities);

      let clock = 8 * 60;
      for (let i = 0; i < ordered.length; i++) {
        const act = ordered[i];

        if (i > 0) {
          const prevAct = ordered[i - 1];
          const dist = haversineMeters(
            prevAct.place.latitude, prevAct.place.longitude,
            act.place.latitude, act.place.longitude,
          );
          const travelMin = Math.max(5, Math.round(dist / TRAVEL_SPEED_MS / 60));
          clock += travelMin;
        }

        if (act.place.mainCategory === 'food_drink') {
          if (clock < 12 * 60 + 45 && clock > 11 * 60 + 30) clock = 12 * 60 + 30;
          if (clock < 19 * 60 && clock > 17 * 60 + 30) clock = 18 * 60 + 30;
        }

        const h = Math.floor(clock / 60);
        const m = clock % 60;
        act.startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        act.timeSlotIndex = i;

        clock += act.duration;
      }

      for (let i = 0; i < ordered.length; i++) {
        const act = ordered[i];

        await client.query(`
          INSERT INTO trip_activities (
            trip_id, trip_day_id, place_id,
            name, description, category, day_number, sequence_order,
            planned_start_time, planned_duration_minutes,
            place_name, latitude, longitude, estimated_cost
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          tripId,
          day.id,
          act.place.id,
          act.place.name,
          act.place.description?.substring(0, 300) || null,
          act.place.mainCategory,
          day.day_number,
          i + 1,
          act.startTime,
          act.duration,
          act.place.name,
          act.place.latitude,
          act.place.longitude,
          estimateCost(act.place, budgetLevel),
        ]);
        totalActivities++;
      }

      await client.query(
        'UPDATE trip_days SET planned_activities = $1 WHERE id = $2',
        [ordered.length, day.id],
      );
    }

    await client.query(
      'UPDATE trips SET total_activities = $1 WHERE id = $2',
      [totalActivities, tripId],
    );
  });

  return { totalActivities, dayCount: tripDays.length };
}

// POST /:tripId/generate  — Smart GIS Itinerary
// ============================================
itineraryRouter.post('/:tripId/generate', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId } = req.params;

    // Verify ownership
    const tripCheck = await pool.query(
      'SELECT id FROM trips WHERE id = $1 AND user_id = $2',
      [tripId, userId],
    );
    if (tripCheck.rows.length === 0) throw new AppError('Trip not found', 404, 'NOT_FOUND');

    const result = await generateItineraryForTrip(Number(tripId));

    // Return the generated itinerary
    const activitiesResult = await pool.query(`
      SELECT
        ta.id, ta.trip_day_id as "tripDayId", ta.day_number as "dayNumber",
        ta.sequence_order as "sequenceOrder", ta.name, ta.description,
        ta.category, ta.planned_start_time as "plannedStartTime",
        ta.planned_duration_minutes as "plannedDurationMinutes",
        ta.place_name as "placeName", ta.place_id as "placeId",
        ta.latitude, ta.longitude, ta.estimated_cost as "estimatedCost",
        ta.status
      FROM trip_activities ta
      WHERE ta.trip_id = $1
      ORDER BY ta.day_number, ta.sequence_order
    `, [tripId]);

    res.json({
      message: `Generated ${result.totalActivities} activities across ${result.dayCount} days`,
      totalActivities: result.totalActivities,
      activities: activitiesResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /:tripId/activities — Add activity
// ============================================
itineraryRouter.post('/:tripId/activities', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId } = req.params;
    const {
      dayNumber, placeId, name, description, category,
      startTime, durationMinutes, placeName, latitude, longitude,
      estimatedCost, sequenceOrder, source,
    } = req.body;

    const tripCheck = await pool.query(
      'SELECT id FROM trips WHERE id = $1 AND user_id = $2', [tripId, userId],
    );
    if (tripCheck.rows.length === 0) throw new AppError('Trip not found', 404, 'NOT_FOUND');

    const dayResult = await pool.query(
      'SELECT id FROM trip_days WHERE trip_id = $1 AND day_number = $2', [tripId, dayNumber],
    );
    if (dayResult.rows.length === 0) throw new AppError('Trip day not found', 404, 'NOT_FOUND');
    const tripDayId = dayResult.rows[0].id;

    let order = sequenceOrder;
    if (!order) {
      const maxOrder = await pool.query(
        'SELECT COALESCE(MAX(sequence_order), 0) as max_order FROM trip_activities WHERE trip_day_id = $1',
        [tripDayId],
      );
      order = maxOrder.rows[0].max_order + 1;
    }

    const result = await pool.query(`
      INSERT INTO trip_activities (
        trip_id, trip_day_id, place_id,
        name, description, category, day_number, sequence_order,
        planned_start_time, planned_duration_minutes,
        place_name, latitude, longitude, estimated_cost, source
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [
      tripId, tripDayId, placeId || null,
      name, description || null, category || null, dayNumber, order,
      startTime || null, durationMinutes || 60,
      placeName || name, latitude || null, longitude || null, estimatedCost || null,
      source || (placeId ? 'places_db' : 'manual'),
    ]);

    await pool.query('UPDATE trip_days SET planned_activities = planned_activities + 1 WHERE id = $1', [tripDayId]);
    await pool.query('UPDATE trips SET total_activities = total_activities + 1 WHERE id = $1', [tripId]);

    res.status(201).json({ activity: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /:tripId/activities/:activityId — Edit
// ============================================
itineraryRouter.put('/:tripId/activities/:activityId', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId, activityId } = req.params;
    const updates = req.body;

    const tripCheck = await pool.query(
      'SELECT id FROM trips WHERE id = $1 AND user_id = $2', [tripId, userId],
    );
    if (tripCheck.rows.length === 0) throw new AppError('Trip not found', 404, 'NOT_FOUND');

    const allowedFields: Record<string, string> = {
      name: 'name',
      description: 'description',
      category: 'category',
      sequenceOrder: 'sequence_order',
      plannedStartTime: 'planned_start_time',
      plannedDurationMinutes: 'planned_duration_minutes',
      placeName: 'place_name',
      notes: 'notes',
      estimatedCost: 'estimated_cost',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let pi = 1;
    for (const [key, value] of Object.entries(updates)) {
      const dbField = allowedFields[key];
      if (dbField) { setClauses.push(`${dbField} = $${pi++}`); values.push(value); }
    }
    if (setClauses.length === 0) throw new AppError('No valid fields', 400, 'INVALID_INPUT');

    values.push(activityId, tripId);
    const result = await pool.query(
      `UPDATE trip_activities SET ${setClauses.join(', ')} WHERE id = $${pi++} AND trip_id = $${pi} RETURNING *`,
      values,
    );
    if (result.rows.length === 0) throw new AppError('Activity not found', 404, 'NOT_FOUND');

    res.json({ activity: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE /:tripId/activities/:activityId
// ============================================
itineraryRouter.delete('/:tripId/activities/:activityId', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId, activityId } = req.params;

    const tripCheck = await pool.query(
      'SELECT id FROM trips WHERE id = $1 AND user_id = $2', [tripId, userId],
    );
    if (tripCheck.rows.length === 0) throw new AppError('Trip not found', 404, 'NOT_FOUND');

    const result = await pool.query(
      'DELETE FROM trip_activities WHERE id = $1 AND trip_id = $2 RETURNING trip_day_id',
      [activityId, tripId],
    );
    if (result.rows.length === 0) throw new AppError('Activity not found', 404, 'NOT_FOUND');

    const tripDayId = result.rows[0].trip_day_id;
    if (tripDayId) {
      await pool.query('UPDATE trip_days SET planned_activities = GREATEST(planned_activities - 1, 0) WHERE id = $1', [tripDayId]);
    }
    await pool.query('UPDATE trips SET total_activities = GREATEST(total_activities - 1, 0) WHERE id = $1', [tripId]);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /:tripId/days/:dayNumber/reorder
// ============================================
itineraryRouter.put('/:tripId/days/:dayNumber/reorder', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId, dayNumber } = req.params;
    const { activityIds } = req.body;

    const tripCheck = await pool.query(
      'SELECT id FROM trips WHERE id = $1 AND user_id = $2', [tripId, userId],
    );
    if (tripCheck.rows.length === 0) throw new AppError('Trip not found', 404, 'NOT_FOUND');
    if (!Array.isArray(activityIds)) throw new AppError('activityIds must be an array', 400, 'INVALID_INPUT');

    for (let i = 0; i < activityIds.length; i++) {
      await pool.query(
        'UPDATE trip_activities SET sequence_order = $1 WHERE id = $2 AND trip_id = $3 AND day_number = $4',
        [i + 1, activityIds[i], tripId, parseInt(dayNumber)],
      );
    }

    res.json({ success: true, message: 'Activities reordered' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /:tripId/activities/:activityId/move
// ============================================
itineraryRouter.put('/:tripId/activities/:activityId/move', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId, activityId } = req.params;
    const { toDayNumber, toSequenceOrder } = req.body;

    const tripCheck = await pool.query('SELECT id FROM trips WHERE id = $1 AND user_id = $2', [tripId, userId]);
    if (tripCheck.rows.length === 0) throw new AppError('Trip not found', 404, 'NOT_FOUND');

    const dayResult = await pool.query('SELECT id FROM trip_days WHERE trip_id = $1 AND day_number = $2', [tripId, toDayNumber]);
    if (dayResult.rows.length === 0) throw new AppError('Target day not found', 404, 'NOT_FOUND');

    const currentActivity = await pool.query(
      'SELECT trip_day_id FROM trip_activities WHERE id = $1 AND trip_id = $2', [activityId, tripId],
    );
    if (currentActivity.rows.length === 0) throw new AppError('Activity not found', 404, 'NOT_FOUND');

    const oldDayId = currentActivity.rows[0].trip_day_id;
    const newDayId = dayResult.rows[0].id;

    await pool.query(`
      UPDATE trip_activities SET trip_day_id = $1, day_number = $2, sequence_order = $3
      WHERE id = $4 AND trip_id = $5
    `, [newDayId, toDayNumber, toSequenceOrder || 99, activityId, tripId]);

    if (oldDayId && oldDayId !== newDayId) {
      await pool.query('UPDATE trip_days SET planned_activities = GREATEST(planned_activities - 1, 0) WHERE id = $1', [oldDayId]);
      await pool.query('UPDATE trip_days SET planned_activities = planned_activities + 1 WHERE id = $1', [newDayId]);
    }

    res.json({ success: true, message: 'Activity moved' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /:tripId/search-places — GIS Proximity Search
// ============================================
itineraryRouter.get('/:tripId/search-places', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId } = req.params;
    const { query, city, category, lat, lng, radius = 5000, limit = 20 } = req.query;

    const tripCheck = await pool.query(
      'SELECT country_code, cities FROM trips WHERE id = $1 AND user_id = $2', [tripId, userId],
    );
    if (tripCheck.rows.length === 0) throw new AppError('Trip not found', 404, 'NOT_FOUND');
    const trip = tripCheck.rows[0];

    let sql: string;
    const params: unknown[] = [trip.country_code];
    let pi = 2;

    // If lat/lng provided → proximity search with distance calculation
    if (lat && lng) {
      const lngVal = parseFloat(lng as string);
      const latVal = parseFloat(lat as string);
      sql = `
        SELECT
          id, name, city,
          main_category as "mainCategory",
          sub_category as "subCategory",
          description, latitude, longitude,
          rating, review_count as "reviewCount",
          price_level as "priceLevel",
          image_url as "imageUrl",
          avg_duration_minutes as "avgDurationMinutes",
          ROUND(ST_Distance(
            location::geography,
            ST_SetSRID(ST_MakePoint($${pi}, $${pi + 1}), 4326)::geography
          )::numeric) as "distanceMeters"
        FROM places
        WHERE country_code = $1
          AND is_active = true
          AND ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint($${pi}, $${pi + 1}), 4326)::geography,
            $${pi + 2}
          )
      `;
      params.push(lngVal, latVal, Number(radius));
      pi += 3;
    } else {
      sql = `
        SELECT
          id, name, city,
          main_category as "mainCategory",
          sub_category as "subCategory",
          description, latitude, longitude,
          rating, review_count as "reviewCount",
          price_level as "priceLevel",
          image_url as "imageUrl",
          avg_duration_minutes as "avgDurationMinutes"
        FROM places
        WHERE country_code = $1 AND is_active = true
      `;
    }

    if (query) {
      sql += ` AND name ILIKE $${pi++}`;
      params.push(`%${query}%`);
    }
    if (city) {
      sql += ` AND city ILIKE $${pi++}`;
      params.push(`%${city}%`);
    }
    if (category) {
      sql += ` AND main_category = $${pi++}`;
      params.push(category);
    }

    // Order: if proximity search → distance, otherwise rating
    if (lat && lng) {
      sql += ` ORDER BY "distanceMeters" ASC LIMIT $${pi++}`;
    } else {
      sql += ` ORDER BY COALESCE(rating, 0) DESC, review_count DESC LIMIT $${pi++}`;
    }
    params.push(Number(limit));

    const result = await pool.query(sql, params);
    res.json({ places: result.rows });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /:tripId/nearby — find places near a day's activities
// ============================================
itineraryRouter.get('/:tripId/nearby', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId } = req.params;
    const { dayNumber, radius = 2000, category, limit = 15 } = req.query;

    const tripCheck = await pool.query(
      'SELECT country_code FROM trips WHERE id = $1 AND user_id = $2', [tripId, userId],
    );
    if (tripCheck.rows.length === 0) throw new AppError('Trip not found', 404, 'NOT_FOUND');

    // Build a buffer zone around all activities for the given day
    // using ST_Buffer on ST_Collect of activity points
    let sql = `
      WITH day_points AS (
        SELECT ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) as geom
        FROM trip_activities
        WHERE trip_id = $1 AND day_number = $2
          AND latitude IS NOT NULL AND longitude IS NOT NULL
      ),
      day_hull AS (
        SELECT ST_Buffer(ST_Collect(geom)::geography, $3) as zone
        FROM day_points
      ),
      existing_ids AS (
        SELECT place_id FROM trip_activities WHERE trip_id = $1 AND place_id IS NOT NULL
      )
      SELECT
        p.id, p.name, p.city,
        p.main_category as "mainCategory",
        p.sub_category as "subCategory",
        p.description, p.latitude, p.longitude,
        p.rating, p.review_count as "reviewCount",
        p.price_level as "priceLevel",
        p.image_url as "imageUrl",
        p.avg_duration_minutes as "avgDurationMinutes",
        ROUND(ST_Distance(
          p.location::geography,
          (SELECT ST_Centroid(ST_Collect(geom))::geography FROM day_points)
        )::numeric) as "distanceMeters"
      FROM places p, day_hull
      WHERE p.country_code = $4
        AND p.is_active = true
        AND p.main_category != 'accommodation'
        AND p.id NOT IN (SELECT place_id FROM existing_ids)
        AND ST_Intersects(p.location::geography, day_hull.zone)
    `;

    const params: unknown[] = [
      tripId,
      Number(dayNumber || 1),
      Number(radius),
      tripCheck.rows[0].country_code,
    ];
    let pi = 5;

    if (category) {
      sql += ` AND p.main_category = $${pi++}`;
      params.push(category);
    }

    sql += ` ORDER BY p.rating DESC NULLS LAST LIMIT $${pi++}`;
    params.push(Number(limit));

    const result = await pool.query(sql, params);
    res.json({ places: result.rows });
  } catch (error) {
    next(error);
  }
});


// =====================================================================
//  HELPER FUNCTIONS
// =====================================================================

/**
 * PostGIS-powered nearest-place finder.
 * Queries places within a buffer zone of the seed point, filtered by
 * category, budget, and excluding used IDs. Falls back to broader
 * categories if nothing matches.
 */
async function findNearestPlace(
  client: PoolClient,
  countryCode: string,
  city: string,
  preferredCategory: string,
  fallbackCategories: string[],
  seedLng: number,
  seedLat: number,
  bufferRadius: number,
  maxPriceLevel: number,
  usedPlaceIds: Set<number>,
): Promise<PlaceForItinerary | null> {
  const usedIds = Array.from(usedPlaceIds);
  // If no used IDs yet, use an impossible ID to avoid empty array issues
  const usedIdsParam = usedIds.length > 0 ? usedIds : [0];

  // The magic: PostGIS ST_DWithin for buffer zone + ST_Distance for ranking
  const baseQuery = `
    SELECT
      id, name, city,
      main_category as "mainCategory",
      sub_category as "subCategory",
      description, latitude, longitude,
      rating, review_count as "reviewCount",
      price_level as "priceLevel",
      image_url as "imageUrl",
      avg_duration_minutes as "avgDurationMinutes",
      ST_Distance(
        location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) as "distFromSeed"
    FROM places
    WHERE country_code = $3
      AND city ILIKE $4
      AND is_active = true
      AND location IS NOT NULL
      AND main_category = ANY($5)
      AND (price_level IS NULL OR price_level <= $6)
      AND id != ALL($7::int[])
      AND ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $8
      )
    ORDER BY
      -- Score: rating weight + proximity weight (closer = better)
      (COALESCE(rating, 3.0) / 5.0) * 0.5 +
      (1.0 - LEAST(ST_Distance(location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / $8, 1.0)) * 0.5
    DESC
    LIMIT 8
  `;

  // Try preferred category first
  const preferred = await client.query(baseQuery, [
    seedLng, seedLat, countryCode, city,
    [preferredCategory], maxPriceLevel, usedIdsParam, bufferRadius,
  ]);

  if (preferred.rows.length > 0) {
    // Pick randomly from top results for variety
    const topN = Math.min(4, preferred.rows.length);
    return preferred.rows[Math.floor(Math.random() * topN)];
  }

  // Fallback: try all target categories
  const fallback = await client.query(baseQuery, [
    seedLng, seedLat, countryCode, city,
    fallbackCategories, maxPriceLevel, usedIdsParam, bufferRadius,
  ]);

  if (fallback.rows.length > 0) {
    const topN = Math.min(4, fallback.rows.length);
    return fallback.rows[Math.floor(Math.random() * topN)];
  }

  // Last resort: widen the buffer to 2x, any non-accommodation category
  const wider = await client.query(baseQuery, [
    seedLng, seedLat, countryCode, city,
    fallbackCategories, 5, usedIdsParam, bufferRadius * 2,
  ]);

  if (wider.rows.length > 0) {
    return wider.rows[0];
  }

  return null;
}

/**
 * Nearest-neighbor TSP reordering.
 * Given an array of day activities with lat/lng, reorders them
 * so total travel distance is minimized (greedy nearest-neighbor).
 * Keeps food_drink activities near their original time slots (lunch/dinner).
 */
function nearestNeighborOrder<T extends { place: { latitude: number; longitude: number; mainCategory: string }; timeSlotIndex: number }>(
  activities: T[],
): T[] {
  if (activities.length <= 2) return activities;

  // Separate meals from other activities to keep them in correct time positions
  const meals: T[] = [];
  const others: T[] = [];
  for (const a of activities) {
    if (a.place.mainCategory === 'food_drink') {
      meals.push(a);
    } else {
      others.push(a);
    }
  }

  // Reorder non-meal activities by nearest-neighbor
  if (others.length <= 1) {
    return interleaveByTime([...others], meals);
  }

  const ordered: T[] = [];
  const remaining = [...others];

  // Start with the first (morning) activity
  ordered.push(remaining.shift()!);

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMeters(
        last.place.latitude, last.place.longitude,
        remaining[i].place.latitude, remaining[i].place.longitude,
      );
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }

  // Interleave meals back at appropriate positions
  return interleaveByTime(ordered, meals);
}

/**
 * Interleave meal activities into the ordered list at sensible positions.
 * First meal → after ~40% of activities (lunch), second meal → end (dinner).
 */
function interleaveByTime<T>(ordered: T[], meals: T[]): T[] {
  if (meals.length === 0) return ordered;

  const result = [...ordered];

  if (meals.length >= 1) {
    const lunchPos = Math.max(1, Math.floor(result.length * 0.4));
    result.splice(lunchPos, 0, meals[0]);
  }

  if (meals.length >= 2) {
    result.splice(result.length, 0, meals[1]);
  }

  for (let i = 2; i < meals.length; i++) {
    result.push(meals[i]);
  }

  return result;
}

/**
 * Haversine distance in meters between two lat/lng points.
 */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface DaySlot {
  category: string;
  timeSlotIndex: number;
}

function buildDayPlan(activitiesPerDay: number, interests: string[]): DaySlot[] {
  const templates: Record<number, DaySlot[]> = {
    4: [
      { category: 'attractions', timeSlotIndex: 1 },
      { category: 'food_drink', timeSlotIndex: 3 },
      { category: 'culture', timeSlotIndex: 4 },
      { category: 'food_drink', timeSlotIndex: 7 },
    ],
    6: [
      { category: 'nature', timeSlotIndex: 0 },
      { category: 'attractions', timeSlotIndex: 1 },
      { category: 'culture', timeSlotIndex: 2 },
      { category: 'food_drink', timeSlotIndex: 3 },
      { category: 'activities', timeSlotIndex: 4 },
      { category: 'food_drink', timeSlotIndex: 7 },
    ],
    8: [
      { category: 'nature', timeSlotIndex: 0 },
      { category: 'attractions', timeSlotIndex: 1 },
      { category: 'culture', timeSlotIndex: 2 },
      { category: 'food_drink', timeSlotIndex: 3 },
      { category: 'activities', timeSlotIndex: 4 },
      { category: 'shopping', timeSlotIndex: 5 },
      { category: 'food_drink', timeSlotIndex: 7 },
      { category: 'nightlife', timeSlotIndex: 8 },
    ],
  };

  const base = templates[activitiesPerDay] || templates[6];

  return base.map(slot => {
    let category = slot.category;
    if (interests.length > 0 && category !== 'food_drink' && Math.random() < 0.35) {
      const interest = interests[Math.floor(Math.random() * interests.length)];
      const cats = INTEREST_CATEGORY_MAP[interest];
      if (cats?.length) category = cats[Math.floor(Math.random() * cats.length)];
    }
    return { category, timeSlotIndex: slot.timeSlotIndex };
  });
}

function estimateCost(place: PlaceForItinerary, budgetLevel: string): number | null {
  if (place.priceLevel == null) return null;
  const costMap: Record<number, Record<string, number>> = {
    1: { budget: 3, moderate: 5, luxury: 8 },
    2: { budget: 8, moderate: 15, luxury: 25 },
    3: { budget: 15, moderate: 30, luxury: 50 },
    4: { budget: 30, moderate: 60, luxury: 100 },
    5: { budget: 50, moderate: 100, luxury: 200 },
  };
  return costMap[place.priceLevel]?.[budgetLevel] || null;
}
