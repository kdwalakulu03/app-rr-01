// ─── Public Mentor Route View ─────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Map, { Source, Layer, Marker, NavigationControl, ScaleControl, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MapPin, Route, Eye, Heart, GitFork, ArrowLeft,
  Loader2, User, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';

const API_URL = import.meta.env.VITE_API_URL || '';
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const PIN_COLORS: Record<string, string> = {
  food: '#f97316', stay: '#3b82f6', transport: '#8b5cf6', 'hidden-gem': '#10b981',
  warning: '#ef4444', 'photo-spot': '#ec4899', activity: '#14b8a6', culture: '#a855f7',
  nature: '#22c55e', nightlife: '#6366f1', shopping: '#f59e0b', general: '#6b7280',
};

interface RouteDetail {
  id: number; title: string; description: string; country_code: string;
  travel_style: string; difficulty: string; duration_days: number;
  view_count: number; save_count: number; fork_count: number;
  creator_name: string; creator_avatar: string | null;
  published_at: string; route_geometry: any; bounds: any;
}

interface PinData { id: number; lat: number; lng: number; category: string; title: string; notes: string; tips: string; cost_usd: number; duration_minutes: number; time_of_day: string; day_number: number; }
interface SegData { id: number; transport_mode: string; distance_km: number; duration_minutes: number; geometry: GeoJSON.LineString; }
interface AreaData { id: number; label: string; notes: string; category: string; color: string; opacity: number; boundary: GeoJSON.Polygon; }

