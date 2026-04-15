import { Router } from 'express';
import { AppError, decodePolyline } from './helpers.js';
import type { Request, Response } from 'express';

export const snapRouter = Router();

const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

interface OSRMResponse {
  code: string;
  routes: Array<{
    geometry: string;
    distance: number;
    duration: number;
    legs: Array<{ distance: number; duration: number }>;
  }>;
}

/**
 * POST /snap-route
 * Body: { coordinates: [[lng,lat], ...], profile?: "driving"|"walking"|"cycling" }
 */
snapRouter.post('/snap-route', async (req: Request, res: Response) => {
  const { coordinates, profile = 'driving' } = req.body;

  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
    throw new AppError('Need at least 2 coordinates as [[lng,lat], ...]', 400, 'INVALID_INPUT');
  }

  if (coordinates.length > 25) {
    throw new AppError('Maximum 25 waypoints per snap request', 400, 'TOO_MANY_WAYPOINTS');
  }

  const validProfiles = ['driving', 'walking', 'cycling'];
  const osrmProfile = validProfiles.includes(profile) ? profile : 'driving';

  const coordStr = coordinates.map(([lng, lat]: [number, number]) => `${lng},${lat}`).join(';');
  const osrmUrl = `${OSRM_BASE}/${osrmProfile}/${coordStr}?overview=full&geometries=polyline&steps=false`;

  try {
    const response = await fetch(osrmUrl);
    if (!response.ok) {
      throw new Error(`OSRM returned ${response.status}`);
    }

    const data = (await response.json()) as OSRMResponse;

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new AppError('OSRM could not find a route between these points', 422, 'NO_ROUTE');
    }

    const route = data.routes[0];
    const decodedCoords = decodePolyline(route.geometry);

    res.json({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: decodedCoords,
      },
      properties: {
        distance_km: Math.round(route.distance / 10) / 100,
        duration_minutes: Math.round(route.duration / 60),
        profile: osrmProfile,
        source: 'osrm',
      },
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error('OSRM request failed:', err);
    throw new AppError('Road-snapping service unavailable. Try again.', 503, 'SNAP_FAILED');
  }
});
