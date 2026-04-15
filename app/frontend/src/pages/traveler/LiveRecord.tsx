// ─── LiveRecord — live trip recording with GPS tracking ───
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, {
  NavigationControl,
  GeolocateControl,
  ScaleControl,
  Source,
  Layer,
  Marker,
  type MapRef,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ArrowLeft, Save, MapPin } from 'lucide-react';

import { useCanvasApi, saveCanvas } from '../mentor/useCanvasApi';
import { getCategoryMeta } from '../mentor/canvas-constants';
import type { Pin, Segment, Area, RouteData } from '../mentor/canvas-types';
import { useGeolocation, type TrackPoint } from './live/useGeolocation';
import RecordingControls from './live/RecordingControls';
import RecordingPinDrop from './live/RecordingPinDrop';

const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/** Build GeoJSON LineString from track points */
function buildTrackGeoJSON(points: TrackPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.length >= 2
      ? [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: points.map(p => [p.lng, p.lat]),
          },
        }]
      : [],
  };
}

/** Build GeoJSON points for dropped pins */
function buildPinsGeoJSON(pins: Pin[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pins.map((pin, i) => ({
      type: 'Feature' as const,
      properties: { idx: i, category: pin.category, title: pin.title },
      geometry: { type: 'Point' as const, coordinates: [pin.lng, pin.lat] },
    })),
  };
}

