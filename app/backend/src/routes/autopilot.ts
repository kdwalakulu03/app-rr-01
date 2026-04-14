import { Router } from 'express';
import { pool } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AutopilotSuggestion, TripActivity } from '../types/index.js';

export const autopilotRouter = Router();

/**
 * AUTOPILOT ENGINE
 * 
 * This is the core competitive advantage of Roam Richer - the real-time decision loop.
 * 
 * When a user is executing their trip, the autopilot:
 * 1. Loads today's planned activities
 * 2. Gets user's current location + time + weather (from request)
 * 3. Scores remaining options based on:
 *    - Distance/travel time from current spot
 *    - Time-of-day fit (morning/afternoon/evening activity)
 *    - Priority level (anchor vs optional)
 *    - Weather suitability (if raining → indoor activities)
 * 4. Suggests the next best stop
 * 5. User confirms/skips/delays
 * 
 * Dynamic Replanning:
 * - If running late → drop optional items
 * - If skip something → reshuffle day
 * - If way ahead → suggest bonus activity
 * - Auto-push remaining to tomorrow if needed
 */

// Get next activity suggestion for active trip
autopilotRouter.get('/suggest/:tripId', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId } = req.params;
    const { lat, lng, time } = req.query;

    // Verify trip ownership and status
    const tripResult = await pool.query(`
      SELECT t.*, td.id as current_day_id, td.date as current_date
      FROM trips t
      JOIN trip_days td ON td.trip_id = t.id AND td.day_number = t.current_day
      WHERE t.id = $1 AND t.user_id = $2 AND t.status = 'active'
    `, [tripId, userId]);

    if (tripResult.rows.length === 0) {
      throw new AppError('Active trip not found', 404, 'NOT_FOUND');
    }

    const trip = tripResult.rows[0];
    const currentTime = time ? new Date(time as string) : new Date();
    const currentHour = currentTime.getHours();

    // Get pending activities for today
    const activitiesResult = await pool.query(`
      SELECT 
        ta.id,
        ta.name,
        ta.description,
        ta.category,
        ta.sequence_order as "sequenceOrder",
        ta.planned_start_time as "plannedStartTime",
        ta.planned_duration_minutes as "plannedDurationMinutes",
        ta.place_name as "placeName",
        ta.latitude,
        ta.longitude,
        ta.estimated_cost as "estimatedCost",
        ta.status,
        e.priority,
        e.time_of_day_fit as "timeOfDayFit",
        e.indoor,
        e.skip_if_rain as "skipIfRain"
      FROM trip_activities ta
      LEFT JOIN experiences e ON e.id = ta.experience_id
      WHERE ta.trip_id = $1 
        AND ta.day_number = $2
        AND ta.status = 'pending'
      ORDER BY ta.sequence_order
    `, [tripId, trip.current_day]);

    const activities = activitiesResult.rows as (TripActivity & {
      priority?: string;
      timeOfDayFit?: string[];
      indoor?: boolean;
      skipIfRain?: boolean;
    })[];

    if (activities.length === 0) {
      return res.json({
        suggestion: null,
        message: "All activities for today are complete! 🎉",
        dayComplete: true,
      });
    }

    // Score each activity
    const scoredActivities = activities.map(activity => {
      let score = 100; // Start with base score
      const reasons: string[] = [];

      // 1. Time-of-day fit (0-30 points)
      const timeOfDayFit = activity.timeOfDayFit || [];
      const currentTimeSlot = 
        currentHour < 12 ? 'morning' :
        currentHour < 17 ? 'afternoon' :
        currentHour < 21 ? 'evening' : 'night';

      if (timeOfDayFit.length > 0) {
        if (timeOfDayFit.includes(currentTimeSlot)) {
          score += 30;
          reasons.push(`Good for ${currentTimeSlot}`);
        } else {
          score -= 20;
        }
      }

      // 2. Priority (anchor activities get priority)
      if (activity.priority === 'anchor') {
        score += 25;
        reasons.push('Must-do activity');
      } else if (activity.priority === 'high') {
        score += 15;
        reasons.push('Recommended');
      } else if (activity.priority === 'optional') {
        score -= 10;
      }

      // 3. Distance from current location (if provided)
      if (lat && lng && activity.latitude && activity.longitude) {
        const distance = calculateDistance(
          parseFloat(lat as string),
          parseFloat(lng as string),
          activity.latitude,
          activity.longitude
        );
        
        // Closer is better
        if (distance < 0.5) {
          score += 20;
          reasons.push('Very close by');
        } else if (distance < 2) {
          score += 10;
          reasons.push('Nearby');
        } else if (distance > 10) {
          score -= 15;
        }

        // Estimate travel time (rough: 3min/km for city, assuming walking/transit mix)
        const estimatedTravelMinutes = Math.round(distance * 3);
        (activity as AutopilotSuggestion['activity'] & { estimatedTravelTime?: number })
          .estimatedTravelTime = estimatedTravelMinutes;
      }

      // 4. Sequence order (prefer maintaining order)
      score += (10 - activity.sequenceOrder) * 2;

      // 5. Weather consideration (would need weather API in production)
      // For now, just include indoor preference logic
      if (activity.indoor) {
        reasons.push('Indoor activity');
      }

      return {
        activity,
        score,
        reason: reasons.length > 0 ? reasons.join(' • ') : 'Next in sequence',
        estimatedTravelTime: (activity as AutopilotSuggestion['activity'] & { estimatedTravelTime?: number })
          .estimatedTravelTime || 0,
      } as AutopilotSuggestion;
    });

    // Sort by score descending
    scoredActivities.sort((a, b) => b.score - a.score);

    const suggestion = scoredActivities[0];
    const alternatives = scoredActivities.slice(1, 4);

    res.json({
      suggestion,
      alternatives,
      remainingCount: activities.length,
      currentDay: trip.current_day,
      dayComplete: false,
    });
  } catch (error) {
    next(error);
  }
});

