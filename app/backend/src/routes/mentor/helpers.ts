import { Request, Response } from 'express';
import { pool } from '../../db/index.js';
import { AppError } from '../../middleware/errorHandler.js';

export { pool, AppError };
export type { Request, Response };

/**
 * Verify that the authenticated user owns the given route.
 * Throws 404 if not found.
 */
export async function verifyOwnership(routeId: number, creatorUid: string): Promise<void> {
  const result = await pool.query(
    'SELECT id FROM mentor_routes WHERE id = $1 AND creator_uid = $2',
    [routeId, creatorUid]
  );
  if (result.rows.length === 0) {
    throw new AppError('Route not found', 404, 'NOT_FOUND');
  }
}

/**
 * Dynamic field builder for UPDATE queries.
 * Returns { sets, values, idx } — append your WHERE params after.
 */
export function buildUpdateSets(
  fields: Record<string, unknown>,
  startIdx = 1
): { sets: string[]; values: unknown[]; idx: number } {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = startIdx;
  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) {
      sets.push(`${col} = $${idx++}`);
      values.push(val);
    }
  }
  return { sets, values, idx };
}

/**
 * Decode Google/OSRM polyline encoding into [lng, lat][] coordinates.
 * Precision 5 (OSRM default) or 6 (optional).
 */
export function decodePolyline(encoded: string, precision = 5): [number, number][] {
  const factor = Math.pow(10, precision);
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    coords.push([lng / factor, lat / factor]); // GeoJSON is [lng, lat]
  }
  return coords;
}
