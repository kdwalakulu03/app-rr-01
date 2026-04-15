import { Router } from 'express';
import { pool, AppError } from './helpers.js';
import type { Request, Response } from 'express';

export const publicRouter = Router();

/**
 * GET / — Browse published mentor routes (no auth)
 */
publicRouter.get('/', async (req: Request, res: Response) => {
  const { country, limit = '20', offset = '0', sort = 'recent' } = req.query;

  let query = `SELECT mr.id, mr.title, mr.description, mr.country_code, mr.region, mr.cities,
                      mr.duration_days, mr.travel_style, mr.transport_modes, mr.budget_per_day_usd,
                      mr.difficulty, mr.view_count, mr.save_count, mr.fork_count,
                      mr.published_at,
                      u.display_name as creator_name, u.avatar_url as creator_avatar,
                      (SELECT COUNT(*) FROM mentor_pins WHERE mentor_route_id = mr.id) as pin_count
               FROM mentor_routes mr
               LEFT JOIN users u ON u.firebase_uid = mr.creator_uid
               WHERE mr.status = 'published'`;
  const params: unknown[] = [];
  let idx = 1;

  if (country) {
    query += ` AND mr.country_code = $${idx++}`;
    params.push(country);
  }

  const orderBy = sort === 'popular' ? 'mr.view_count DESC' : 'mr.published_at DESC';
  query += ` ORDER BY ${orderBy} LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(parseInt(limit as string) || 20, parseInt(offset as string) || 0);

  const result = await pool.query(query, params);
  res.json({ routes: result.rows });
});

/**
 * GET /:id — View a single published route with full data (no auth)
 */
publicRouter.get('/:id', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.id);

  // Increment view count
  await pool.query('UPDATE mentor_routes SET view_count = view_count + 1 WHERE id = $1 AND status = $2', [routeId, 'published']);

  const routeResult = await pool.query(
    `SELECT mr.id, mr.title, mr.description, mr.country_code, mr.region, mr.cities,
            mr.duration_days, mr.travel_style, mr.transport_modes, mr.budget_per_day_usd,
            mr.difficulty, mr.view_count, mr.save_count, mr.fork_count,
            mr.published_at, mr.creator_uid,
            u.display_name as creator_name, u.avatar_url as creator_avatar,
            ST_AsGeoJSON(mr.route_geometry) as route_geojson,
            ST_AsGeoJSON(mr.bounds) as bounds_geojson
     FROM mentor_routes mr
     LEFT JOIN users u ON u.firebase_uid = mr.creator_uid
     WHERE mr.id = $1 AND mr.status = 'published'`,
    [routeId]
  );

  if (routeResult.rows.length === 0) {
    throw new AppError('Route not found', 404, 'NOT_FOUND');
  }

  const route = routeResult.rows[0];

  const [pinsRes, segsRes, areasRes] = await Promise.all([
    pool.query(
      `SELECT id, category, title, notes, tips, cost_usd, duration_minutes, time_of_day, day_number,
              ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
       FROM mentor_pins WHERE mentor_route_id = $1 ORDER BY sequence_order`, [routeId]
    ),
    pool.query(
      `SELECT id, transport_mode, distance_km, duration_minutes, ST_AsGeoJSON(geometry) as geojson
       FROM mentor_segments WHERE mentor_route_id = $1 ORDER BY sequence_order`, [routeId]
    ),
    pool.query(
      `SELECT id, label, notes, category, color, opacity, ST_AsGeoJSON(boundary) as geojson
       FROM mentor_areas WHERE mentor_route_id = $1`, [routeId]
    ),
  ]);

  res.json({
    route: {
      ...route,
      route_geometry: route.route_geojson ? JSON.parse(route.route_geojson) : null,
      bounds: route.bounds_geojson ? JSON.parse(route.bounds_geojson) : null,
    },
    pins: pinsRes.rows,
    segments: segsRes.rows.map((s: any) => ({ ...s, geometry: JSON.parse(s.geojson) })),
    areas: areasRes.rows.map((a: any) => ({ ...a, boundary: JSON.parse(a.geojson) })),
  });
});
