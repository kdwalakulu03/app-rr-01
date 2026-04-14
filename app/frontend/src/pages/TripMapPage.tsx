import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import MapGL, {
  Source,
  Layer,
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  type MapRef,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { greatCircle } from '@turf/turf';
import {
  ArrowLeft,
  Loader2,
  Layers,
  MapPin,
  Eye,
  EyeOff,
  Network,
  Utensils,
  Camera,
  Palette,
  Mountain,
  ShoppingBag,
  Moon,
  Heart,
  Zap,
  X,
  Bed,
  ExternalLink,
  Search,
  Crosshair,
  Sparkles,
  Send,
  Globe,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Trip, TripDay, TripActivity, Place } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';
import { TRANSPORT_COLORS } from '../components/NetworkMap';

// ──────────── Constants ────────────

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; markerColor: string; label: string }> = {
  food_drink:     { icon: <Utensils className="h-3.5 w-3.5" />, color: 'text-orange-400', markerColor: '#fb923c', label: 'Food & Drink' },
  attractions:    { icon: <Camera  className="h-3.5 w-3.5" />, color: 'text-blue-400',   markerColor: '#60a5fa', label: 'Attractions' },
  culture:        { icon: <Palette className="h-3.5 w-3.5" />, color: 'text-purple-400', markerColor: '#c084fc', label: 'Culture' },
  nature:         { icon: <Mountain className="h-3.5 w-3.5" />,color: 'text-green-400',  markerColor: '#4ade80', label: 'Nature' },
  activities:     { icon: <Zap     className="h-3.5 w-3.5" />, color: 'text-yellow-400', markerColor: '#facc15', label: 'Activities' },
  wellness:       { icon: <Heart   className="h-3.5 w-3.5" />, color: 'text-pink-400',   markerColor: '#f472b6', label: 'Wellness' },
  shopping:       { icon: <ShoppingBag className="h-3.5 w-3.5" />, color: 'text-cyan-400', markerColor: '#22d3ee', label: 'Shopping' },
  nightlife:      { icon: <Moon    className="h-3.5 w-3.5" />, color: 'text-indigo-400', markerColor: '#818cf8', label: 'Nightlife' },
  accommodation:  { icon: <Bed     className="h-3.5 w-3.5" />, color: 'text-teal-400',   markerColor: '#2dd4bf', label: 'Accommodation' },
};

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    city?: string; town?: string; village?: string; state?: string; country?: string;
  };
}

const PRICE_LABELS = ['', '$', '$$', '$$$', '$$$$'];

const CONTRIBUTE_CATEGORIES = [
  'food_drink', 'attractions', 'culture', 'nature', 'activities',
  'wellness', 'shopping', 'nightlife', 'accommodation',
];

// ──────────── Utility ────────────

