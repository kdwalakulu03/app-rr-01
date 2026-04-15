import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/index.js';

/**
 * Middleware: ensureUser
 *
 * Must run AFTER authMiddleware. On every authenticated request,
 * upserts the user into the `users` table if they don't exist yet.
 * Sets req.user.dbId (our internal user id) for downstream use.
 *
 * Uses INSERT ... ON CONFLICT DO UPDATE to:
 *   - Create user on first-ever API call
 *   - Update last_login_at on subsequent calls
 *   - Sync email from Firebase token (in case it changed)
 */

export async function ensureUser(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.uid) {
      return next(); // No auth — skip (shouldn't happen if placed after authMiddleware)
    }

    const result = await pool.query(
      `INSERT INTO users (firebase_uid, email, display_name, last_login_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (firebase_uid) DO UPDATE SET
         email = COALESCE(EXCLUDED.email, users.email),
         last_login_at = NOW()
       RETURNING id, active_role`,
      [req.user.uid, req.user.email || null, req.user.email?.split('@')[0] || null]
    );

    if (result.rows.length > 0) {
      req.user.dbId = result.rows[0].id;
      req.user.activeRole = result.rows[0].active_role;
    }

    next();
  } catch (error) {
    // Don't block the request if user upsert fails — log and continue
    console.error('⚠️ ensureUser failed (non-blocking):', error);
    next();
  }
}
