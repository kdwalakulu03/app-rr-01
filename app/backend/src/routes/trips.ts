import { Router } from 'express';
import { pool, withTransaction } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Trip, CreateTripInput } from '../types/index.js';
import crypto from 'crypto';
import { generateItineraryForTrip } from './itinerary.js';

export const tripsRouter = Router();

// Get all trips for user
tripsRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.uid;

    const result = await pool.query(`
      SELECT 
        t.id,
        t.name,
        t.start_date as "startDate",
        t.end_date as "endDate",
        t.country_code as "countryCode",
        t.cities,
        t.group_type as "groupType",
        t.travelers,
        t.status,
        t.current_day as "currentDay",
        t.total_activities as "totalActivities",
        t.completed_activities as "completedActivities",
        t.skipped_activities as "skippedActivities",
        t.total_spent as "totalSpent",
        t.created_at as "createdAt",
        rt.name as "routeName",
        rt.slug as "routeSlug"
      FROM trips t
      LEFT JOIN route_versions rv ON rv.id = t.route_version_id
      LEFT JOIN route_templates rt ON rt.id = rv.route_template_id
      WHERE t.user_id = $1
      ORDER BY t.start_date DESC
    `, [userId]);

    res.json({ trips: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single trip with details
tripsRouter.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    // Get trip
    const tripResult = await pool.query(`
      SELECT 
        t.*,
        rt.name as route_name,
        rt.slug as route_slug
      FROM trips t
      LEFT JOIN route_versions rv ON rv.id = t.route_version_id
      LEFT JOIN route_templates rt ON rt.id = rv.route_template_id
      WHERE t.id = $1 AND t.user_id = $2
    `, [id, userId]);

    if (tripResult.rows.length === 0) {
      throw new AppError('Trip not found', 404, 'NOT_FOUND');
    }

    const trip = tripResult.rows[0];

    // Get trip days
    const daysResult = await pool.query(`
      SELECT 
        id,
        day_number as "dayNumber",
        date,
        status,
        city,
        weather_condition as "weatherCondition",
        weather_temp_c as "weatherTempC",
        planned_activities as "plannedActivities",
        completed_activities as "completedActivities",
        skipped_activities as "skippedActivities",
        total_spent as "totalSpent",
        notes
      FROM trip_days
      WHERE trip_id = $1
      ORDER BY day_number
    `, [id]);

    // Get activities for each day
    const activitiesResult = await pool.query(`
      SELECT 
        ta.id,
        ta.trip_day_id as "tripDayId",
        ta.day_number as "dayNumber",
        ta.sequence_order as "sequenceOrder",
        ta.name,
        ta.description,
        ta.category,
        ta.planned_start_time as "plannedStartTime",
        ta.planned_duration_minutes as "plannedDurationMinutes",
        ta.place_name as "placeName",
        ta.latitude,
        ta.longitude,
        ta.estimated_cost as "estimatedCost",
        ta.actual_cost as "actualCost",
        ta.status,
        ta.skip_reason as "skipReason",
        ta.actual_start_time as "actualStartTime",
        ta.actual_end_time as "actualEndTime",
        ta.actual_duration_minutes as "actualDurationMinutes",
        ta.notes,
        ta.rating
      FROM trip_activities ta
      WHERE ta.trip_id = $1
      ORDER BY ta.day_number, ta.sequence_order
    `, [id]);

    // Group activities by day
    const activitiesByDay = activitiesResult.rows.reduce((acc, activity) => {
      const dayId = activity.tripDayId;
      if (!acc[dayId]) acc[dayId] = [];
      acc[dayId].push(activity);
      return acc;
    }, {} as Record<number, unknown[]>);

    const days = daysResult.rows.map(day => ({
      ...day,
      activities: activitiesByDay[day.id] || [],
    }));

    // Fetch logged expenses from trip_logs
    const expensesResult = await pool.query(`
      SELECT id, trip_activity_id as "activityId", data, "timestamp" as "createdAt"
      FROM trip_logs
      WHERE trip_id = $1 AND event_type = 'expense_logged'
      ORDER BY "timestamp" DESC
    `, [id]);

    const expenses = expensesResult.rows.map(row => ({
      id: row.id,
      activityId: row.activityId,
      amount: row.data?.amount || 0,
      currency: row.data?.currency || 'USD',
      category: row.data?.category || 'other',
      description: row.data?.description || '',
      createdAt: row.createdAt,
    }));

    res.json({
      trip: {
        id: trip.id,
        userId: trip.user_id,
        routeVersionId: trip.route_version_id,
        routeName: trip.route_name,
        routeSlug: trip.route_slug,
        name: trip.name,
        startDate: trip.start_date,
        endDate: trip.end_date,
        countryCode: trip.country_code,
        cities: trip.cities,
        groupType: trip.group_type,
        travelers: trip.travelers,
        adults: trip.adults,
        kids: trip.kids,
        pace: trip.pace,
        budgetLevel: trip.budget_level,
        interests: trip.interests,
        transportModes: trip.transport_modes,
        status: trip.status,
        currentDay: trip.current_day,
        totalActivities: trip.total_activities,
        completedActivities: trip.completed_activities,
        skippedActivities: trip.skipped_activities,
        totalSpent: trip.total_spent,
        shareToken: trip.share_token,
        isPublic: trip.is_public,
        showCosts: trip.show_costs,
        showTimes: trip.show_times,
        startedAt: trip.started_at,
        completedAt: trip.completed_at,
        createdAt: trip.created_at,
        updatedAt: trip.updated_at,
        days,
        expenses,
      } as Trip,
    });
  } catch (error) {
    next(error);
  }
});

