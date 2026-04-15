import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import MapGL, {
  Source, Layer, Marker, Popup,
  NavigationControl, ScaleControl, type MapRef,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { greatCircle } from '@turf/turf';
import { Loader2, MapPin, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import type { Trip, TripDay, Place } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { TRANSPORT_COLORS } from '../../components/NetworkMap';

import {
  MAP_STYLE, CATEGORY_CONFIG,
  type EnrichedActivity,
} from './trip-map/constants';
import MapToolbar from './trip-map/MapToolbar';
import CategoryPanel from './trip-map/CategoryPanel';
import ActivityPopup from './trip-map/ActivityPopup';
import PlacePopup from './trip-map/PlacePopup';
import ContributePanel from './trip-map/ContributePanel';

// ──────────── Component ────────────

export default function TripMapPage() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id!, 10);
  const mapRef = useRef<MapRef>(null);

  // ── State ──
  const [showNetwork, setShowNetwork] = useState(false);
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(new Set());
  const [showControls, setShowControls] = useState(true);
  const [placePopup, setPlacePopup] = useState<Place | null>(null);
  const [activityPopup, setActivityPopup] = useState<EnrichedActivity | null>(null);

  // Popup enrichment
  const [popupDetails, setPopupDetails] = useState<Place | null>(null);
  const [popupNearby, setPopupNearby] = useState<Place[]>([]);
  const [popupLoading, setPopupLoading] = useState(false);
  const [showNearby, setShowNearby] = useState(true);

  // Contribution
  const { user } = useAuth();
  const [showContribute, setShowContribute] = useState(false);
  const [dropPinMode, setDropPinMode] = useState(false);
  const [droppedPin, setDroppedPin] = useState<{ lat: number; lng: number } | null>(null);
  const [contributeForm, setContributeForm] = useState({
    name: '', latitude: 0, longitude: 0, city: '',
    mainCategory: '', subCategory: '', description: '', website: '',
  });

  // ── Fetch trip ──
  const { data: tripData, isLoading: tripLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => api.getTrip(tripId),
    enabled: !!id,
  });

  const trip: Trip | undefined = tripData?.trip;
  const countryCode = trip?.countryCode || '';

  // ── Fetch transport network ──
  const { data: networkData, isLoading: networkLoading } = useQuery({
    queryKey: ['spatial-network', countryCode],
    queryFn: () => api.getSpatialNetwork(countryCode),
    enabled: showNetwork && !!countryCode,
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch categories ──
  const { data: categoryData } = useQuery({
    queryKey: ['place-categories', countryCode],
    queryFn: () => api.getPlaceCategories(countryCode),
    enabled: !!countryCode,
    staleTime: 10 * 60 * 1000,
  });

  // ── Fetch places per category ──
  const categoryKeys = useMemo(() => [...enabledCategories].sort(), [enabledCategories]);

  const placesQueries = useQueries({
    queries: categoryKeys.map((cat) => ({
      queryKey: ['places-map', countryCode, cat],
      queryFn: () => api.getPlaces({ country: countryCode, category: cat, limit: 200 }),
      enabled: !!countryCode,
      staleTime: 5 * 60 * 1000,
    })),
  });

  // ── Trip activities with coordinates ──
  const tripActivities = useMemo(() => {
    if (!trip?.days) return [];
    const acts: EnrichedActivity[] = [];
    trip.days.forEach((day: TripDay) => {
      if (day.activities) {
        day.activities
          .filter((a) => a.latitude && a.longitude)
          .forEach((a) => acts.push({ ...a, _dayNumber: day.dayNumber }));
      }
    });
    return acts;
  }, [trip]);

  // ── Trip route GeoJSON ──
  const tripRouteGeoJSON = useMemo(() => {
    if (tripActivities.length < 2) return null;
    const coordinates = tripActivities.map((a) => [a.longitude!, a.latitude!]);
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'LineString' as const, coordinates },
      }],
    };
  }, [tripActivities]);

  // ── Network arcs ──
  const networkArcs = useMemo(() => {
    if (!networkData?.edges) return { type: 'FeatureCollection' as const, features: [] };
    const arcs: GeoJSON.Feature[] = [];
    for (const f of networkData.edges.features) {
      const g = f.geometry;
      if (g.type !== 'LineString' || !g.coordinates || g.coordinates.length < 2) continue;
      const [start, end] = [g.coordinates[0], g.coordinates[g.coordinates.length - 1]];
      try {
        const arc = greatCircle(start as [number, number], end as [number, number], { npoints: 50 });
        arcs.push({ ...arc, properties: f.properties });
      } catch {
        arcs.push(f);
      }
    }
    return { type: 'FeatureCollection' as const, features: arcs };
  }, [networkData]);

  // ── Places GeoJSON ──
  const placesGeoJSON = useMemo(() => {
    const collections: Record<string, GeoJSON.FeatureCollection> = {};
    categoryKeys.forEach((cat, idx) => {
      const data = placesQueries[idx]?.data;
      if (!data?.places) {
        collections[cat] = { type: 'FeatureCollection', features: [] };
        return;
      }
      collections[cat] = {
        type: 'FeatureCollection',
        features: data.places.map((p) => ({
          type: 'Feature' as const,
          properties: { id: p.id, name: p.name, category: p.mainCategory, rating: p.rating, city: p.city },
          geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
        })),
      };
    });
    return collections;
  }, [categoryKeys, placesQueries]);

  // ── Available categories ──
  const availableCategories = useMemo(() => {
    if (!categoryData?.categories) return [];
    const seen = new Set<string>();
    const result: { key: string; count: number }[] = [];
    categoryData.categories.forEach((c) => {
      if (c.mainCategory && !seen.has(c.mainCategory)) {
        seen.add(c.mainCategory);
        result.push({ key: c.mainCategory, count: c.count });
      }
    });
    return result.sort((a, b) => b.count - a.count);
  }, [categoryData]);

  // ── Initial viewport ──
  const initialViewState = useMemo(() => {
    if (tripActivities.length === 0) return { longitude: 100.5, latitude: 13.75, zoom: 5 };
    const lats = tripActivities.map((a) => a.latitude!);
    const lngs = tripActivities.map((a) => a.longitude!);
    return {
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      zoom: tripActivities.length === 1 ? 12 : 6,
    };
  }, [tripActivities]);

  // Fit bounds on load
  useEffect(() => {
    if (tripActivities.length >= 2 && mapRef.current) {
      const lats = tripActivities.map((a) => a.latitude!);
      const lngs = tripActivities.map((a) => a.longitude!);
      mapRef.current.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 80, duration: 1000 }
      );
    }
  }, [tripActivities]);

  // ── Popup enrichment: place details + nearby ──
  useEffect(() => {
    if (!placePopup?.id) { setPopupDetails(null); setPopupNearby([]); return; }
    setPopupLoading(true);
    Promise.all([
      api.getPlace(placePopup.id),
      api.getPlaces({ lat: placePopup.latitude, lng: placePopup.longitude, radius: 2000, limit: 6 }),
    ])
      .then(([placeData, nearbyData]) => {
        setPopupDetails(placeData.place);
        setPopupNearby((nearbyData.places || []).filter((p) => p.id !== placePopup.id).slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setPopupLoading(false));
  }, [placePopup?.id]);

  // ── Popup enrichment: activity nearby ──
  useEffect(() => {
    if (!activityPopup?.latitude || !activityPopup?.longitude) { setPopupDetails(null); setPopupNearby([]); return; }
    setPopupLoading(true);
    api.getPlaces({ lat: activityPopup.latitude, lng: activityPopup.longitude, radius: 2000, limit: 8 })
      .then((data) => {
        const places = data.places || [];
        const actName = (activityPopup.placeName || activityPopup.name || '').toLowerCase();
        const match = places.find(
          (p) => p.name.toLowerCase().includes(actName.slice(0, 8)) || actName.includes(p.name.toLowerCase().slice(0, 8))
        );
        if (match) api.getPlace(match.id).then((d) => setPopupDetails(d.place)).catch(() => {});
        else setPopupDetails(null);
        setPopupNearby(places.filter((p) => p.id !== match?.id).slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setPopupLoading(false));
  }, [activityPopup?.id]);

  // ── Fly to nearby place ──
  const flyToPlace = useCallback((place: Place) => {
    setPopupDetails(null);
    setPopupNearby([]);
    mapRef.current?.flyTo({ center: [place.longitude, place.latitude], zoom: 14, duration: 800 });
    setPlacePopup(place);
    setActivityPopup(null);
  }, []);

  // ── Toggle category ──
  const toggleCategory = useCallback((cat: string) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }, []);

  // ── Map click ──
  const handleMapClick = useCallback((e: maplibregl.MapMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (dropPinMode) {
      const { lng, lat } = e.lngLat;
      setDroppedPin({ lat, lng });
      setContributeForm((f) => ({ ...f, latitude: Math.round(lat * 100000) / 100000, longitude: Math.round(lng * 100000) / 100000, name: f.name || '' }));
      setDropPinMode(false);
      return;
    }

    const placeLayerIds = categoryKeys.map((cat) => `places-${cat}`);
    const features = map.queryRenderedFeatures(e.point, { layers: placeLayerIds.filter((l) => map.getLayer(l)) });
    if (features.length > 0) {
      const f = features[0];
      const coords = (f.geometry as GeoJSON.Point).coordinates;
      setPlacePopup({
        id: f.properties?.id, name: f.properties?.name, mainCategory: f.properties?.category,
        rating: f.properties?.rating, city: f.properties?.city,
        longitude: coords[0], latitude: coords[1],
      } as Place);
      setActivityPopup(null);
    } else {
      setPlacePopup(null); setActivityPopup(null); setPopupDetails(null); setPopupNearby([]);
    }
  }, [categoryKeys, dropPinMode]);

  // ── Shared popup state ──
  const popupState = { popupDetails, popupNearby, popupLoading, showNearby, setShowNearby };

  // ── Loading / not found ──
  if (tripLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-surface">
        <p className="text-content-muted mb-2">Trip not found</p>
        <Link to="/trips" className="text-primary-500 text-sm">Back to trips</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ── Top bar ── */}
      <MapToolbar
        tripId={id!}
        tripName={trip.routeName || trip.name || 'Trip Map'}
        countryCode={countryCode}
        cities={trip.cities || []}
        activityCount={tripActivities.length}
        showNetwork={showNetwork}
        networkLoading={networkLoading}
        showControls={showControls}
        onToggleNetwork={() => setShowNetwork((v) => !v)}
        onToggleControls={() => setShowControls((v) => !v)}
      />

      {/* ── Main area ── */}
      <div className="flex-1 relative overflow-hidden">
        <MapGL
          ref={mapRef}
          initialViewState={initialViewState}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLE}
          onClick={handleMapClick}
          cursor={dropPinMode ? 'crosshair' : undefined}
          interactiveLayerIds={categoryKeys.map((c) => `places-${c}`)}
        >
          <NavigationControl position="bottom-right" />
          <ScaleControl position="bottom-left" />

          {/* ── Transport network ── */}
          {showNetwork && networkData && (
            <>
              <Source id="network-edges" type="geojson" data={networkArcs}>
                <Layer
                  id="network-edges-line"
                  type="line"
                  paint={{
                    'line-color': [
                      'match', ['get', 'transport_type'],
                      ...Object.entries(TRANSPORT_COLORS).flat(),
                      '#6b7280',
                    ] as unknown as string,
                    'line-width': 1.5,
                    'line-opacity': 0.4,
                  }}
                />
              </Source>
              <Source id="network-nodes" type="geojson" data={networkData.nodes}>
                <Layer
                  id="network-nodes-circle"
                  type="circle"
                  paint={{
                    'circle-radius': ['match', ['get', 'hierarchy'], 'international_hub', 7, 'regional_hub', 5, 'local_hub', 4, 3],
                    'circle-color': '#6366f1',
                    'circle-opacity': 0.5,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#818cf8',
                    'circle-stroke-opacity': 0.4,
                  }}
                />
                <Layer
                  id="network-nodes-label"
                  type="symbol"
                  layout={{ 'text-field': ['get', 'name'], 'text-size': 10, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-optional': true }}
                  paint={{ 'text-color': '#a5b4fc', 'text-halo-color': '#0f172a', 'text-halo-width': 1, 'text-opacity': 0.7 }}
                  minzoom={7}
                />
              </Source>
            </>
          )}

          {/* ── Place layers ── */}
          {categoryKeys.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const data = placesGeoJSON[cat];
            if (!data || data.features.length === 0) return null;
            return (
              <Source key={cat} id={`places-src-${cat}`} type="geojson" data={data}>
                <Layer
                  id={`places-${cat}`}
                  type="circle"
                  paint={{
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2, 8, 3.5, 12, 5],
                    'circle-color': cfg?.markerColor || '#9ca3af',
                    'circle-opacity': 0.7,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-opacity': 0.3,
                  }}
                />
                <Layer
                  id={`places-label-${cat}`}
                  type="symbol"
                  layout={{ 'text-field': ['get', 'name'], 'text-size': 9, 'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-optional': true }}
                  paint={{ 'text-color': cfg?.markerColor || '#9ca3af', 'text-halo-color': '#0f172a', 'text-halo-width': 1, 'text-opacity': 0.6 }}
                  minzoom={10}
                />
              </Source>
            );
          })}

          {/* ── Trip route ── */}
          {tripRouteGeoJSON && (
            <Source id="trip-route" type="geojson" data={tripRouteGeoJSON}>
              <Layer id="trip-route-line" type="line" paint={{ 'line-color': '#f97316', 'line-width': 3, 'line-opacity': 0.8, 'line-dasharray': [2, 2] }} />
            </Source>
          )}

          {/* ── Activity markers ── */}
          {tripActivities.map((act, idx) => (
            <Marker
              key={act.id}
              longitude={act.longitude!}
              latitude={act.latitude!}
              anchor="center"
              onClick={(e) => { e.originalEvent.stopPropagation(); setActivityPopup(act); setPlacePopup(null); }}
            >
              <div className="relative cursor-pointer group">
                <div className="w-7 h-7 rounded-full bg-primary-500 border-2 border-white shadow-lg flex items-center justify-center text-[11px] font-bold text-white group-hover:scale-110 transition-transform">
                  {idx + 1}
                </div>
              </div>
            </Marker>
          ))}

          {/* ── Activity popup ── */}
          {activityPopup && activityPopup.latitude && activityPopup.longitude && (
            <Popup
              longitude={activityPopup.longitude}
              latitude={activityPopup.latitude}
              anchor="bottom"
              onClose={() => { setActivityPopup(null); setPopupDetails(null); setPopupNearby([]); }}
              closeOnClick={false}
              maxWidth="340px"
              className="trip-map-popup"
            >
              <ActivityPopup activity={activityPopup} {...popupState} onFlyToPlace={flyToPlace} />
            </Popup>
          )}

          {/* ── Place popup ── */}
          {placePopup && (
            <Popup
              longitude={placePopup.longitude}
              latitude={placePopup.latitude}
              anchor="bottom"
              onClose={() => { setPlacePopup(null); setPopupDetails(null); setPopupNearby([]); }}
              closeOnClick={false}
              maxWidth="340px"
              className="trip-map-popup"
            >
              <PlacePopup place={placePopup} {...popupState} onFlyToPlace={flyToPlace} />
            </Popup>
          )}

          {/* ── Dropped pin marker ── */}
          {droppedPin && (
            <Marker longitude={droppedPin.lng} latitude={droppedPin.lat} anchor="bottom">
              <div className="flex flex-col items-center">
                <MapPin className="h-8 w-8 text-amber-400 drop-shadow-lg" fill="#fbbf24" />
              </div>
            </Marker>
          )}
        </MapGL>

        {/* ── Category toggles panel ── */}
        {showControls && (
          <CategoryPanel
            categories={availableCategories}
            enabledCategories={enabledCategories}
            categoryKeys={categoryKeys}
            placesQueries={placesQueries}
            onToggle={toggleCategory}
            onClearAll={() => setEnabledCategories(new Set())}
            onClose={() => setShowControls(false)}
          />
        )}

        {/* ── Legend ── */}
        <div className="absolute bottom-8 left-3 z-10 flex flex-col gap-2">
          <div className="bg-surface-card/90 backdrop-blur-sm border border-line rounded-lg px-3 py-2">
            <div className="flex items-center gap-3 text-[10px] text-content-muted">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-primary-500 border border-white inline-block" />
                Your trip stops
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-orange-500 inline-block" style={{ borderTop: '2px dashed #f97316' }} />
                Route
              </span>
              {showNetwork && (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-indigo-500/50 border border-indigo-400 inline-block" />
                  Network
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowContribute((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-lg ${
              showContribute
                ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30 border border-amber-500/20'
                : 'bg-surface-card/90 backdrop-blur-sm border border-line text-content-muted hover:text-amber-400 hover:bg-surface-hover'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Contribute a Gem
          </button>
        </div>

        {/* ── Contribute panel ── */}
        {showContribute && (
          <ContributePanel
            countryCode={countryCode}
            userId={user?.uid}
            mapRef={mapRef}
            dropPinMode={dropPinMode}
            contributeForm={contributeForm}
            onDropPinModeToggle={() => setDropPinMode((v) => !v)}
            onFormChange={setContributeForm}
            onClose={() => { setShowContribute(false); setDropPinMode(false); setDroppedPin(null); }}
            onSuccess={() => {
              setShowContribute(false);
              setDroppedPin(null);
              setContributeForm({ name: '', latitude: 0, longitude: 0, city: '', mainCategory: '', subCategory: '', description: '', website: '' });
            }}
            onNominatimPick={(lat, lng, name, city) => {
              setContributeForm({ ...contributeForm, name, latitude: lat, longitude: lng, city });
              setDroppedPin({ lat, lng });
            }}
          />
        )}
      </div>
    </div>
  );
}