export default function LiveRecord() {
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);
  const { apiRequest } = useCanvasApi();

  const [isDark] = useState(() => document.documentElement.getAttribute('data-theme') !== 'light');

  // GPS tracking
  const geo = useGeolocation();

  // Pin drops during recording
  const [droppedPins, setDroppedPins] = useState<Pin[]>([]);
  const [showPinPicker, setShowPinPicker] = useState(false);

  // Post-recording state
  const [routeTitle, setRouteTitle] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedRouteId, setSavedRouteId] = useState<number | null>(null);

  // Follow user position on map
  const [followUser, setFollowUser] = useState(true);

  // Center map on first position
  useEffect(() => {
    if (followUser && geo.currentPosition && mapRef.current) {
      mapRef.current.flyTo({
        center: [geo.currentPosition.lng, geo.currentPosition.lat],
        zoom: Math.max(mapRef.current.getZoom(), 15),
        duration: 800,
      });
    }
  }, [geo.currentPosition?.lat, geo.currentPosition?.lng, followUser]);

  // Disable auto-follow when user manually pans
  const handleMapMove = useCallback(() => {
    // Only disable if recording
    if (geo.state === 'recording') {
      setFollowUser(false);
    }
  }, [geo.state]);

  // Re-enable follow
  const reFollow = useCallback(() => {
    setFollowUser(true);
    if (geo.currentPosition && mapRef.current) {
      mapRef.current.flyTo({
        center: [geo.currentPosition.lng, geo.currentPosition.lat],
        zoom: 16,
        duration: 600,
      });
    }
  }, [geo.currentPosition]);

  // Drop pin at current position
  const handleDropPin = useCallback(() => {
    if (geo.currentPosition) {
      setShowPinPicker(true);
    }
  }, [geo.currentPosition]);

  const handlePinCategorySelect = useCallback((category: string) => {
    if (!geo.currentPosition) return;
    const newPin: Pin = {
      lat: geo.currentPosition.lat,
      lng: geo.currentPosition.lng,
      category,
      title: '',
      notes: '',
      tips: '',
      costUsd: '',
      durationMinutes: '',
      timeOfDay: '',
      dayNumber: '',
      sequenceOrder: droppedPins.length,
    };
    setDroppedPins(prev => [...prev, newPin]);
    setShowPinPicker(false);
  }, [geo.currentPosition, droppedPins.length]);

  // Build segment from track for save
  const trackSegment = useMemo((): Segment | null => {
    if (geo.trackPoints.length < 2) return null;
    return {
      fromPinIdx: 0,
      toPinIdx: 0,
      geometry: {
        type: 'LineString',
        coordinates: geo.trackPoints.map(p => [p.lng, p.lat]),
      },
      transportMode: 'walking',
      distanceKm: geo.distanceKm,
      durationMinutes: Math.round(geo.elapsedMs / 60000),
    };
  }, [geo.trackPoints, geo.distanceKm, geo.elapsedMs]);

  // Save recorded trip as mentor route draft
  const handleSave = useCallback(async () => {
    if (!trackSegment) return;
    setSaving(true);
    try {
      const routeData: RouteData = {
        title: routeTitle || `Trip — ${new Date().toLocaleDateString()}`,
        description: routeDescription,
        countryCode: '',
        travelStyle: 'backpacker',
        difficulty: 'easy',
      };

      const segments = [trackSegment];
      const areas: Area[] = [];
      let routeId: number | null = null;

      await saveCanvas(
        apiRequest,
        routeId,
        routeData,
        droppedPins,
        segments,
        areas,
        (id) => { routeId = id; setSavedRouteId(id); },
      );

      setSaved(true);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save — please try again.');
    } finally {
      setSaving(false);
    }
  }, [trackSegment, routeTitle, routeDescription, droppedPins, apiRequest]);

  // GeoJSON sources
  const trackGeoJSON = useMemo(() => buildTrackGeoJSON(geo.trackPoints), [geo.trackPoints]);
  const pinsGeoJSON = useMemo(() => buildPinsGeoJSON(droppedPins), [droppedPins]);

  const isStopped = geo.state === 'stopped';
  const hasTrack = geo.trackPoints.length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface-card/90 backdrop-blur-md rounded-xl shadow-lg border border-line text-content-body hover:bg-surface-hover transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          {/* Re-center button when not following */}
          {!followUser && geo.state === 'recording' && (
            <button
              onClick={reFollow}
              className="px-3 py-2.5 bg-primary-600 text-white rounded-xl shadow-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Re-center
            </button>
          )}
          {geo.state === 'recording' && (
            <div className="flex items-center gap-1.5 px-3 py-2.5 bg-red-600/90 backdrop-blur-md rounded-xl shadow-lg text-white text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              REC
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: 7.8731,
          longitude: 80.7718,
          zoom: 7,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={isDark ? DARK_STYLE : LIGHT_STYLE}
        onDragStart={handleMapMove}
        attributionControl={false}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-left" />
        <GeolocateControl
          position="top-right"
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={false}
        />

        {/* Recorded track line */}
        <Source id="track-line" type="geojson" data={trackGeoJSON}>
          <Layer
            id="track-line-bg"
            type="line"
            paint={{
              'line-color': '#10b981',
              'line-width': 6,
              'line-opacity': 0.3,
            }}
          />
          <Layer
            id="track-line-fg"
            type="line"
            paint={{
              'line-color': '#10b981',
              'line-width': 3,
              'line-opacity': 0.9,
            }}
          />
        </Source>

        {/* Dropped pins */}
        <Source id="dropped-pins" type="geojson" data={pinsGeoJSON}>
          <Layer
            id="dropped-pins-circle"
            type="circle"
            paint={{
              'circle-radius': 8,
              'circle-color': '#3b82f6',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
          />
        </Source>

        {/* Pin markers with icons */}
        {droppedPins.map((pin, i) => {
          const meta = getCategoryMeta(pin.category);
          return (
            <Marker key={i} latitude={pin.lat} longitude={pin.lng} anchor="center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white"
                style={{ backgroundColor: meta.color }}
              >
                <MapPin className="w-4 h-4 text-white" />
              </div>
            </Marker>
          );
        })}

        {/* Current position marker */}
        {geo.currentPosition && (
          <Marker latitude={geo.currentPosition.lat} longitude={geo.currentPosition.lng} anchor="center">
            <div className="relative">
              <div className="w-5 h-5 rounded-full bg-blue-500 border-3 border-white shadow-lg" />
              {geo.state === 'recording' && (
                <div className="absolute inset-0 w-5 h-5 rounded-full bg-blue-500 animate-ping opacity-40" />
              )}
            </div>
          </Marker>
        )}
      </Map>

      {/* Recording controls */}
      {!isStopped && (
        <RecordingControls
          state={geo.state}
          elapsedMs={geo.elapsedMs}
          distanceKm={geo.distanceKm}
          speed={geo.currentPosition?.speed ?? null}
          accuracy={geo.currentPosition?.accuracy ?? null}
          trackPointCount={geo.trackPoints.length}
          onStart={geo.start}
          onPause={geo.pause}
          onResume={geo.resume}
          onStop={geo.stop}
          onDropPin={handleDropPin}
        />
      )}

      {/* Pin category picker overlay */}
      {showPinPicker && (
        <RecordingPinDrop
          onSelect={handlePinCategorySelect}
          onClose={() => setShowPinPicker(false)}
        />
      )}

      {/* Post-recording save panel */}
      {isStopped && !saved && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-surface-card/95 backdrop-blur-md border-t border-line p-6 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-lg mx-auto space-y-4">
            <h2 className="text-lg font-semibold text-content-heading">Trip Recorded!</h2>

            {hasTrack && (
              <div className="flex items-center gap-4 text-sm text-content-body">
                <span>{geo.distanceKm.toFixed(1)} km</span>
                <span>{Math.round(geo.elapsedMs / 60000)} min</span>
                <span>{geo.trackPoints.length} points</span>
                {droppedPins.length > 0 && <span>{droppedPins.length} pins</span>}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">Route Title</label>
              <input
                type="text"
                value={routeTitle}
                onChange={e => setRouteTitle(e.target.value)}
                placeholder={`Trip — ${new Date().toLocaleDateString()}`}
                className="w-full px-4 py-2.5 bg-surface border border-line rounded-xl text-content-body focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">Description (optional)</label>
              <textarea
                value={routeDescription}
                onChange={e => setRouteDescription(e.target.value)}
                rows={2}
                placeholder="What was this trip about?"
                className="w-full px-4 py-2.5 bg-surface border border-line rounded-xl text-content-body focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !hasTrack}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 text-white font-semibold rounded-xl transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save as Route Draft'}
              </button>
              <button
                onClick={() => navigate('/trips')}
                className="px-6 py-3 bg-surface-hover text-content-body font-medium rounded-xl hover:bg-surface-card transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved confirmation */}
      {saved && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-surface-card/95 backdrop-blur-md border-t border-line p-6 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-lg mx-auto space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Save className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-lg font-semibold text-content-heading">Route Saved!</h2>
            <p className="text-sm text-content-muted">
              Your trip has been saved as a draft route. You can edit it further in the Mentor Canvas.
            </p>
            <div className="flex items-center gap-3 justify-center">
              {savedRouteId && (
                <button
                  onClick={() => navigate(`/mentor/canvas/${savedRouteId}`)}
                  className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Edit in Canvas
                </button>
              )}
              <button
                onClick={() => navigate('/mentor')}
                className="px-6 py-3 bg-surface-hover text-content-body font-medium rounded-xl hover:bg-surface-card transition-colors"
              >
                My Routes
              </button>
              <button
                onClick={() => navigate('/trips')}
                className="px-6 py-3 bg-surface-hover text-content-body font-medium rounded-xl hover:bg-surface-card transition-colors"
              >
                Back to Trips
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {geo.error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-5 py-3 bg-red-600 text-white rounded-xl shadow-lg text-sm max-w-sm text-center">
          {geo.error}
        </div>
      )}
    </div>
  );
}
