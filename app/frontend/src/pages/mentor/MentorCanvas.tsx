// ─── MentorCanvas — spatial drawing canvas for mentors ──
import { useRef, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Map, {
  NavigationControl,
  ScaleControl,
  GeolocateControl,
  type MapRef,
  type MapLayerMouseEvent,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { PenTool, Loader2 } from 'lucide-react';

import type { Pin, Segment, Area, RouteData, Tool, PanelTab } from './canvas-types';
import { DARK_STYLE, LIGHT_STYLE } from './canvas-constants';
import { useCanvasApi, saveCanvas, buildSegmentsGeoJSON, buildDrawPreviewGeoJSON, buildAreasGeoJSON, buildAreaDrawPreviewGeoJSON } from './useCanvasApi';
import CanvasToolbar from './CanvasToolbar';
import CanvasMapLayers from './CanvasMapLayers';
import CanvasPanel from './CanvasPanel';

export default function MentorCanvas() {
  const { id: routeIdParam } = useParams();
  const mapRef = useRef<MapRef>(null);
  const { apiRequest } = useCanvasApi();

  // ── Tool state ──────────────────────────────
  const [activeTool, setActiveTool] = useState<Tool>('pin');
  const [routeDrawPoints, setRouteDrawPoints] = useState<[number, number][]>([]);
  const [areaDrawPoints, setAreaDrawPoints] = useState<[number, number][]>([]);
  const [isSnapping, setIsSnapping] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // ── Data state ──────────────────────────────
  const [routeData, setRouteData] = useState<RouteData>({
    title: '', description: '', countryCode: '', travelStyle: 'backpacker', difficulty: 'moderate',
  });
  const [routeId, setRouteId] = useState<number | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedPinIdx, setSelectedPinIdx] = useState<number | null>(null);
  const [selectedAreaIdx, setSelectedAreaIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Panel state ─────────────────────────────
  const [showPanel, setShowPanel] = useState(true);
  const [panelTab, setPanelTab] = useState<PanelTab>('route');

  // ── Theme ───────────────────────────────────
  const [isDark] = useState(() => document.documentElement.getAttribute('data-theme') !== 'light');

  // ── Load existing route for editing ─────────
  useEffect(() => {
    if (!routeIdParam) return;
    const loadExistingRoute = async () => {
      setLoadingRoute(true);
      try {
        const data = await apiRequest(`/api/mentor/routes/${routeIdParam}`);
        const r = data.route;
        setRouteId(r.id);
        setRouteData({
          title: r.title || '', description: r.description || '',
          countryCode: r.country_code || '', travelStyle: r.travel_style || 'backpacker',
          difficulty: r.difficulty || 'moderate',
        });
        // Load pins
        setPins((data.pins || []).map((p: any, i: number) => ({
          id: p.id, lat: p.lat, lng: p.lng, category: p.category || 'general',
          title: p.title || '', notes: p.notes || '', tips: p.tips || '',
          costUsd: p.cost_usd?.toString() || '', durationMinutes: p.duration_minutes?.toString() || '',
          timeOfDay: p.time_of_day || 'anytime', dayNumber: p.day_number?.toString() || '1',
          sequenceOrder: p.sequence_order ?? i,
        })));
        // Load segments
        setSegments((data.segments || []).map((s: any) => ({
          id: s.id, fromPinIdx: -1, toPinIdx: -1, geometry: s.geometry,
          transportMode: s.transport_mode || 'driving',
          distanceKm: s.distance_km || 0, durationMinutes: s.duration_minutes || 0,
        })));
        // Load areas
        setAreas((data.areas || []).map((a: any) => ({
          id: a.id, coordinates: a.boundary?.coordinates?.[0]?.slice(0, -1) || [],
          label: a.label || '', notes: a.notes || '',
          category: a.category || 'explored', color: a.color || '#10b981',
          opacity: a.opacity ?? 0.2,
        })));
        // Fly to first pin
        if (data.pins?.length > 0) {
          const p = data.pins[0];
          setTimeout(() => mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 11, duration: 1000 }), 500);
        }
      } catch (err) {
        console.error('Failed to load route:', err);
      } finally {
        setLoadingRoute(false);
      }
    };
    loadExistingRoute();
  }, [routeIdParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Map click handler ───────────────────────
  const handleMapClick = useCallback(async (e: MapLayerMouseEvent) => {
    const { lng, lat } = e.lngLat;

    if (activeTool === 'select') {
      const features = e.target.queryRenderedFeatures(e.point, { layers: ['areas-fill-layer'] });
      if (features && features.length > 0) {
        const idx = features[0].properties?.idx;
        if (idx !== undefined) {
          setSelectedAreaIdx(Number(idx));
          setPanelTab('area');
          setShowPanel(true);
        }
      }
      return;
    }

    if (activeTool === 'pin') {
      const newPin: Pin = {
        lat, lng, category: 'general', title: '', notes: '', tips: '',
        costUsd: '', durationMinutes: '', timeOfDay: 'anytime', dayNumber: '1',
        sequenceOrder: pins.length,
      };
      setPins(prev => [...prev, newPin]);
      setSelectedPinIdx(pins.length);
      setPanelTab('pin');
      setShowPanel(true);
    } else if (activeTool === 'route') {
      const newPoints = [...routeDrawPoints, [lng, lat] as [number, number]];
      setRouteDrawPoints(newPoints);

      if (newPoints.length >= 2) {
        setIsSnapping(true);
        try {
          const lastTwo = newPoints.slice(-2);
          const data = await apiRequest('/api/mentor/snap-route', {
            method: 'POST',
            body: JSON.stringify({ coordinates: lastTwo, profile: 'driving' }),
          });
          if (data.geometry) {
            const newSeg: Segment = {
              fromPinIdx: -1, toPinIdx: -1, geometry: data.geometry,
              transportMode: 'driving',
              distanceKm: data.properties?.distance_km || 0,
              durationMinutes: data.properties?.duration_minutes || 0,
            };
            setSegments(prev => [...prev, newSeg]);
          }
        } catch (err) { console.error('Snap failed:', err); }
        finally { setIsSnapping(false); }
      }
    } else if (activeTool === 'area') {
      setAreaDrawPoints(prev => [...prev, [lng, lat] as [number, number]]);
    }
  }, [activeTool, pins, routeDrawPoints, apiRequest]);

  // ── Finish area polygon ─────────────────────
  const finishArea = useCallback(() => {
    if (areaDrawPoints.length < 3) return;
    const newArea: Area = {
      coordinates: areaDrawPoints, label: '', notes: '',
      category: 'explored', color: '#10b981', opacity: 0.20,
    };
    setAreas(prev => [...prev, newArea]);
    setAreaDrawPoints([]);
    setSelectedAreaIdx(areas.length);
    setPanelTab('area');
    setShowPanel(true);
  }, [areaDrawPoints, areas.length]);

  // ── Save all ────────────────────────────────
  const handleSave = useCallback(async () => {
    if (pins.length === 0 && areas.length === 0) return;
    setSaving(true);
    try {
      await saveCanvas(apiRequest, routeId, routeData, pins, segments, areas, setRouteId);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Save failed — check console');
    } finally {
      setSaving(false);
    }
  }, [pins, segments, areas, routeData, routeId, apiRequest]);

  // ── Derived GeoJSON ─────────────────────────
  const segmentsGeoJSON = buildSegmentsGeoJSON(segments);
  const drawPreviewGeoJSON = buildDrawPreviewGeoJSON(routeDrawPoints);
  const areasGeoJSON = buildAreasGeoJSON(areas);
  const areaDrawPreviewGeoJSON = buildAreaDrawPreviewGeoJSON(areaDrawPoints);

  // ── Stats ───────────────────────────────────
  const totalDistance = segments.reduce((sum, s) => sum + (s.distanceKm || 0), 0);
  const totalDuration = segments.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  if (loadingRoute) {
    return (
      <div className="h-[calc(100vh-86px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="ml-3 text-content-muted">Loading route...</span>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-86px)] flex relative">
      {/* ─── Left Toolbar ─── */}
      <CanvasToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        pinsCount={pins.length}
        segmentsCount={segments.length}
        areasCount={areas.length}
        areaDrawPointsCount={areaDrawPoints.length}
        saving={saving}
        canSave={pins.length > 0 || areas.length > 0}
        onFinishArea={finishArea}
        onSave={handleSave}
        onClearRouteDrawPoints={() => setRouteDrawPoints([])}
        onClearAreaDrawPoints={() => setAreaDrawPoints([])}
      />

      {/* ─── Map ─── */}
      <div className="flex-1 relative">
        <Map
          ref={mapRef}
          initialViewState={{ longitude: 106.6, latitude: 16.5, zoom: 5 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={isDark ? DARK_STYLE : LIGHT_STYLE}
          onClick={handleMapClick}
          cursor={activeTool === 'select' ? 'grab' : 'crosshair'}
          attributionControl={false}
        >
          <NavigationControl position="bottom-right" />
          <ScaleControl position="bottom-left" />
          <GeolocateControl position="bottom-right" />

          <CanvasMapLayers
            segmentsGeoJSON={segmentsGeoJSON}
            drawPreviewGeoJSON={drawPreviewGeoJSON}
            areasGeoJSON={areasGeoJSON}
            areaDrawPreviewGeoJSON={areaDrawPreviewGeoJSON}
            activeTool={activeTool}
            routeDrawPoints={routeDrawPoints}
            areaDrawPoints={areaDrawPoints}
            pins={pins}
            selectedPinIdx={selectedPinIdx}
            onPinClick={(idx) => {
              setSelectedPinIdx(idx);
              setPanelTab('pin');
              setShowPanel(true);
            }}
          />
        </Map>

        {/* Snapping indicator */}
        {isSnapping && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface-card border border-line px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 z-20">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            <span className="text-sm text-content-muted">Snapping to road...</span>
          </div>
        )}

        {/* Active tool hint */}
        <div className="absolute top-4 right-4 bg-surface-card/90 border border-line px-3 py-1.5 rounded-lg shadow z-10">
          <span className="text-xs text-content-muted">
            {activeTool === 'pin' && '📍 Click map to drop a pin'}
            {activeTool === 'route' && '🛤️ Click points to draw a route'}
            {activeTool === 'area' && '🔷 Click to draw area polygon, then Finish'}
            {activeTool === 'select' && '👆 Click pins or areas to edit'}
          </span>
        </div>

        {/* Stats bar */}
        {(totalDistance > 0 || pins.length > 0 || areas.length > 0) && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-surface-card/95 border border-line px-5 py-2 rounded-xl shadow-lg flex items-center gap-5 z-10">
            <div className="text-center">
              <div className="text-sm font-semibold text-content-heading">{pins.length}</div>
              <div className="text-[10px] text-content-muted">Pins</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-content-heading">{areas.length}</div>
              <div className="text-[10px] text-content-muted">Areas</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-content-heading">{totalDistance.toFixed(1)} km</div>
              <div className="text-[10px] text-content-muted">Distance</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-content-heading">
                {totalDuration >= 60 ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m` : `${totalDuration}m`}
              </div>
              <div className="text-[10px] text-content-muted">Drive time</div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Right Panel ─── */}
      {showPanel && (
        <CanvasPanel
          panelTab={panelTab}
          setPanelTab={setPanelTab}
          onClose={() => setShowPanel(false)}
          routeData={routeData}
          setRouteData={setRouteData}
          routeId={routeId}
          pins={pins}
          setPins={setPins}
          selectedPinIdx={selectedPinIdx}
          setSelectedPinIdx={setSelectedPinIdx}
          areas={areas}
          setAreas={setAreas}
          selectedAreaIdx={selectedAreaIdx}
          setSelectedAreaIdx={setSelectedAreaIdx}
          mapRef={mapRef}
        />
      )}

      {/* Panel toggle (when hidden) */}
      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="absolute top-4 right-4 z-20 bg-surface-card border border-line p-2 rounded-lg shadow hover:bg-surface-hover transition-colors"
        >
          <PenTool className="w-4 h-4 text-content-muted" />
        </button>
      )}
    </div>
  );
}