function getCountryFlag(code: string): string {
  const codePoints = code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

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
  const [activityPopup, setActivityPopup] = useState<(TripActivity & { _dayNumber: number }) | null>(null);

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
  const [contributeSearch, setContributeSearch] = useState('');
  const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([]);
  const [searchingNominatim, setSearchingNominatim] = useState(false);
  const [contributeForm, setContributeForm] = useState({
    name: '', latitude: 0, longitude: 0, city: '',
    mainCategory: '', subCategory: '', description: '', website: '',
  });
  const [contributeSaving, setContributeSaving] = useState(false);
  const [contributeSuccess, setContributeSuccess] = useState(false);
  const nominatimTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Fetch trip ──
  const { data: tripData, isLoading: tripLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => api.getTrip(tripId),
    enabled: !!id,
  });

  const trip: Trip | undefined = tripData?.trip;
  const countryCode = trip?.countryCode || '';

  // ── Fetch transport network (only when toggled on) ──
  const { data: networkData, isLoading: networkLoading } = useQuery({
    queryKey: ['spatial-network', countryCode],
    queryFn: () => api.getSpatialNetwork(countryCode),
    enabled: showNetwork && !!countryCode,
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch categories available for this country ──
  const { data: categoryData } = useQuery({
    queryKey: ['place-categories', countryCode],
    queryFn: () => api.getPlaceCategories(countryCode),
    enabled: !!countryCode,
    staleTime: 10 * 60 * 1000,
  });

  // ── Fetch places for each toggled category ──
  const categoryKeys = useMemo(() => [...enabledCategories].sort(), [enabledCategories]);

  // useQueries with stable array based on enabled categories
  const placesQueries = useQueries({
    queries: categoryKeys.map((cat) => ({
      queryKey: ['places-map', countryCode, cat],
      queryFn: () => api.getPlaces({ country: countryCode, category: cat, limit: 200 }),
      enabled: !!countryCode,
      staleTime: 5 * 60 * 1000,
    })),
  });

  // ── Derive trip activities with coordinates ──
  const tripActivities = useMemo(() => {
    if (!trip?.days) return [];
    const acts: (TripActivity & { _dayNumber: number })[] = [];
    trip.days.forEach((day: TripDay) => {
      if (day.activities) {
        day.activities
          .filter((a) => a.latitude && a.longitude)
          .forEach((a) => acts.push({ ...a, _dayNumber: day.dayNumber }));
      }
    });
    return acts;
  }, [trip]);

  // ── Trip route line GeoJSON ──
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

  // ── Network arcs (great circle) ──
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

  // ── Places GeoJSON per category ──
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
          properties: {
            id: p.id,
            name: p.name,
            category: p.mainCategory,
            rating: p.rating,
            city: p.city,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [p.longitude, p.latitude],
          },
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

  // ── Map initial viewport: fit to trip activities ──
  const initialViewState = useMemo(() => {
    if (tripActivities.length === 0) {
      return { longitude: 100.5, latitude: 13.75, zoom: 5 };
    }
    const lats = tripActivities.map((a) => a.latitude!);
    const lngs = tripActivities.map((a) => a.longitude!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      longitude: (minLng + maxLng) / 2,
      latitude: (minLat + maxLat) / 2,
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

  // ── Fetch full details + nearby when place popup opens ──
  useEffect(() => {
    if (!placePopup?.id) {
      setPopupDetails(null);
      setPopupNearby([]);
      return;
    }
    setPopupLoading(true);
    Promise.all([
      api.getPlace(placePopup.id),
      api.getPlaces({
        lat: placePopup.latitude,
        lng: placePopup.longitude,
        radius: 2000,
        limit: 6,
      }),
    ])
      .then(([placeData, nearbyData]) => {
        setPopupDetails(placeData.place);
        setPopupNearby(
          (nearbyData.places || []).filter((p) => p.id !== placePopup.id).slice(0, 5)
        );
      })
      .catch(() => {})
      .finally(() => setPopupLoading(false));
  }, [placePopup?.id]);

  // ── Fetch nearby when activity popup opens ──
  useEffect(() => {
    if (!activityPopup?.latitude || !activityPopup?.longitude) {
      setPopupDetails(null);
      setPopupNearby([]);
      return;
    }
    setPopupLoading(true);
    api
      .getPlaces({
        lat: activityPopup.latitude,
        lng: activityPopup.longitude,
        radius: 2000,
        limit: 8,
      })
      .then((data) => {
        const places = data.places || [];
        const actName = (activityPopup.placeName || activityPopup.name || '').toLowerCase();
        const match = places.find(
          (p) =>
            p.name.toLowerCase().includes(actName.slice(0, 8)) ||
            actName.includes(p.name.toLowerCase().slice(0, 8))
        );
        if (match) {
          // Fetch full details for matched place
          api.getPlace(match.id).then((d) => setPopupDetails(d.place)).catch(() => {});
        } else {
          setPopupDetails(null);
        }
        setPopupNearby(places.filter((p) => p.id !== match?.id).slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setPopupLoading(false));
  }, [activityPopup?.id]);

  // ── Nominatim search for contribution ──
  useEffect(() => {
    if (!contributeSearch || contributeSearch.length < 3 || !countryCode) {
      setNominatimResults([]);
      return;
    }
    clearTimeout(nominatimTimer.current);
    nominatimTimer.current = setTimeout(async () => {
      setSearchingNominatim(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(contributeSearch)}&countrycodes=${countryCode}&format=json&limit=5&addressdetails=1`,
          { headers: { 'User-Agent': 'RoamRicher/1.0' } }
        );
        const data = await res.json();
        setNominatimResults(data || []);
      } catch {
        setNominatimResults([]);
      }
      setSearchingNominatim(false);
    }, 400);
    return () => clearTimeout(nominatimTimer.current);
  }, [contributeSearch, countryCode]);

  // ── Fly to a nearby place ──
  const flyToPlace = useCallback((place: Place) => {
    setPopupDetails(null);
    setPopupNearby([]);
    mapRef.current?.flyTo({
      center: [place.longitude, place.latitude],
      zoom: 14,
      duration: 800,
    });
    setPlacePopup(place);
    setActivityPopup(null);
  }, []);

  // ── Save contributed place ──
  const handleContributeSave = useCallback(async () => {
    if (!contributeForm.name || !contributeForm.latitude || !contributeForm.longitude || !contributeForm.mainCategory) return;
    setContributeSaving(true);
    try {
      await api.createUserPlace({
        name: contributeForm.name,
        latitude: contributeForm.latitude,
        longitude: contributeForm.longitude,
        countryCode,
        city: contributeForm.city,
        mainCategory: contributeForm.mainCategory,
        subCategory: contributeForm.subCategory,
        description: contributeForm.description,
        website: contributeForm.website,
      });
      setContributeSuccess(true);
      setTimeout(() => {
        setContributeSuccess(false);
        setShowContribute(false);
        setDroppedPin(null);
        setContributeForm({
          name: '', latitude: 0, longitude: 0, city: '',
          mainCategory: '', subCategory: '', description: '', website: '',
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to save place:', err);
    }
    setContributeSaving(false);
  }, [contributeForm, countryCode]);

  // ── Toggle category ──
  const toggleCategory = useCallback((cat: string) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // ── Handle place click on map ──
  const handleMapClick = useCallback((e: maplibregl.MapMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Drop-pin mode: place a marker for contribution
    if (dropPinMode) {
      const { lng, lat } = e.lngLat;
      setDroppedPin({ lat, lng });
      setContributeForm((f) => ({ ...f, latitude: Math.round(lat * 100000) / 100000, longitude: Math.round(lng * 100000) / 100000, name: f.name || '' }));
      setDropPinMode(false);
      return;
    }

    // Check place layers
    const placeLayerIds = categoryKeys.map((cat) => `places-${cat}`);
    const features = map.queryRenderedFeatures(e.point, { layers: placeLayerIds.filter((l) => map.getLayer(l)) });
    if (features.length > 0) {
      const f = features[0];
      const coords = (f.geometry as GeoJSON.Point).coordinates;
      setPlacePopup({
        id: f.properties?.id,
        name: f.properties?.name,
        mainCategory: f.properties?.category,
        rating: f.properties?.rating,
        city: f.properties?.city,
        longitude: coords[0],
        latitude: coords[1],
      } as Place);
      setActivityPopup(null);
    } else {
      // Click on empty space → dismiss all popups
      setPlacePopup(null);
      setActivityPopup(null);
      setPopupDetails(null);
      setPopupNearby([]);
    }
  }, [categoryKeys, dropPinMode]);

  // ── Loading states ──
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
      <div className="flex items-center gap-3 px-4 py-2 bg-surface-card border-b border-line shrink-0 z-20">
        <Link
          to={`/trips/${id}`}
          className="flex items-center gap-1.5 text-sm text-content-muted hover:text-content transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to trip
        </Link>
        <div className="h-4 w-px bg-line" />
        <span className="text-base">{countryCode ? getCountryFlag(countryCode) : '🌍'}</span>
        <h1 className="font-semibold text-content-heading text-sm truncate">
          {trip.routeName || trip.name || 'Trip Map'}
        </h1>
        <span className="text-xs text-content-muted">
          {tripActivities.length} locations · {trip.cities?.join(', ') || ''}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Network toggle */}
          <button
            onClick={() => setShowNetwork((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showNetwork
                ? 'bg-primary-500/15 text-primary-400 ring-1 ring-primary-500/30'
                : 'bg-surface-subtle text-content-muted hover:bg-surface-hover'
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            Transport Network
            {networkLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          </button>

          {/* Layers toggle */}
          <button
            onClick={() => setShowControls((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showControls
                ? 'bg-surface-subtle text-content hover:bg-surface-hover'
                : 'bg-surface-subtle text-content-muted hover:bg-surface-hover'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Places
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Map */}
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

          {/* ── Transport network overlay ── */}
          {showNetwork && networkData && (
            <>
              {/* Network edges (arcs) */}
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

              {/* Network nodes */}
              <Source id="network-nodes" type="geojson" data={networkData.nodes}>
                <Layer
                  id="network-nodes-circle"
                  type="circle"
                  paint={{
                    'circle-radius': [
                      'match', ['get', 'hierarchy'],
                      'international_hub', 7,
                      'regional_hub', 5,
                      'local_hub', 4,
                      3,
                    ],
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
                  layout={{
                    'text-field': ['get', 'name'],
                    'text-size': 10,
                    'text-offset': [0, 1.2],
                    'text-anchor': 'top',
                    'text-optional': true,
                  }}
                  paint={{
                    'text-color': '#a5b4fc',
                    'text-halo-color': '#0f172a',
                    'text-halo-width': 1,
                    'text-opacity': 0.7,
                  }}
                  minzoom={7}
                />
              </Source>
            </>
          )}

          {/* ── Place layers by category ── */}
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
                    'circle-radius': [
                      'interpolate', ['linear'], ['zoom'],
                      4, 2,
                      8, 3.5,
                      12, 5,
                    ],
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
                  layout={{
                    'text-field': ['get', 'name'],
                    'text-size': 9,
                    'text-offset': [0, 1.3],
                    'text-anchor': 'top',
                    'text-optional': true,
                  }}
                  paint={{
                    'text-color': cfg?.markerColor || '#9ca3af',
                    'text-halo-color': '#0f172a',
                    'text-halo-width': 1,
                    'text-opacity': 0.6,
                  }}
                  minzoom={10}
                />
              </Source>
            );
          })}

          {/* ── Trip route line ── */}
          {tripRouteGeoJSON && (
            <Source id="trip-route" type="geojson" data={tripRouteGeoJSON}>
              <Layer
                id="trip-route-line"
                type="line"
                paint={{
                  'line-color': '#f97316',
                  'line-width': 3,
                  'line-opacity': 0.8,
                  'line-dasharray': [2, 2],
                }}
              />
            </Source>
          )}

          {/* ── Trip activity markers ── */}
          {tripActivities.map((act, idx) => (
            <Marker
              key={act.id}
              longitude={act.longitude!}
              latitude={act.latitude!}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setActivityPopup(act);
                setPlacePopup(null);
              }}
            >
              <div className="relative cursor-pointer group">
                <div className="w-7 h-7 rounded-full bg-primary-500 border-2 border-white shadow-lg flex items-center justify-center text-[11px] font-bold text-white group-hover:scale-110 transition-transform">
                  {idx + 1}
                </div>
              </div>
            </Marker>
          ))}

          {/* ── Activity popup (enriched) ── */}
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
              <div className="p-3 max-w-[320px]">
                <div className="font-semibold text-sm text-gray-900">{activityPopup.name}</div>
                {activityPopup.placeName && activityPopup.placeName !== activityPopup.name && (
                  <div className="text-xs text-gray-500 mt-0.5">{activityPopup.placeName}</div>
                )}
                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700">
                    Day {activityPopup._dayNumber}
                  </span>
                  {activityPopup.category && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                      {CATEGORY_CONFIG[activityPopup.category]?.icon}
                      <span className="capitalize">{activityPopup.category.replace(/_/g, ' ')}</span>
                    </span>
                  )}
                </div>

                {/* Fetched place details */}
                {popupDetails && (
                  <div className="mt-2 space-y-1">
                    {(popupDetails.rating > 0 || popupDetails.priceLevel) && (
                      <div className="flex items-center gap-2 text-xs">
                        {popupDetails.rating > 0 && (
                          <span className="text-gray-700">⭐ {popupDetails.rating}{popupDetails.reviewCount ? ` (${popupDetails.reviewCount})` : ''}</span>
                        )}
                        {popupDetails.priceLevel && (
                          <span className="text-green-700 font-medium">{PRICE_LABELS[popupDetails.priceLevel] || ''}</span>
                        )}
                        {popupDetails.source === 'user' && (
                          <span className="px-1 py-0.5 rounded bg-purple-50 text-purple-600 text-[9px] font-semibold">Community</span>
                        )}
                      </div>
                    )}
                    {popupDetails.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{popupDetails.description}</p>
                    )}
                    {(popupDetails.website || popupDetails.phone) && (
                      <div className="flex items-center gap-3 text-xs">
                        {popupDetails.website && (
                          <a href={popupDetails.website} target="_blank" rel="noopener noreferrer"
                            className="text-blue-500 hover:underline inline-flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> Website
                          </a>
                        )}
                        {popupDetails.phone && <span className="text-gray-500">📞 {popupDetails.phone}</span>}
                      </div>
                    )}
                    {popupDetails.address && (
                      <div className="text-[11px] text-gray-500">📍 {popupDetails.address}</div>
                    )}
                    {popupDetails.openingHours && (
                      <div className="text-[11px] text-gray-500">🕐 {popupDetails.openingHours}</div>
                    )}
                  </div>
                )}

                {!popupDetails && activityPopup.description && (
                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">{activityPopup.description}</p>
                )}

                {popupLoading && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading details…
                  </div>
                )}

                {/* Nearby places */}
                {popupNearby.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => setShowNearby((v) => !v)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 hover:text-gray-600"
                    >
                      Nearby {showNearby ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {showNearby && (
                      <div className="space-y-0.5">
                        {popupNearby.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => flyToPlace(p)}
                            className="w-full flex items-center gap-2 text-xs text-left hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: CATEGORY_CONFIG[p.mainCategory || '']?.markerColor || '#9ca3af' }}
                            />
                            <span className="flex-1 truncate text-gray-700">{p.name}</span>
                            {p.rating > 0 && <span className="text-gray-400 text-[10px]">⭐{p.rating}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          )}

          {/* ── Place popup (enriched) ── */}
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
              <div className="p-3 max-w-[320px]">
                <div className="font-semibold text-sm text-gray-900">
                  {popupDetails?.name || placePopup.name}
                </div>
                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                  {(popupDetails?.mainCategory || placePopup.mainCategory) && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                      {CATEGORY_CONFIG[popupDetails?.mainCategory || placePopup.mainCategory || '']?.icon}
                      <span className="capitalize">{(popupDetails?.mainCategory || placePopup.mainCategory || '').replace(/_/g, ' ')}</span>
                    </span>
                  )}
                  {(popupDetails?.city || placePopup.city) && (
                    <span className="text-xs text-gray-500">{popupDetails?.city || placePopup.city}</span>
                  )}
                </div>

                {/* Rating + price + source */}
                {((popupDetails?.rating ?? placePopup.rating) > 0 || popupDetails?.priceLevel) && (
                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    {(popupDetails?.rating ?? placePopup.rating) > 0 && (
                      <span className="text-gray-700">
                        ⭐ {popupDetails?.rating ?? placePopup.rating}
                        {popupDetails?.reviewCount ? ` (${popupDetails.reviewCount})` : ''}
                      </span>
                    )}
                    {popupDetails?.priceLevel && (
                      <span className="text-green-700 font-medium">{PRICE_LABELS[popupDetails.priceLevel] || ''}</span>
                    )}
                    {popupDetails?.source === 'user' && (
                      <span className="px-1 py-0.5 rounded bg-purple-50 text-purple-600 text-[9px] font-semibold">Community</span>
                    )}
                  </div>
                )}

                {/* Description */}
                {popupDetails?.description && (
                  <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{popupDetails.description}</p>
                )}

                {/* Links */}
                {(popupDetails?.website || popupDetails?.phone) && (
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    {popupDetails.website && (
                      <a href={popupDetails.website} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Website
                      </a>
                    )}
                    {popupDetails.phone && <span className="text-gray-500">📞 {popupDetails.phone}</span>}
                  </div>
                )}

                {popupDetails?.address && (
                  <div className="text-[11px] text-gray-500 mt-1">📍 {popupDetails.address}</div>
                )}
                {popupDetails?.openingHours && (
                  <div className="text-[11px] text-gray-500 mt-0.5">🕐 {popupDetails.openingHours}</div>
                )}

                {popupLoading && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading details…
                  </div>
                )}

                {/* Nearby places */}
                {popupNearby.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => setShowNearby((v) => !v)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 hover:text-gray-600"
                    >
                      Nearby {showNearby ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {showNearby && (
                      <div className="space-y-0.5">
                        {popupNearby.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => flyToPlace(p)}
                            className="w-full flex items-center gap-2 text-xs text-left hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: CATEGORY_CONFIG[p.mainCategory || '']?.markerColor || '#9ca3af' }}
                            />
                            <span className="flex-1 truncate text-gray-700">{p.name}</span>
                            {p.rating > 0 && <span className="text-gray-400 text-[10px]">⭐{p.rating}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          )}
          {/* ── Dropped pin marker ── */}
          {droppedPin && (
            <Marker
              longitude={droppedPin.lng}
              latitude={droppedPin.lat}
              anchor="bottom"
            >
              <div className="flex flex-col items-center">
                <MapPin className="h-8 w-8 text-amber-400 drop-shadow-lg" fill="#fbbf24" />
              </div>
            </Marker>
          )}
        </MapGL>

        {/* ── Category toggles panel ── */}
        {showControls && (
          <div className="absolute top-3 right-3 w-56 bg-surface-card/95 backdrop-blur-sm border border-line rounded-xl shadow-xl z-10 overflow-hidden">
            <div className="px-3 py-2 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary-500" />
                <span className="text-xs font-semibold text-content-heading">Places</span>
              </div>
              <button onClick={() => setShowControls(false)} className="p-0.5 hover:bg-surface-hover rounded text-content-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-2 space-y-0.5 max-h-[50vh] overflow-y-auto">
              {availableCategories.length === 0 ? (
                <p className="text-xs text-content-muted px-2 py-1">No places for this country</p>
              ) : (
                availableCategories.map(({ key, count }) => {
                  const cfg = CATEGORY_CONFIG[key];
                  const isOn = enabledCategories.has(key);
                  const query = placesQueries[categoryKeys.indexOf(key)];
                  const isLoadingCat = query?.isLoading;
                  return (
                    <button
                      key={key}
                      onClick={() => toggleCategory(key)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        isOn
                          ? 'bg-primary-500/10 text-content'
                          : 'text-content-muted hover:bg-surface-hover'
                      }`}
                    >
                      <span className={`${isOn ? (cfg?.color || 'text-primary-400') : 'text-content-faint'}`}>
                        {cfg?.icon || <MapPin className="h-3.5 w-3.5" />}
                      </span>
                      <span className="flex-1 text-left font-medium">
                        {cfg?.label || key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-content-faint">{count}</span>
                      {isLoadingCat && <Loader2 className="h-3 w-3 animate-spin text-primary-500" />}
                      {isOn ? (
                        <Eye className="h-3 w-3 text-primary-400" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-content-faint" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
            {enabledCategories.size > 0 && (
              <div className="px-3 py-1.5 border-t border-line">
                <button
                  onClick={() => setEnabledCategories(new Set())}
                  className="text-[10px] text-content-muted hover:text-content transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Legend (trip markers) ── */}
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
          <div className="absolute top-3 left-3 w-72 bg-surface-card/95 backdrop-blur-sm border border-line rounded-xl shadow-xl z-10 overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-3 py-2 border-b border-line flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-content-heading">Contribute a Place</span>
              </div>
              <button
                onClick={() => { setShowContribute(false); setDropPinMode(false); setDroppedPin(null); }}
                className="p-0.5 hover:bg-surface-hover rounded text-content-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto flex-1">
              {!user ? (
                <p className="text-xs text-content-muted text-center py-4">Sign in to contribute places</p>
              ) : contributeSuccess ? (
                <div className="flex flex-col items-center gap-2 py-6">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-content">Saved!</p>
                  <p className="text-xs text-content-muted">Your place has been added</p>
                </div>
              ) : (
                <>
                  {/* Search via Nominatim */}
                  <div>
                    <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">
                      Search OSM
                    </label>
                    <div className="relative mt-1">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-faint" />
                      <input
                        type="text"
                        placeholder="Search for a place…"
                        value={contributeSearch}
                        onChange={(e) => setContributeSearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-content"
                      />
                      {searchingNominatim && (
                        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-primary-500" />
                      )}
                    </div>
                    {nominatimResults.length > 0 && (
                      <div className="mt-1 border border-line rounded-lg overflow-hidden bg-surface-card max-h-40 overflow-y-auto">
                        {nominatimResults.map((r) => (
                          <button
                            key={r.place_id}
                            onClick={() => {
                              const city = r.address?.city || r.address?.town || r.address?.village || '';
                              setContributeForm({
                                ...contributeForm,
                                name: r.display_name.split(',')[0],
                                latitude: parseFloat(r.lat),
                                longitude: parseFloat(r.lon),
                                city,
                              });
                              setDroppedPin({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
                              mapRef.current?.flyTo({
                                center: [parseFloat(r.lon), parseFloat(r.lat)],
                                zoom: 15,
                                duration: 800,
                              });
                              setNominatimResults([]);
                              setContributeSearch('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-surface-hover border-b border-line last:border-0 transition-colors"
                          >
                            <div className="font-medium text-content truncate">
                              {r.display_name.split(',')[0]}
                            </div>
                            <div className="text-[10px] text-content-muted truncate">
                              {r.display_name.split(',').slice(1, 3).join(',')}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Drop pin + Google Maps */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDropPinMode((v) => !v)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        dropPinMode
                          ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                          : 'bg-surface-subtle text-content-muted hover:bg-surface-hover'
                      }`}
                    >
                      <Crosshair className="h-3.5 w-3.5" />
                      {dropPinMode ? 'Click map…' : 'Drop Pin'}
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${contributeForm.latitude || ''},${contributeForm.longitude || ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-content-muted bg-surface-subtle hover:bg-surface-hover transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      GMaps
                    </a>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">Name *</label>
                      <input
                        type="text"
                        value={contributeForm.name}
                        onChange={(e) => setContributeForm({ ...contributeForm, name: e.target.value })}
                        className="w-full mt-0.5 px-2.5 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg focus:ring-1 focus:ring-primary-500 text-content"
                        placeholder="Place name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">Lat *</label>
                        <input
                          type="number" step="any"
                          value={contributeForm.latitude || ''}
                          onChange={(e) => setContributeForm({ ...contributeForm, latitude: parseFloat(e.target.value) || 0 })}
                          className="w-full mt-0.5 px-2 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg text-content"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">Lng *</label>
                        <input
                          type="number" step="any"
                          value={contributeForm.longitude || ''}
                          onChange={(e) => setContributeForm({ ...contributeForm, longitude: parseFloat(e.target.value) || 0 })}
                          className="w-full mt-0.5 px-2 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg text-content"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">Category *</label>
                      <select
                        value={contributeForm.mainCategory}
                        onChange={(e) => setContributeForm({ ...contributeForm, mainCategory: e.target.value })}
                        className="w-full mt-0.5 px-2.5 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg text-content"
                      >
                        <option value="">Select…</option>
                        {CONTRIBUTE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{CATEGORY_CONFIG[c]?.label || c.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">City</label>
                      <input
                        type="text"
                        value={contributeForm.city}
                        onChange={(e) => setContributeForm({ ...contributeForm, city: e.target.value })}
                        className="w-full mt-0.5 px-2.5 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg text-content"
                        placeholder="City name"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">Description</label>
                      <textarea
                        value={contributeForm.description}
                        onChange={(e) => setContributeForm({ ...contributeForm, description: e.target.value })}
                        className="w-full mt-0.5 px-2.5 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg text-content resize-none"
                        rows={2}
                        placeholder="What makes this place special?"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">Website</label>
                      <input
                        type="url"
                        value={contributeForm.website}
                        onChange={(e) => setContributeForm({ ...contributeForm, website: e.target.value })}
                        className="w-full mt-0.5 px-2.5 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg text-content"
                        placeholder="https://…"
                      />
                    </div>
                  </div>

                  {/* Save button */}
                  <button
                    onClick={handleContributeSave}
                    disabled={contributeSaving || !contributeForm.name || !contributeForm.latitude || !contributeForm.mainCategory}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {contributeSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {contributeSaving ? 'Saving…' : 'Save Place'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
