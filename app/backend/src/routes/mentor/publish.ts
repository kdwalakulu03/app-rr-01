import { Router } from 'express';
import { pool, AppError } from './helpers.js';
import { withTransaction } from '../../db/index.js';
import type { Request, Response } from 'express';

export const publishRouter = Router();

/**
 * POST /routes/:id/publish — Validate & publish
 */
publishRouter.post('/routes/:id/publish', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.id);
  const creatorUid = req.user!.uid;

  await withTransaction(async (client) => {
    // Check ownership & draft status
    const routeCheck = await client.query(
      'SELECT id, title FROM mentor_routes WHERE id = $1 AND creator_uid = $2 AND status = $3',
      [routeId, creatorUid, 'draft']
    );
    if (routeCheck.rows.length === 0) {
      throw new AppError('Route not found or already published', 404, 'NOT_FOUND');
    }

    // Validate: must have at least 2 pins
    const pinCount = await client.query(
      'SELECT COUNT(*) as cnt FROM mentor_pins WHERE mentor_route_id = $1',
      [routeId]
    );
    if (parseInt(pinCount.rows[0].cnt) < 2) {
      throw new AppError('Route must have at least 2 pins to publish', 422, 'VALIDATION_FAILED');
    }

    // Build combined route geometry from segments (or straight lines between pins if no segments)
    const segments = await client.query(
      'SELECT ST_AsGeoJSON(geometry) as geojson FROM mentor_segments WHERE mentor_route_id = $1 ORDER BY sequence_order',
      [routeId]
    );

    if (segments.rows.length > 0) {
      await client.query(
        `UPDATE mentor_routes SET
           route_geometry = (SELECT ST_LineMerge(ST_Collect(geometry ORDER BY sequence_order)) FROM mentor_segments WHERE mentor_route_id = $1),
           bounds = (SELECT ST_Envelope(ST_Collect(geometry)) FROM mentor_segments WHERE mentor_route_id = $1)
         WHERE id = $1`,
        [routeId]
      );
    } else {
      await client.query(
        `UPDATE mentor_routes SET
           route_geometry = (SELECT ST_MakeLine(location ORDER BY sequence_order) FROM mentor_pins WHERE mentor_route_id = $1),
           bounds = (SELECT ST_Envelope(ST_Collect(location)) FROM mentor_pins WHERE mentor_route_id = $1)
         WHERE id = $1`,
        [routeId]
      );
    }

    // Count duration from pins
    const durationResult = await client.query(
      'SELECT COALESCE(MAX(day_number), 1) as days FROM mentor_pins WHERE mentor_route_id = $1',
      [routeId]
    );

    // Set published
    await client.query(
      `UPDATE mentor_routes SET status = 'published', published_at = NOW(), duration_days = $2 WHERE id = $1`,
      [routeId, durationResult.rows[0].days]
    );

    // Increment user's route_count
    await client.query(
      `UPDATE users SET route_count = route_count + 1 WHERE firebase_uid = $1`,
      [creatorUid]
    );
  });

  res.json({ success: true, status: 'published' });
});

/**
 * POST /routes/:id/fork — Fork a published route into a new draft for the current user
 */
publishRouter.post('/routes/:id/fork', async (req: Request, res: Response) => {
  const sourceId = parseInt(req.params.id);
  const creatorUid = req.user!.uid;

  // Verify source is published
  const source = await pool.query(
    `SELECT id, title, description, country_code, region, travel_style,
            transport_modes, budget_per_day_usd, best_season, difficulty
     FROM mentor_routes WHERE id = $1 AND status = 'published'`,
    [sourceId]
  );
  if (source.rows.length === 0) {
    throw new AppError('Route not found or not published', 404, 'NOT_FOUND');
  }

  const s = source.rows[0];

  const newRoute = await withTransaction(async (client) => {
    // Create new draft forked route
    const routeResult = await client.query(
      `INSERT INTO mentor_routes (creator_uid, title, description, country_code, region,
        travel_style, transport_modes, budget_per_day_usd, best_season, difficulty, forked_from)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, title, status`,
      [creatorUid, `${s.title} (fork)`, s.description, s.country_code, s.region,
       s.travel_style, s.transport_modes, s.budget_per_day_usd, s.best_season, s.difficulty, sourceId]
    );
    const newId = routeResult.rows[0].id;

    // Copy pins (re-map IDs)
    const oldPins = await client.query(
      `SELECT category, title, notes, tips, photos, cost_usd, duration_minutes,
              time_of_day, day_number, sequence_order, ST_AsText(location) as loc_wkt
       FROM mentor_pins WHERE mentor_route_id = $1 ORDER BY sequence_order`,
      [sourceId]
    );
    const pinIdMap = new Map<number, number>(); // old_seq → new_id (for segments)
    for (const p of oldPins.rows) {
      const pinRes = await client.query(
        `INSERT INTO mentor_pins (mentor_route_id, location, category, title, notes, tips, photos,
          cost_usd, duration_minutes, time_of_day, day_number, sequence_order)
         VALUES ($1, ST_GeomFromText($2, 4326), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [newId, p.loc_wkt, p.category, p.title, p.notes, p.tips, p.photos,
         p.cost_usd, p.duration_minutes, p.time_of_day, p.day_number, p.sequence_order]
      );
      pinIdMap.set(p.sequence_order, pinRes.rows[0].id);
    }

    // Copy segments
    await client.query(
      `INSERT INTO mentor_segments (mentor_route_id, from_pin_id, to_pin_id, geometry,
        transport_mode, distance_km, duration_minutes, cost_usd, tips, sequence_order)
       SELECT $1, NULL, NULL, geometry,
              transport_mode, distance_km, duration_minutes, cost_usd, tips, sequence_order
       FROM mentor_segments WHERE mentor_route_id = $2`,
      [newId, sourceId]
    );

    // Copy areas
    await client.query(
      `INSERT INTO mentor_areas (mentor_route_id, boundary, label, notes, category, color, opacity)
       SELECT $1, boundary, label, notes, category, color, opacity
       FROM mentor_areas WHERE mentor_route_id = $2`,
      [newId, sourceId]
    );

    // Increment fork_count on original
    await client.query(
      'UPDATE mentor_routes SET fork_count = fork_count + 1 WHERE id = $1',
      [sourceId]
    );

    return routeResult.rows[0];
  });

  res.status(201).json(newRoute);
});
