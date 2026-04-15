import { Router } from 'express';
import { pool, AppError, verifyOwnership, buildUpdateSets } from './helpers.js';
import type { Request, Response } from 'express';

export const areasCrudRouter = Router();

/**
 * POST /routes/:routeId/areas — Add an area polygon
 */
areasCrudRouter.post('/routes/:routeId/areas', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.routeId);
  const creatorUid = req.user!.uid;

  await verifyOwnership(routeId, creatorUid);

  const { coordinates, label, notes, category, color, opacity } = req.body;
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
    throw new AppError('Area requires at least 3 coordinate points', 422, 'VALIDATION_FAILED');
  }

  // Close the ring if not already closed
  const ring = [...coordinates];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([...first]);
  }

  const polygon = {
    type: 'Polygon' as const,
    coordinates: [ring],
  };

  const result = await pool.query(
    `INSERT INTO mentor_areas (mentor_route_id, boundary, label, notes, category, color, opacity)
     VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3, $4, $5, $6, $7)
     RETURNING id, label, notes, category, color, opacity`,
    [routeId, JSON.stringify(polygon), label || null, notes || null, category || 'explored', color || '#10b981', opacity ?? 0.20]
  );

  res.status(201).json(result.rows[0]);
});

/**
 * PUT /routes/:routeId/areas/:areaId — Update area metadata
 */
areasCrudRouter.put('/routes/:routeId/areas/:areaId', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.routeId);
  const areaId = parseInt(req.params.areaId);
  const creatorUid = req.user!.uid;

  await verifyOwnership(routeId, creatorUid);

  const { label, notes, category, color, opacity } = req.body;

  const { sets, values, idx: nextIdx } = buildUpdateSets({
    label, notes, category, color, opacity,
  });

  if (sets.length === 0) {
    throw new AppError('No fields to update', 422, 'VALIDATION_FAILED');
  }

  let idx = nextIdx;
  values.push(areaId, routeId);
  const result = await pool.query(
    `UPDATE mentor_areas SET ${sets.join(', ')} WHERE id = $${idx++} AND mentor_route_id = $${idx}
     RETURNING id, label, notes, category, color, opacity`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Area not found', 404, 'NOT_FOUND');
  }

  res.json(result.rows[0]);
});

/**
 * DELETE /routes/:routeId/areas/:areaId
 */
areasCrudRouter.delete('/routes/:routeId/areas/:areaId', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.routeId);
  const areaId = parseInt(req.params.areaId);
  const creatorUid = req.user!.uid;

  await verifyOwnership(routeId, creatorUid);

  await pool.query(
    'DELETE FROM mentor_areas WHERE id = $1 AND mentor_route_id = $2',
    [areaId, routeId]
  );

  res.json({ success: true });
});
