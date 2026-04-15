import { Router } from 'express';
import { pool, AppError } from './helpers.js';
import type { Request, Response } from 'express';

export const geojsonRouter = Router();

/**
 * GET /routes/:id/geojson — Full GeoJSON FeatureCollection export
 */
geojsonRouter.get('/routes/:id/geojson', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.id);
  const creatorUid = req.user!.uid;

  // Verify access (own route or published)
  const routeResult = await pool.query(
    `SELECT id, title, description, country_code, travel_style, difficulty, status,
            ST_AsGeoJSON(route_geometry) as route_geojson
     FROM mentor_routes WHERE id = $1 AND (creator_uid = $2 OR status = 'published')`,
    [routeId, creatorUid]
  );
  if (routeResult.rows.length === 0) {
    throw new AppError('Route not found', 404, 'NOT_FOUND');
  }
  const route = routeResult.rows[0];

  const features: any[] = [];

  // Route geometry as a feature
  if (route.route_geojson) {
    features.push({
      type: 'Feature',
      properties: { type: 'route', title: route.title, travel_style: route.travel_style },
      geometry: JSON.parse(route.route_geojson),
    });
  }

  // Segments
  const segs = await pool.query(
    `SELECT transport_mode, distance_km, duration_minutes, tips, ST_AsGeoJSON(geometry) as geojson
     FROM mentor_segments WHERE mentor_route_id = $1 ORDER BY sequence_order`, [routeId]
  );
  for (const s of segs.rows) {
    features.push({
      type: 'Feature',
      properties: { type: 'segment', transport_mode: s.transport_mode, distance_km: s.distance_km, duration_minutes: s.duration_minutes, tips: s.tips },
      geometry: JSON.parse(s.geojson),
    });
  }

  // Pins
  const pins = await pool.query(
    `SELECT category, title, notes, tips, cost_usd, duration_minutes, time_of_day, day_number,
            ST_AsGeoJSON(location) as geojson
     FROM mentor_pins WHERE mentor_route_id = $1 ORDER BY sequence_order`, [routeId]
  );
  for (const p of pins.rows) {
    features.push({
      type: 'Feature',
      properties: { type: 'pin', category: p.category, title: p.title, notes: p.notes, tips: p.tips, cost_usd: p.cost_usd, duration_minutes: p.duration_minutes, time_of_day: p.time_of_day, day_number: p.day_number },
      geometry: JSON.parse(p.geojson),
    });
  }

  // Areas
  const areas = await pool.query(
    `SELECT label, notes, category, color, opacity, ST_AsGeoJSON(boundary) as geojson
     FROM mentor_areas WHERE mentor_route_id = $1`, [routeId]
  );
  for (const a of areas.rows) {
    features.push({
      type: 'Feature',
      properties: { type: 'area', label: a.label, notes: a.notes, category: a.category, color: a.color, opacity: a.opacity },
      geometry: JSON.parse(a.geojson),
    });
  }

  res.json({
    type: 'FeatureCollection',
    properties: { title: route.title, description: route.description, country_code: route.country_code, difficulty: route.difficulty, status: route.status },
    features,
  });
});