// Replan day (when running late or skipping activities)
autopilotRouter.post('/replan/:tripId', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId } = req.params;
    const { reason, currentTime } = req.body; // reason: 'running_late', 'skip_requested', 'ahead_of_schedule'

    // Verify trip
    const tripResult = await pool.query(
      'SELECT * FROM trips WHERE id = $1 AND user_id = $2 AND status = $3',
      [tripId, userId, 'active']
    );

    if (tripResult.rows.length === 0) {
      throw new AppError('Active trip not found', 404, 'NOT_FOUND');
    }

    const trip = tripResult.rows[0];

    // Get remaining activities for today
    const activitiesResult = await pool.query(`
      SELECT ta.*, e.priority
      FROM trip_activities ta
      LEFT JOIN experiences e ON e.id = ta.experience_id
      WHERE ta.trip_id = $1 
        AND ta.day_number = $2
        AND ta.status = 'pending'
      ORDER BY ta.sequence_order
    `, [tripId, trip.current_day]);

    const activities = activitiesResult.rows;
    const actions: string[] = [];

    if (reason === 'running_late' && activities.length > 2) {
      // Drop optional activities
      const optionalActivities = activities.filter(a => a.priority === 'optional');
      
      for (const activity of optionalActivities.slice(0, 2)) {
        await pool.query(`
          UPDATE trip_activities 
          SET status = 'rescheduled', skip_reason = 'Auto-rescheduled: running late'
          WHERE id = $1
        `, [activity.id]);
        
        // Try to push to next day
        const nextDayResult = await pool.query(`
          SELECT id FROM trip_days 
          WHERE trip_id = $1 AND day_number = $2
        `, [tripId, trip.current_day + 1]);

        if (nextDayResult.rows.length > 0) {
          await pool.query(`
            UPDATE trip_activities 
            SET day_number = $1, trip_day_id = $2, status = 'pending', skip_reason = NULL
            WHERE id = $3
          `, [trip.current_day + 1, nextDayResult.rows[0].id, activity.id]);
          
          actions.push(`Moved "${activity.name}" to tomorrow`);
        } else {
          actions.push(`Dropped "${activity.name}" (no more days)`);
        }
      }
    }

    if (reason === 'ahead_of_schedule') {
      // Check if there are bonus activities we can suggest
      // In a real implementation, we'd query for nearby experiences not in the trip
      actions.push('Great progress! Consider exploring nearby attractions.');
    }

    // Log the replan event
    await pool.query(`
      INSERT INTO trip_logs (trip_id, user_id, event_type, data)
      VALUES ($1, $2, 'day_replanned', $3)
    `, [tripId, userId, JSON.stringify({ reason, actions, currentTime })]);

    res.json({
      success: true,
      reason,
      actions,
      message: actions.length > 0 ? 
        `Replanned your day: ${actions.join('. ')}` : 
        'No changes needed',
    });
  } catch (error) {
    next(error);
  }
});

// End current day and move to next
autopilotRouter.post('/end-day/:tripId', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId } = req.params;

    const tripResult = await pool.query(
      'SELECT * FROM trips WHERE id = $1 AND user_id = $2 AND status = $3',
      [tripId, userId, 'active']
    );

    if (tripResult.rows.length === 0) {
      throw new AppError('Active trip not found', 404, 'NOT_FOUND');
    }

    const trip = tripResult.rows[0];

    // Mark current day as completed
    await pool.query(`
      UPDATE trip_days 
      SET status = 'completed', completed_at = NOW()
      WHERE trip_id = $1 AND day_number = $2
    `, [tripId, trip.current_day]);

    // Check if there's a next day
    const nextDayResult = await pool.query(`
      SELECT id FROM trip_days 
      WHERE trip_id = $1 AND day_number = $2
    `, [tripId, trip.current_day + 1]);

    if (nextDayResult.rows.length > 0) {
      // Move to next day
      await pool.query(`
        UPDATE trips SET current_day = current_day + 1 WHERE id = $1
      `, [tripId]);

      await pool.query(`
        UPDATE trip_days 
        SET status = 'active', started_at = NOW()
        WHERE trip_id = $1 AND day_number = $2
      `, [tripId, trip.current_day + 1]);

      // Log day transition
      await pool.query(`
        INSERT INTO trip_logs (trip_id, user_id, event_type, data)
        VALUES ($1, $2, 'day_ended', $3)
      `, [tripId, userId, JSON.stringify({ dayNumber: trip.current_day })]);

      res.json({
        message: `Day ${trip.current_day} complete! Starting day ${trip.current_day + 1}`,
        nextDay: trip.current_day + 1,
        tripComplete: false,
      });
    } else {
      // Trip is complete!
      await pool.query(`
        UPDATE trips 
        SET status = 'completed', completed_at = NOW()
        WHERE id = $1
      `, [tripId]);

      await pool.query(`
        INSERT INTO trip_logs (trip_id, user_id, event_type, data)
        VALUES ($1, $2, 'trip_completed', '{}')
      `, [tripId, userId]);

      res.json({
        message: 'Congratulations! Your trip is complete! 🎉',
        tripComplete: true,
      });
    }
  } catch (error) {
    next(error);
  }
});

