import { Router } from 'express';
import { pool, AppError, verifyOwnership, buildUpdateSets } from './helpers.js';
import type { Request, Response } from 'express';

export const pinsCrudRouter = Router();

/**
 * POST /routes/:id/pins — Add a pin
 */
pinsCrudRouter.post('/routes/:id/pins', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.id);
  const creatorUid = req.user!.uid;
  const { lat, lng, category, title, notes, tips, photos, costUsd, durationMinutes, timeOfDay, dayNumber } = req.body;

  if (lat == null || lng == null) {
    throw new AppError('lat and lng are required', 400, 'INVALID_INPUT');
  }

  await verifyOwnership(routeId, creatorUid);

  const seqResult = await pool.query(
    'SELECT COALESCE(MAX(sequence_order), 0) + 1 as next_seq FROM mentor_pins WHERE mentor_route_id = $1',
    [routeId]
  );

  const result = await pool.query(
    `INSERT INTO mentor_pins (mentor_route_id, location, category, title, notes, tips, photos, cost_usd, duration_minutes, time_of_day, day_number, sequence_order)
     VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id, category, title, sequence_order, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng`,
    [routeId, lng, lat, category || 'general', title || null, notes || null, tips || null, photos || '{}', costUsd || null, durationMinutes || null, timeOfDay || 'anytime', dayNumber || null, seqResult.rows[0].next_seq]
  );

  res.status(201).json(result.rows[0]);
});

/**
 * PUT /routes/:routeId/pins/:pinId — Update a pin
 */
pinsCrudRouter.put('/routes/:routeId/pins/:pinId', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.routeId);
  const pinId = parseInt(req.params.pinId);
  const creatorUid = req.user!.uid;
  const { lat, lng, category, title, notes, tips, photos, costUsd, durationMinutes, timeOfDay, dayNumber, sequenceOrder } = req.body;

  await verifyOwnership(routeId, creatorUid);

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  // Location needs special handling (PostGIS)
  if (lat != null && lng != null) {
    sets.push(`location = ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)`);
    values.push(lng, lat);
  }

  const { sets: fieldSets, values: fieldValues, idx: nextIdx } = buildUpdateSets({
    category, title, notes, tips, photos,
    cost_usd: costUsd,
    duration_minutes: durationMinutes,
    time_of_day: timeOfDay,
    day_number: dayNumber,
    sequence_order: sequenceOrder,
  }, idx);

  sets.push(...fieldSets);
  values.push(...fieldValues);
  idx = nextIdx;

  if (sets.length === 0) {
    throw new AppError('No fields to update', 400, 'NO_FIELDS');
  }

  values.push(pinId, routeId);
  const result = await pool.query(
    `UPDATE mentor_pins SET ${sets.join(', ')} WHERE id = $${idx++} AND mentor_route_id = $${idx}
     RETURNING id, category, title, sequence_order, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Pin not found', 404, 'NOT_FOUND');
  }

  res.json(result.rows[0]);
});

/**
 * DELETE /routes/:routeId/pins/:pinId
 */
pinsCrudRouter.delete('/routes/:routeId/pins/:pinId', async (req: Request, res: Response) => {
  const routeId = parseInt(req.params.routeId);
  const pinId = parseInt(req.params.pinId);
  const creatorUid = req.user!.uid;

  await verifyOwnership(routeId, creatorUid);

  const result = await pool.query(
    'DELETE FROM mentor_pins WHERE id = $1 AND mentor_route_id = $2 RETURNING id',
    [pinId, routeId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Pin not found', 404, 'NOT_FOUND');
  }

  res.json({ success: true });
});
