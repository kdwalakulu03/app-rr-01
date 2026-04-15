import { Router } from 'express';
import { pool, AppError, verifyOwnership } from './helpers.js';
import type { Request, Response } from 'express';

export const segmentsCrudRouter = Router();

/**
 * POST /routes/:id/segments — Save a road-snapped segment
 */
segmentsCrudRouter.post('/routes/:id/segments', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.id);
  const creatorUid = req.user!.uid;
  const { fromPinId, toPinId, geometry, transportMode, distanceKm, durationMinutes, costUsd, tips } = req.body;

  if (!geometry || !geometry.coordinates || geometry.type !== 'LineString') {
    throw new AppError('geometry must be a GeoJSON LineString', 400, 'INVALID_INPUT');
  }

  await verifyOwnership(routeId, creatorUid);

  const seqResult = await pool.query(
    'SELECT COALESCE(MAX(sequence_order), 0) + 1 as next_seq FROM mentor_segments WHERE mentor_route_id = $1',
    [routeId]
  );

  const result = await pool.query(
    `INSERT INTO mentor_segments (mentor_route_id, from_pin_id, to_pin_id, geometry, transport_mode, distance_km, duration_minutes, cost_usd, tips, sequence_order)
     VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), $5, $6, $7, $8, $9, $10)
     RETURNING id, transport_mode, distance_km, duration_minutes, sequence_order`,
    [routeId, fromPinId || null, toPinId || null, JSON.stringify(geometry), transportMode || 'driving', distanceKm || null, durationMinutes || null, costUsd || null, tips || null, seqResult.rows[0].next_seq]
  );

  res.status(201).json(result.rows[0]);
});

/**
 * DELETE /routes/:routeId/segments/:segmentId
 */
segmentsCrudRouter.delete('/routes/:routeId/segments/:segmentId', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.routeId);
  const segmentId = parseInt(req.params.segmentId);
  const creatorUid = req.user!.uid;

  await verifyOwnership(routeId, creatorUid);

  await pool.query(
    'DELETE FROM mentor_segments WHERE id = $1 AND mentor_route_id = $2',
    [segmentId, routeId]
  );

  res.json({ success: true });
});