// Log expense
autopilotRouter.post('/expense/:tripId', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId } = req.params;
    const { activityId, amount, currency, category, description } = req.body;

    // Verify trip
    const tripResult = await pool.query(
      'SELECT id FROM trips WHERE id = $1 AND user_id = $2',
      [tripId, userId]
    );

    if (tripResult.rows.length === 0) {
      throw new AppError('Trip not found', 404, 'NOT_FOUND');
    }

    // If activity specified, update it
    if (activityId) {
      await pool.query(`
        UPDATE trip_activities 
        SET actual_cost = COALESCE(actual_cost, 0) + $1
        WHERE id = $2 AND trip_id = $3
      `, [amount, activityId, tripId]);
    }

    // Update trip total
    await pool.query(`
      UPDATE trips SET total_spent = COALESCE(total_spent, 0) + $1 WHERE id = $2
    `, [amount, tripId]);

    // Log expense
    await pool.query(`
      INSERT INTO trip_logs (trip_id, trip_activity_id, user_id, event_type, data)
      VALUES ($1, $2, $3, 'expense_logged', $4)
    `, [tripId, activityId || null, userId, JSON.stringify({
      amount,
      currency: currency || 'USD',
      category,
      description,
    })]);

    res.json({ success: true, message: 'Expense logged' });
  } catch (error) {
    next(error);
  }
});

// Get trip analytics
autopilotRouter.get('/analytics/:tripId', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { tripId } = req.params;

    // Verify trip
    const tripResult = await pool.query(`
      SELECT t.*, 
        EXTRACT(EPOCH FROM (t.completed_at - t.started_at))/3600 as total_hours
      FROM trips t 
      WHERE t.id = $1 AND t.user_id = $2
    `, [tripId, userId]);

    if (tripResult.rows.length === 0) {
      throw new AppError('Trip not found', 404, 'NOT_FOUND');
    }

    const trip = tripResult.rows[0];

    // Get activity stats
    const activityStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
        AVG(actual_duration_minutes) FILTER (WHERE status = 'completed') as avg_duration,
        SUM(actual_cost) as total_cost
      FROM trip_activities
      WHERE trip_id = $1
    `, [tripId]);

    // Get daily breakdown
    const dailyStats = await pool.query(`
      SELECT 
        td.day_number,
        td.date,
        td.city,
        td.completed_activities,
        td.skipped_activities,
        td.total_spent,
        EXTRACT(EPOCH FROM (td.completed_at - td.started_at))/3600 as hours_active
      FROM trip_days td
      WHERE td.trip_id = $1
      ORDER BY td.day_number
    `, [tripId]);

    // Get skip reasons
    const skipReasons = await pool.query(`
      SELECT skip_reason, COUNT(*) as count
      FROM trip_activities
      WHERE trip_id = $1 AND status = 'skipped' AND skip_reason IS NOT NULL
      GROUP BY skip_reason
      ORDER BY count DESC
    `, [tripId]);

    // Get category breakdown
    const categoryBreakdown = await pool.query(`
      SELECT 
        category,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        AVG(rating) FILTER (WHERE rating IS NOT NULL) as avg_rating
      FROM trip_activities
      WHERE trip_id = $1
      GROUP BY category
    `, [tripId]);

    res.json({
      trip: {
        name: trip.name,
        status: trip.status,
        startDate: trip.start_date,
        endDate: trip.end_date,
        totalDays: trip.current_day,
        totalHours: parseFloat(trip.total_hours) || null,
      },
      activities: activityStats.rows[0],
      dailyBreakdown: dailyStats.rows,
      skipReasons: skipReasons.rows,
      categoryBreakdown: categoryBreakdown.rows,
      completionRate: trip.total_activities > 0 ? 
        ((trip.completed_activities / trip.total_activities) * 100).toFixed(1) : 0,
    });
  } catch (error) {
    next(error);
  }
});

// Helper: Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