// Create new trip
tripsRouter.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const input: CreateTripInput = req.body;

    const trip = await withTransaction(async (client) => {
      // Create trip
      const tripResult = await client.query(`
        INSERT INTO trips (
          user_id, route_version_id, name, start_date, end_date,
          country_code, cities, group_type, travelers, adults, kids,
          pace, budget_level, interests, transport_modes, share_token
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16
        ) RETURNING *
      `, [
        userId,
        input.routeVersionId || null,
        input.name || `Trip to ${input.cities[0] || input.countryCode}`,
        input.startDate,
        input.endDate,
        input.countryCode,
        input.cities,
        input.groupType || 'solo',
        input.travelers || 1,
        input.adults || 1,
        input.kids || 0,
        input.pace || 'normal',
        input.budgetLevel || 'moderate',
        input.interests || [],
        input.transportModes || [],
        crypto.randomBytes(16).toString('hex'),
      ]);

      const trip = tripResult.rows[0];

      // Calculate number of days
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Create trip days
      for (let i = 0; i < dayCount; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        await client.query(`
          INSERT INTO trip_days (trip_id, day_number, date, city)
          VALUES ($1, $2, $3, $4)
        `, [
          trip.id,
          i + 1,
          date.toISOString().split('T')[0],
          input.cities[Math.min(i, input.cities.length - 1)] || null,
        ]);
      }

      // If based on a route, copy activities
      if (input.routeVersionId) {
        // Get route days and activities
        const routeDaysResult = await client.query(`
          SELECT rd.*, ra.* 
          FROM route_days rd
          LEFT JOIN route_activities ra ON ra.route_day_id = rd.id
          WHERE rd.route_version_id = $1
          ORDER BY rd.day_number, ra.sequence_order
        `, [input.routeVersionId]);

        // Get trip days
        const tripDaysResult = await client.query(
          'SELECT id, day_number FROM trip_days WHERE trip_id = $1',
          [trip.id]
        );
        const tripDaysMap = new Map(
          tripDaysResult.rows.map(d => [d.day_number, d.id])
        );

        // Copy activities
        let totalActivities = 0;
        for (const row of routeDaysResult.rows) {
          if (row.name) { // Has activity data
            const tripDayId = tripDaysMap.get(row.day_number);
            if (tripDayId) {
              await client.query(`
                INSERT INTO trip_activities (
                  trip_id, trip_day_id, route_activity_id, experience_id, place_id,
                  name, description, category, day_number, sequence_order,
                  planned_start_time, planned_duration_minutes,
                  place_name, latitude, longitude, estimated_cost
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
              `, [
                trip.id,
                tripDayId,
                row.id,
                row.experience_id,
                null, // place_id would come from experience
                row.name,
                row.description,
                row.category,
                row.day_number,
                row.sequence_order,
                row.start_time,
                row.duration_minutes,
                row.place_name,
                row.latitude,
                row.longitude,
                row.cost_estimate,
              ]);
              totalActivities++;
            }
          }
        }

        // Update total activities count
        await client.query(
          'UPDATE trips SET total_activities = $1 WHERE id = $2',
          [totalActivities, trip.id]
        );
      }

      return trip;
    });

    // Log trip creation
    await pool.query(`
      INSERT INTO trip_logs (trip_id, user_id, event_type, data)
      VALUES ($1, $2, 'trip_created', $3)
    `, [trip.id, userId, JSON.stringify({ source: input.routeVersionId ? 'route' : 'custom' })]);

    // Auto-generate itinerary for custom trips (no pre-built route)
    let itineraryGenerated = false;
    if (!input.routeVersionId) {
      try {
        await generateItineraryForTrip(trip.id);
        itineraryGenerated = true;
      } catch (err) {
        console.error('Auto-generate itinerary failed (non-fatal):', err);
      }
    }

    res.status(201).json({ 
      trip: { id: trip.id, name: trip.name },
      message: itineraryGenerated
        ? 'Trip created with itinerary'
        : 'Trip created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Update trip
tripsRouter.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const updates = req.body;

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT id FROM trips WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Trip not found', 404, 'NOT_FOUND');
    }

    // Build update query
    const allowedFields = [
      'name', 'status', 'current_day', 'is_public', 'show_costs', 'show_times', 'notes'
    ];
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      throw new AppError('No valid fields to update', 400, 'INVALID_INPUT');
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE trips SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({ trip: result.rows[0], message: 'Trip updated' });
  } catch (error) {
    next(error);
  }
});

