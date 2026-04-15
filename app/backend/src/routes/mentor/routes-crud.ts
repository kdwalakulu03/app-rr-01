import { Router } from 'express';
import { pool, AppError, buildUpdateSets } from './helpers.js';
import type { Request, Response } from 'express';

export const routesCrudRouter = Router();

/**
 * POST /routes — Create a new draft route
 */
routesCrudRouter.post('/routes', async (req: Request, res: Response) => {
  const creatorUid = req.user!.uid;
  const { title, description, countryCode, region, travelStyle, transportModes, budgetPerDayUsd, bestSeason, difficulty } = req.body;

  const result = await pool.query(
    `INSERT INTO mentor_routes (creator_uid, title, description, country_code, region, travel_style, transport_modes, budget_per_day_usd, best_season, difficulty)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, title, status, created_at`,
    [creatorUid, title || 'Untitled Route', description || null, countryCode || null, region || null, travelStyle || null, transportModes || '{}', budgetPerDayUsd || null, bestSeason || null, difficulty || null]
  );

  res.status(201).json(result.rows[0]);
});

/**
 * GET /routes — List current user's routes
 */
routesCrudRouter.get('/routes', async (req: Request, res: Response) => {
  const creatorUid = req.user!.uid;
  const { status } = req.query;

  let query = `SELECT id, title, description, country_code, region, cities, duration_days,
                      travel_style, status, view_count, save_count, fork_count,
                      created_at, updated_at, published_at,
                      (SELECT COUNT(*) FROM mentor_pins WHERE mentor_route_id = mr.id) as pin_count,
                      (SELECT COUNT(*) FROM mentor_segments WHERE mentor_route_id = mr.id) as segment_count
               FROM mentor_routes mr
               WHERE creator_uid = $1`;
  const params: unknown[] = [creatorUid];

  if (status && ['draft', 'published', 'archived'].includes(status as string)) {
    query += ` AND status = $2`;
    params.push(status);
  }

  query += ' ORDER BY updated_at DESC';

  const result = await pool.query(query, params);
  res.json({ routes: result.rows });
});

/**
 * GET /routes/:id — Get full route with pins, segments, areas
 */
routesCrudRouter.get('/routes/:id', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.id);
  const creatorUid = req.user!.uid;

  const routeResult = await pool.query(
    `SELECT id, creator_uid, title, description, country_code, region, cities,
            duration_days, travel_style, transport_modes, budget_per_day_usd,
            best_season, difficulty, status, view_count, save_count, fork_count,
            ST_AsGeoJSON(route_geometry) as route_geojson,
            ST_AsGeoJSON(bounds) as bounds_geojson,
            created_at, updated_at, published_at
     FROM mentor_routes
     WHERE id = $1 AND (creator_uid = $2 OR status = 'published')`,
    [routeId, creatorUid]
  );

  if (routeResult.rows.length === 0) {
    throw new AppError('Route not found', 404, 'NOT_FOUND');
  }

  const route = routeResult.rows[0];

  const [pinsResult, segmentsResult, areasResult] = await Promise.all([
    pool.query(
      `SELECT id, category, title, notes, tips, photos, cost_usd, duration_minutes,
              time_of_day, sequence_order, day_number,
              ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
       FROM mentor_pins
       WHERE mentor_route_id = $1
       ORDER BY sequence_order`,
      [routeId]
    ),
    pool.query(
      `SELECT id, from_pin_id, to_pin_id, transport_mode, distance_km,
              duration_minutes, cost_usd, tips, sequence_order,
              ST_AsGeoJSON(geometry) as geojson
       FROM mentor_segments
       WHERE mentor_route_id = $1
       ORDER BY sequence_order`,
      [routeId]
    ),
    pool.query(
      `SELECT id, label, notes, category, color, opacity,
              ST_AsGeoJSON(boundary) as geojson
       FROM mentor_areas
       WHERE mentor_route_id = $1`,
      [routeId]
    ),
  ]);

  res.json({
    route: {
      ...route,
      route_geometry: route.route_geojson ? JSON.parse(route.route_geojson) : null,
      bounds: route.bounds_geojson ? JSON.parse(route.bounds_geojson) : null,
    },
    pins: pinsResult.rows,
    segments: segmentsResult.rows.map(s => ({
      ...s,
      geometry: JSON.parse(s.geojson),
    })),
    areas: areasResult.rows.map(a => ({
      ...a,
      boundary: JSON.parse(a.geojson),
    })),
  });
});

/**
 * PUT /routes/:id — Update route metadata
 */
routesCrudRouter.put('/routes/:id', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.id);
  const creatorUid = req.user!.uid;
  const { title, description, countryCode, region, cities, durationDays, travelStyle, transportModes, budgetPerDayUsd, bestSeason, difficulty } = req.body;

  const { sets, values, idx: nextIdx } = buildUpdateSets({
    title, description,
    country_code: countryCode,
    region, cities,
    duration_days: durationDays,
    travel_style: travelStyle,
    transport_modes: transportModes,
    budget_per_day_usd: budgetPerDayUsd,
    best_season: bestSeason,
    difficulty,
  });

  if (sets.length === 0) {
    throw new AppError('No fields to update', 400, 'NO_FIELDS');
  }

  let idx = nextIdx;
  values.push(routeId, creatorUid);
  const result = await pool.query(
    `UPDATE mentor_routes SET ${sets.join(', ')} WHERE id = $${idx++} AND creator_uid = $${idx} AND status != 'published' RETURNING id, title, status`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Route not found or already published', 404, 'NOT_FOUND');
  }

  res.json(result.rows[0]);
});

/**
 * DELETE /routes/:id — Delete a draft route
 */
routesCrudRouter.delete('/routes/:id', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.id);
  const creatorUid = req.user!.uid;

  const result = await pool.query(
    `DELETE FROM mentor_routes WHERE id = $1 AND creator_uid = $2 AND status = 'draft' RETURNING id`,
    [routeId, creatorUid]
  );

  if (result.rows.length === 0) {
    throw new AppError('Route not found or cannot delete published route', 404, 'NOT_FOUND');
  }

  res.json({ success: true, deleted: routeId });
});
