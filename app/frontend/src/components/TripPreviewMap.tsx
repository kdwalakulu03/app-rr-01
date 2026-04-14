import { useMemo, useRef, useEffect } from 'react';
import Map, { Source, Layer, Marker, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { TripDay, TripActivity } from '../lib/api';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface TripPreviewMapProps {
  days: TripDay[];
  className?: string;
}

/**
 * Lightweight map preview showing trip activity markers & route line.
 * No network data, no interactions beyond pan/zoom — just a visual teaser.
 */
export default function TripPreviewMap({ days, className = '' }: TripPreviewMapProps) {
  const mapRef = useRef<MapRef>(null);

  // ── Collect activities with coordinates ──
  const activities = useMemo(() => {
    const acts: (TripActivity & { _day: number })[] = [];
    days.forEach((day) => {
      day.activities
        ?.filter((a) => a.latitude && a.longitude)
        .forEach((a) => acts.push({ ...a, _day: day.dayNumber }));
    });
    return acts;
  }, [days]);

  // ── Route line ──
  const routeGeoJSON = useMemo(() => {
    if (activities.length < 2) return null;
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: activities.map((a) => [a.longitude!, a.latitude!]),
        },
      }],
    };
  }, [activities]);

  // ── Viewport ──
  const initialViewState = useMemo(() => {
    if (activities.length === 0) return { longitude: 100.5, latitude: 13.75, zoom: 5 };
    const lats = activities.map((a) => a.latitude!);
    const lngs = activities.map((a) => a.longitude!);
    return {
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      zoom: activities.length === 1 ? 11 : 5,
    };
  }, [activities]);

  useEffect(() => {
    if (activities.length >= 2 && mapRef.current) {
      const lats = activities.map((a) => a.latitude!);
      const lngs = activities.map((a) => a.longitude!);
      setTimeout(() => {
        mapRef.current?.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 40, duration: 800 }
        );
      }, 200);
    }
  }, [activities]);

  if (activities.length === 0) return null;

  return (
    <div className={`rounded-xl overflow-hidden ${className}`}>
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        interactive={false}
        attributionControl={false}
      >
        {/* Route line */}
        {routeGeoJSON && (
          <Source id="preview-route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="preview-route-glow"
              type="line"
              paint={{
                'line-color': '#f97316',
                'line-width': 6,
                'line-opacity': 0.15,
                'line-blur': 4,
              }}
            />
            <Layer
              id="preview-route-line"
              type="line"
              paint={{
                'line-color': '#f97316',
                'line-width': 2.5,
                'line-opacity': 0.9,
                'line-dasharray': [2, 1.5],
              }}
            />
          </Source>
        )}

        {/* Activity markers */}
        {activities.map((act, idx) => (
          <Marker
            key={act.id}
            longitude={act.longitude!}
            latitude={act.latitude!}
            anchor="center"
          >
            <div className="w-5 h-5 rounded-full bg-primary-500 border-[1.5px] border-white shadow-md flex items-center justify-center text-[9px] font-bold text-white">
              {idx + 1}
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
