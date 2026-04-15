import { Router, Request, Response } from 'express';
import { pool } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

export const usersRouter = Router();

// ============================================
// GET /api/users/me — Get current user profile
// ============================================
usersRouter.get('/me', async (req: Request, res: Response) => {
  const firebaseUid = req.user!.uid;

  const result = await pool.query(
    `SELECT
       id, firebase_uid, email, display_name, avatar_url,
       active_role, traveler_meta, provider_meta, mentor_meta,
       ST_Y(last_location::geometry) AS last_lat,
       ST_X(last_location::geometry) AS last_lng,
       last_location_updated_at,
       trip_count, route_count, contribution_count,
       is_active, created_at, updated_at, last_login_at
     FROM users
     WHERE firebase_uid = $1`,
    [firebaseUid]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const user = result.rows[0];
  res.json({
    id: user.id,
    firebaseUid: user.firebase_uid,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    activeRole: user.active_role,
    travelerMeta: user.traveler_meta,
    providerMeta: user.provider_meta,
    mentorMeta: user.mentor_meta,
    lastLocation: user.last_lat != null ? { lat: user.last_lat, lng: user.last_lng } : null,
    lastLocationUpdatedAt: user.last_location_updated_at,
    tripCount: user.trip_count,
    routeCount: user.route_count,
    contributionCount: user.contribution_count,
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
  });
});

// ============================================
// PUT /api/users/profile — Update profile fields
// ============================================
usersRouter.put('/profile', async (req: Request, res: Response) => {
  const firebaseUid = req.user!.uid;
  const { displayName, avatarUrl, travelerMeta, providerMeta, mentorMeta } = req.body;

  // Build dynamic SET clause — only update provided fields
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (displayName !== undefined) {
    sets.push(`display_name = $${idx++}`);
    values.push(displayName);
  }
  if (avatarUrl !== undefined) {
    sets.push(`avatar_url = $${idx++}`);
    values.push(avatarUrl);
  }
  if (travelerMeta !== undefined) {
    sets.push(`traveler_meta = traveler_meta || $${idx++}::jsonb`);
    values.push(JSON.stringify(travelerMeta));
  }
  if (providerMeta !== undefined) {
    sets.push(`provider_meta = provider_meta || $${idx++}::jsonb`);
    values.push(JSON.stringify(providerMeta));
  }
  if (mentorMeta !== undefined) {
    sets.push(`mentor_meta = mentor_meta || $${idx++}::jsonb`);
    values.push(JSON.stringify(mentorMeta));
  }

  if (sets.length === 0) {
    throw new AppError('No fields to update', 400, 'NO_FIELDS');
  }

  values.push(firebaseUid);
  const result = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE firebase_uid = $${idx} RETURNING active_role`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.json({ success: true, activeRole: result.rows[0].active_role });
});

// ============================================
// PUT /api/users/switch-role — Change active role
// ============================================
usersRouter.put('/switch-role', async (req: Request, res: Response) => {
  const firebaseUid = req.user!.uid;
  const { role } = req.body;

  if (!role || !['traveler', 'provider', 'mentor'].includes(role)) {
    throw new AppError(
      'Invalid role. Must be one of: traveler, provider, mentor',
      400,
      'INVALID_ROLE'
    );
  }

  const result = await pool.query(
    `UPDATE users SET active_role = $1 WHERE firebase_uid = $2 RETURNING active_role`,
    [role, firebaseUid]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.json({ success: true, activeRole: result.rows[0].active_role });
});

// ============================================
// PUT /api/users/location — Update last known location
// ============================================
usersRouter.put('/location', async (req: Request, res: Response) => {
  const firebaseUid = req.user!.uid;
  const { lat, lng } = req.body;

  if (lat == null || lng == null || typeof lat !== 'number' || typeof lng !== 'number') {
    throw new AppError('lat and lng are required as numbers', 400, 'INVALID_LOCATION');
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError('lat must be [-90,90], lng must be [-180,180]', 400, 'OUT_OF_RANGE');
  }

  await pool.query(
    `UPDATE users
     SET last_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
         last_location_updated_at = NOW()
     WHERE firebase_uid = $3`,
    [lng, lat, firebaseUid]  // Note: MakePoint takes (lng, lat)
  );

  res.json({ success: true });
});