// Delete trip
tripsRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM trips WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Trip not found', 404, 'NOT_FOUND');
    }

    res.json({ success: true, message: 'Trip deleted' });
  } catch (error) {
    next(error);
  }
});

// Start trip execution
tripsRouter.post('/:id/start', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE trips 
      SET status = 'active', started_at = NOW(), current_day = 1
      WHERE id = $1 AND user_id = $2 AND status = 'planning'
      RETURNING *
    `, [id, userId]);

    if (result.rows.length === 0) {
      throw new AppError('Trip not found or already started', 404, 'NOT_FOUND');
    }

    // Log trip start
    await pool.query(`
      INSERT INTO trip_logs (trip_id, user_id, event_type, data)
      VALUES ($1, $2, 'trip_started', '{}')
    `, [id, userId]);

    // Mark first day as active
    await pool.query(`
      UPDATE trip_days SET status = 'active', started_at = NOW()
      WHERE trip_id = $1 AND day_number = 1
    `, [id]);

    res.json({ message: 'Trip started!', trip: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update activity status
tripsRouter.put('/:tripId/activities/:activityId', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId, activityId } = req.params;
    const { status, skipReason, actualCost, rating, notes } = req.body;

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT id FROM trips WHERE id = $1 AND user_id = $2',
      [tripId, userId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Trip not found', 404, 'NOT_FOUND');
    }

    // Update activity
    const result = await pool.query(`
      UPDATE trip_activities SET
        status = COALESCE($1, status),
        skip_reason = COALESCE($2, skip_reason),
        actual_cost = COALESCE($3, actual_cost),
        rating = COALESCE($4, rating),
        notes = COALESCE($5, notes),
        actual_start_time = CASE WHEN $1 = 'in_progress' THEN NOW() ELSE actual_start_time END,
        actual_end_time = CASE WHEN $1 IN ('completed', 'skipped') THEN NOW() ELSE actual_end_time END
      WHERE id = $6 AND trip_id = $7
      RETURNING *
    `, [status, skipReason, actualCost, rating, notes, activityId, tripId]);

    if (result.rows.length === 0) {
      throw new AppError('Activity not found', 404, 'NOT_FOUND');
    }

    const activity = result.rows[0];

    // Log the event
    const eventType = status === 'completed' ? 'activity_completed' : 
                      status === 'skipped' ? 'activity_skipped' : 
                      status === 'in_progress' ? 'activity_started' : null;
    
    if (eventType) {
      await pool.query(`
        INSERT INTO trip_logs (trip_id, trip_activity_id, user_id, event_type, data)
        VALUES ($1, $2, $3, $4, $5)
      `, [tripId, activityId, userId, eventType, JSON.stringify({ 
        skipReason, actualCost, rating 
      })]);
    }

    // Update trip stats
    if (status === 'completed' || status === 'skipped') {
      const statField = status === 'completed' ? 'completed_activities' : 'skipped_activities';
      await pool.query(`
        UPDATE trips SET ${statField} = ${statField} + 1
        WHERE id = $1
      `, [tripId]);

      // Update day stats too
      if (activity.trip_day_id) {
        await pool.query(`
          UPDATE trip_days SET ${statField} = ${statField} + 1
          WHERE id = $1
        `, [activity.trip_day_id]);
      }
    }

    res.json({ activity: result.rows[0], message: `Activity ${status}` });
  } catch (error) {
    next(error);
  }
});

// Get shared trip (public)
tripsRouter.get('/share/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await pool.query(`
      SELECT 
        t.id, t.name, t.start_date, t.end_date, t.country_code, t.cities,
        t.status, t.current_day, t.total_activities, t.completed_activities,
        t.is_public, t.show_costs, t.show_times
      FROM trips t
      WHERE t.share_token = $1 AND t.is_public = true
    `, [token]);

    if (result.rows.length === 0) {
      throw new AppError('Shared trip not found', 404, 'NOT_FOUND');
    }

    const trip = result.rows[0];

    // Get trip days and activities
    const daysResult = await pool.query(`
      SELECT td.*, 
        json_agg(
          json_build_object(
            'id', ta.id,
            'name', ta.name,
            'category', ta.category,
            'status', ta.status,
            'placeName', ta.place_name
          ) ORDER BY ta.sequence_order
        ) FILTER (WHERE ta.id IS NOT NULL) as activities
      FROM trip_days td
      LEFT JOIN trip_activities ta ON ta.trip_day_id = td.id
      WHERE td.trip_id = $1
      GROUP BY td.id
      ORDER BY td.day_number
    `, [trip.id]);

    res.json({
      trip: {
        ...trip,
        days: daysResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});