export default function MentorRouteView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [pins, setPins] = useState<PinData[]>([]);
  const [segments, setSegments] = useState<SegData[]>([]);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null);
  const [forking, setForking] = useState(false);
  const [isDark] = useState(() => document.documentElement.getAttribute('data-theme') !== 'light');
  const { user } = useAuth();

  const loadRoute = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/mentor/public/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setRoute(data.route);
      setPins(data.pins || []);
      setSegments(data.segments || []);
      setAreas(data.areas || []);
    } catch {
      setRoute(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadRoute(); }, [loadRoute]);

  const handleFork = async () => {
    if (!user) { navigate('/login'); return; }
    setForking(true);
    try {
      const token = await (user as any).getIdToken?.();
      const res = await fetch(`${API_URL}/api/mentor/routes/${id}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Fork failed' }));
        throw new Error(err.error);
      }
      const data = await res.json();
      navigate(`/mentor/canvas/${data.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to fork route');
    } finally {
      setForking(false);
    }
  };

  // Fit map to route bounds after load
  useEffect(() => {
    if (!route || !pins.length || !mapRef.current) return;
    const lngs = pins.map(p => p.lng);
    const lats = pins.map(p => p.lat);
    mapRef.current.fitBounds(
      [[Math.min(...lngs) - 0.1, Math.min(...lats) - 0.1], [Math.max(...lngs) + 0.1, Math.max(...lats) + 0.1]],
      { padding: 60, duration: 1200 }
    );
  }, [route, pins]);

  // GeoJSON
  const segmentsGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: segments.map(s => ({ type: 'Feature' as const, properties: { mode: s.transport_mode }, geometry: s.geometry })),
  };

  const areasGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: areas.map(a => ({ type: 'Feature' as const, properties: { color: a.color, opacity: a.opacity, label: a.label }, geometry: a.boundary })),
  };

  const totalDistance = segments.reduce((s, seg) => s + (seg.distance_km || 0), 0);
  const totalDuration = segments.reduce((s, seg) => s + (seg.duration_minutes || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-86px)]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-86px)]">
        <Route className="w-12 h-12 text-content-faint mb-3" />
        <h2 className="text-lg font-semibold text-content-heading">Route not found</h2>
        <button onClick={() => navigate('/explore')} className="mt-4 text-emerald-500 hover:underline text-sm">
          ← Back to Explore
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-86px)] flex">
      {/* Left sidebar — route info */}
      <div className="w-96 bg-surface-card border-r border-line flex flex-col overflow-hidden">
        {/* Back + header */}
        <div className="p-5 border-b border-line">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-content-muted hover:text-content mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-xl font-bold text-content-heading mb-2">{route.title}</h1>

          {/* Creator */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              {route.creator_avatar ? (
                <img src={route.creator_avatar} alt="" className="w-7 h-7 rounded-full" />
              ) : (
                <User className="w-4 h-4 text-emerald-500" />
              )}
            </div>
            <span className="text-sm text-content-muted">{route.creator_name || 'Anonymous Mentor'}</span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {route.country_code && <Tag>{route.country_code}</Tag>}
            {route.travel_style && <Tag>{route.travel_style}</Tag>}
            {route.difficulty && <Tag>{route.difficulty}</Tag>}
            {route.duration_days && <Tag>{route.duration_days} days</Tag>}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-content-faint">
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{route.view_count}</span>
            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{route.save_count}</span>
            <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" />{route.fork_count}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{pins.length} pins</span>
          </div>

          {/* Use This Route (fork) */}
          <button
            onClick={handleFork}
            disabled={forking}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow transition-colors disabled:opacity-50"
          >
            {forking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {forking ? 'Forking…' : 'Use This Route'}
          </button>
          <p className="text-[10px] text-content-faint text-center mt-1">Fork into your own canvas to edit</p>
        </div>

        {/* Description + trip stats */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {route.description && (
            <div>
              <h3 className="text-xs font-semibold text-content-muted uppercase mb-1">About</h3>
              <p className="text-sm text-content leading-relaxed">{route.description}</p>
            </div>
          )}

          {/* Route summary */}
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Distance" value={`${totalDistance.toFixed(1)} km`} />
            <MiniStat label="Drive time" value={totalDuration >= 60 ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m` : `${totalDuration}m`} />
            <MiniStat label="Areas" value={String(areas.length)} />
          </div>

          {/* Pins list */}
          <div>
            <h3 className="text-xs font-semibold text-content-muted uppercase mb-2">Pins ({pins.length})</h3>
            <div className="space-y-1.5">
              {pins.map(pin => (
                <button
                  key={pin.id}
                  onClick={() => {
                    setSelectedPin(pin);
                    mapRef.current?.flyTo({ center: [pin.lng, pin.lat], zoom: 14, duration: 800 });
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    selectedPin?.id === pin.id ? 'bg-emerald-500/10' : 'hover:bg-surface-hover'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: PIN_COLORS[pin.category] || '#6b7280' }} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-content-heading truncate">{pin.title || `Pin`}</div>
                    <div className="text-[10px] text-content-faint">{pin.category} • Day {pin.day_number || '?'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected pin detail */}
          {selectedPin && (
            <div className="bg-surface border border-line rounded-xl p-4 space-y-2">
              <h4 className="font-semibold text-content-heading">{selectedPin.title || 'Pin Detail'}</h4>
              {selectedPin.notes && <p className="text-sm text-content">{selectedPin.notes}</p>}
              {selectedPin.tips && (
                <div className="text-sm text-emerald-600 bg-emerald-500/5 rounded-lg p-2">💡 {selectedPin.tips}</div>
              )}
              <div className="flex gap-3 text-xs text-content-faint">
                {selectedPin.cost_usd && <span>${selectedPin.cost_usd}</span>}
                {selectedPin.duration_minutes && <span>{selectedPin.duration_minutes} min</span>}
                {selectedPin.time_of_day && <span>{selectedPin.time_of_day}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <Map
          ref={mapRef}
          initialViewState={{ longitude: 106.6, latitude: 16.5, zoom: 5 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={isDark ? DARK_STYLE : LIGHT_STYLE}
          attributionControl={false}
        >
          <NavigationControl position="bottom-right" />
          <ScaleControl position="bottom-left" />

          {/* Segments */}
          <Source id="segments" type="geojson" data={segmentsGeoJSON}>
            <Layer id="segments-line" type="line" paint={{ 'line-color': '#10b981', 'line-width': 4, 'line-opacity': 0.8 }} />
          </Source>

          {/* Areas */}
          <Source id="areas" type="geojson" data={areasGeoJSON}>
            <Layer id="areas-fill" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'] }} />
            <Layer id="areas-outline" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.6 }} />
          </Source>

          {/* Pin markers */}
          {pins.map(pin => (
            <Marker
              key={pin.id}
              longitude={pin.lng}
              latitude={pin.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedPin(pin);
              }}
            >
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full shadow-lg cursor-pointer transition-transform ${
                  selectedPin?.id === pin.id ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: PIN_COLORS[pin.category] || '#6b7280' }}
              >
                <MapPin className="w-3.5 h-3.5 text-white" />
              </div>
            </Marker>
          ))}
        </Map>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium text-content-muted bg-surface-hover px-2 py-0.5 rounded-full capitalize">
      {children}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-2 text-center">
      <div className="text-sm font-semibold text-content-heading">{value}</div>
      <div className="text-[10px] text-content-muted">{label}</div>
    </div>
  );
}
