// ─── API hook for MentorCanvas ────────────────────
import { useCallback } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { API_URL } from './canvas-constants';
import type { Pin, Segment, Area, RouteData } from './canvas-types';

/** Low-level authenticated fetch wrapper */
export function useCanvasApi() {
  const { user } = useAuth();

  const getToken = useCallback(async () => {
    if (!user) return '';
    return (user as any).getIdToken?.() || '';
  }, [user]);

  const apiRequest = useCallback(async (path: string, options: RequestInit = {}) => {
    const token = await getToken();
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options.headers as Record<string, string>) || {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `API error ${res.status}`);
    }
    return res.json();
  }, [getToken]);

  return { apiRequest, user };
}

/** Save all unsaved entities to the server */
export async function saveCanvas(
  apiRequest: ReturnType<typeof useCanvasApi>['apiRequest'],
  routeId: number | null,
  routeData: RouteData,
  pins: Pin[],
  segments: Segment[],
  areas: Area[],
  setRouteId: (id: number) => void,
) {
  // Ensure route exists
  let rId = routeId;
  if (!rId) {
    const data = await apiRequest('/api/mentor/routes', {
      method: 'POST',
      body: JSON.stringify({
        title: routeData.title || 'Untitled Route',
        description: routeData.description,
        countryCode: routeData.countryCode,
        travelStyle: routeData.travelStyle,
        difficulty: routeData.difficulty,
      }),
    });
    rId = data.id;
    setRouteId(data.id);
  }

  // Save pins
  for (const pin of pins) {
    if (!pin.id) {
      const result = await apiRequest(`/api/mentor/routes/${rId}/pins`, {
        method: 'POST',
        body: JSON.stringify({
          lat: pin.lat, lng: pin.lng,
          category: pin.category,
          title: pin.title || null,
          notes: pin.notes || null,
          tips: pin.tips || null,
          costUsd: pin.costUsd ? parseFloat(pin.costUsd) : null,
          durationMinutes: pin.durationMinutes ? parseInt(pin.durationMinutes) : null,
          timeOfDay: pin.timeOfDay,
          dayNumber: pin.dayNumber ? parseInt(pin.dayNumber) : null,
        }),
      });
      pin.id = result.id;
    }
  }

  // Save segments
  for (const seg of segments) {
    if (!seg.id) {
      const result = await apiRequest(`/api/mentor/routes/${rId}/segments`, {
        method: 'POST',
        body: JSON.stringify({
          geometry: seg.geometry,
          transportMode: seg.transportMode,
          distanceKm: seg.distanceKm,
          durationMinutes: seg.durationMinutes,
        }),
      });
      seg.id = result.id;
    }
  }

  // Save areas
  for (const area of areas) {
    if (!area.id) {
      const result = await apiRequest(`/api/mentor/routes/${rId}/areas`, {
        method: 'POST',
        body: JSON.stringify({
          coordinates: area.coordinates,
          label: area.label || null,
          notes: area.notes || null,
          category: area.category,
          color: area.color,
          opacity: area.opacity,
        }),
      });
      area.id = result.id;
    }
  }

  // Update route metadata
  await apiRequest(`/api/mentor/routes/${rId}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: routeData.title || 'Untitled Route',
      description: routeData.description,
      countryCode: routeData.countryCode,
      travelStyle: routeData.travelStyle,
      difficulty: routeData.difficulty,
    }),
  });
}

/** Build GeoJSON from segments array */
export function buildSegmentsGeoJSON(segments: Segment[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: segments.map((seg, i) => ({
      type: 'Feature' as const,
      properties: { id: i, mode: seg.transportMode, distanceKm: seg.distanceKm },
      geometry: seg.geometry,
    })),
  };
}

/** Build GeoJSON from route draw preview points */
export function buildDrawPreviewGeoJSON(points: [number, number][]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.length >= 2 ? [{
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: points },
    }] : [],
  };
}

/** Build GeoJSON from saved areas */
export function buildAreasGeoJSON(areas: Area[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: areas.map((area, i) => {
      const ring = [...area.coordinates];
      if (ring.length >= 3) {
        const first = ring[0]; const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
      }
      return {
        type: 'Feature' as const,
        properties: { idx: i, id: i, label: area.label, category: area.category, color: area.color, opacity: area.opacity },
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
      };
    }),
  };
}

/** Build GeoJSON for area-draw-in-progress polygon */
export function buildAreaDrawPreviewGeoJSON(points: [number, number][]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.length >= 2 ? [{
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[...points, points[0]]],
      },
    }] : [],
  };
}
