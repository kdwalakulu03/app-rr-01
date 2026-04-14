import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  ScaleControl,
  type MapRef,
  type MapLayerMouseEvent,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { greatCircle } from '@turf/turf';
import type { FeatureCollection, Point, Feature, LineString } from 'geojson';

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

interface NetworkMapProps {
  nodes: FeatureCollection;
  edges: FeatureCollection;
  onNodeClick?: (nodeId: number) => void;
  selectedNodeId?: number | null;
  /** Highlight only these edge IDs (for mini-map mode) */
  highlightEdgeIds?: number[];
  /** Hide legend + controls for embedded mini-map mode */
  mini?: boolean;
  className?: string;
}

interface NodePopupInfo {
  longitude: number;
  latitude: number;
  name: string;
  hierarchy: string;
  nodeType: string;
  connectionCount: number;
  nodeId: number;
  /** Names of connected destinations (pulled from edges) */
  connectedTo: string[];
}

interface EdgePopupInfo {
  longitude: number;
  latitude: number;
  sourceName: string;
  targetName: string;
  transportType: string;
  distanceKm: number;
  durationMinutes: number;
  costUsd: number | null;
  tips: string | null;
  gmapsLink: string | null;
  bidirectional: boolean;
}

// ───────────────────────────────────────────────
// Dark basemap — CartoDB Dark Matter (free)
// ───────────────────────────────────────────────

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// ───────────────────────────────────────────────
// Transport-type colours
// ───────────────────────────────────────────────

export const TRANSPORT_COLORS: Record<string, string> = {
  flight: '#f59e0b',      // amber
  train: '#10b981',       // emerald
  bus: '#3b82f6',         // blue
  minivan: '#8b5cf6',     // violet
  ferry: '#06b6d4',       // cyan
  boat: '#0ea5e9',        // sky
  taxi: '#f43f5e',        // rose
  tuktuk: '#ec4899',      // pink
  songthaew: '#d946ef',   // fuchsia
  walking: '#6b7280',     // gray
};

const HIERARCHY_SIZES: Record<string, number> = {
  international_hub: 20,
  regional_hub: 14,
  local_hub: 10,
  micro_destination: 7,
};

const HIERARCHY_COLOR: Record<string, string> = {
  international_hub: '#f97316',
  regional_hub: '#fb923c',
  local_hub: '#fdba74',
  micro_destination: '#fed7aa',
};

// ───────────────────────────────────────────────
// Helper: build great-circle arcs for edges
// ───────────────────────────────────────────────

function edgesToArcs(edges: FeatureCollection): FeatureCollection {
  const features: Feature<LineString>[] = [];
  for (const f of edges.features) {
    if (f.geometry.type !== 'LineString') continue;
    const coords = f.geometry.coordinates;
    if (coords.length < 2) continue;
    const from = coords[0] as [number, number];
    const to = coords[coords.length - 1] as [number, number];
    try {
      const arc = greatCircle(from, to, { npoints: 50 });
      features.push({
        type: 'Feature',
        geometry: arc.geometry as LineString,
        properties: { ...f.properties },
      });
    } catch {
      // If great-circle fails (antipodal points), fall back to straight line
      features.push(f as Feature<LineString>);
    }
  }
  return { type: 'FeatureCollection', features };
}

// ───────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────

export default function NetworkMap({
  nodes,
  edges,
  onNodeClick,
  selectedNodeId,
  highlightEdgeIds,
  mini = false,
  className = '',
}: NetworkMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [nodePopup, setNodePopup] = useState<NodePopupInfo | null>(null);
  const [edgePopup, setEdgePopup] = useState<EdgePopupInfo | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);

  // ─── Great-circle arcs (memoised) ──────────

  const arcEdges = useMemo(() => edgesToArcs(edges), [edges]);

  // ─── Index: node name → list of connected destination names ──

  const connectionsByName = useMemo(() => {
    const idx: Record<string, string[]> = {};
    for (const f of edges.features) {
      const p = f.properties;
      if (!p?.sourceName || !p?.targetName) continue;
      if (!idx[p.sourceName]) idx[p.sourceName] = [];
      if (!idx[p.sourceName].includes(p.targetName)) idx[p.sourceName].push(p.targetName);
      if (p.bidirectional) {
        if (!idx[p.targetName]) idx[p.targetName] = [];
        if (!idx[p.targetName].includes(p.sourceName)) idx[p.targetName].push(p.sourceName);
      }
    }
    return idx;
  }, [edges]);

  // Fit bounds to data when nodes change
  useEffect(() => {
    if (!mapRef.current || !nodes.features.length) return;

    const coords = nodes.features
      .filter((f) => f.geometry.type === 'Point')
      .map((f) => (f.geometry as Point).coordinates);

    if (coords.length === 0) return;

    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);

    mapRef.current.fitBounds(
      [
        [Math.min(...lngs) - 0.5, Math.min(...lats) - 0.5],
        [Math.max(...lngs) + 0.5, Math.max(...lats) + 0.5],
      ],
      { padding: mini ? 30 : 60, duration: 800 }
    );
  }, [nodes, mini]);

  // ─── Event handlers ─────────────────────────

  const onHover = useCallback((e: MapLayerMouseEvent) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      const layerId = feature.layer?.id;
      if (layerId === 'nodes-circle') {
        setHoveredNodeId(feature.properties?.id ?? null);
      }
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = 'pointer';
      }
    }
  }, []);

  const onLeave = useCallback(() => {
    setHoveredNodeId(null);
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = '';
    }
  }, []);

  const onMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) {
        // Click on empty space — clear popups
        setNodePopup(null);
        setEdgePopup(null);
        return;
      }
      const feature = e.features[0];
      const layerId = feature.layer?.id;
      const props = feature.properties;

      if (layerId === 'nodes-circle') {
        const geom = feature.geometry as Point;
        const nodeName = props?.name ?? '';
        const connected = connectionsByName[nodeName];
        setEdgePopup(null);
        setNodePopup({
          longitude: geom.coordinates[0],
          latitude: geom.coordinates[1],
          name: nodeName,
          hierarchy: props?.hierarchy ?? '',
          nodeType: props?.nodeType ?? '',
          connectionCount: props?.connectionCount ?? 0,
          nodeId: props?.id ?? 0,
          connectedTo: connected ? [...connected].sort() : [],
        });
      } else if (layerId === 'edges-line') {
        // Edge click — show route info popup at click point
        setNodePopup(null);
        setEdgePopup({
          longitude: e.lngLat.lng,
          latitude: e.lngLat.lat,
          sourceName: props?.sourceName ?? '',
          targetName: props?.targetName ?? '',
          transportType: props?.transportType ?? '',
          distanceKm: Number(props?.distanceKm ?? 0),
          durationMinutes: Number(props?.durationMinutes ?? 0),
          costUsd: props?.costUsd ? Number(props.costUsd) : null,
          tips: props?.tips ?? null,
          gmapsLink: props?.gmapsLink ?? null,
          bidirectional: props?.bidirectional ?? false,
        });
      }
    },
    [connectionsByName]
  );

  const handlePopupNodeClick = useCallback(() => {
    if (nodePopup && onNodeClick) {
      onNodeClick(nodePopup.nodeId);
      setNodePopup(null);
    }
  }, [nodePopup, onNodeClick]);

  // ─── Build MapLibre expressions ────────────

  const edgeColorExpr: any = [
    'match',
    ['get', 'transportType'],
    ...Object.entries(TRANSPORT_COLORS).flat(),
    '#6b7280',
  ];

  const formatDuration = (min: number) => {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  // ─── Render ────────────────────────────────

  return (
    <div className={`relative ${className}`}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 100.5,
          latitude: 13.7,
          zoom: mini ? 6 : 5,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={['nodes-circle', 'edges-line']}
        onMouseMove={onHover}
        onMouseLeave={onLeave}
        onClick={onMapClick}
        attributionControl={mini ? false : undefined}
      >
        {!mini && <NavigationControl position="top-right" />}
        {!mini && <ScaleControl position="bottom-left" />}

        {/* ── Edge arcs (great-circle) ── */}
        <Source id="edges" type="geojson" data={arcEdges}>
          <Layer
            id="edges-line"
            type="line"
            paint={{
              'line-color': edgeColorExpr,
              'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                4, 1.5,
                8, 3,
              ],
              'line-opacity': highlightEdgeIds ? [
                'case',
                ['in', ['get', 'id'], ['literal', highlightEdgeIds]],
                0.9,
                0.15,
              ] : 0.6,
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
          {/* Direction arrows */}
          <Layer
            id="edges-arrow"
            type="symbol"
            layout={{
              'symbol-placement': 'line-center',
              'text-field': '▶',
              'text-size': 12,
              'text-rotation-alignment': 'map',
              'text-allow-overlap': true,
            }}
            paint={{
              'text-color': edgeColorExpr,
              'text-opacity': 0.8,
            }}
          />
        </Source>

        {/* ── Node circles ── */}
        <Source id="nodes" type="geojson" data={nodes}>
          {/* Glow for hovered/selected */}
          <Layer
            id="nodes-glow"
            type="circle"
            paint={{
              'circle-radius': [
                'case',
                ['any',
                  ['==', ['get', 'id'], hoveredNodeId ?? -1],
                  ['==', ['get', 'id'], selectedNodeId ?? -1],
                ],
                ['*', ['get', 'markerSize'], 1.6],
                0,
              ],
              'circle-color': '#f97316',
              'circle-opacity': 0.3,
              'circle-blur': 0.4,
            }}
          />
          {/* Pulse ring for selected node */}
          <Layer
            id="nodes-selected-ring"
            type="circle"
            paint={{
              'circle-radius': [
                'case',
                ['==', ['get', 'id'], selectedNodeId ?? -1],
                ['*', ['get', 'markerSize'], 2.2],
                0,
              ],
              'circle-color': 'transparent',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#f97316',
              'circle-opacity': 0.6,
            }}
          />
          {/* Main circle */}
          <Layer
            id="nodes-circle"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                4, ['*', ['get', 'markerSize'], 0.5],
                8, ['get', 'markerSize'],
              ],
              'circle-color': [
                'match',
                ['get', 'hierarchy'],
                'international_hub', '#f97316',
                'regional_hub', '#fb923c',
                'local_hub', '#fdba74',
                'micro_destination', '#fed7aa',
                '#f97316',
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.9,
            }}
          />
          {/* Labels */}
          <Layer
            id="nodes-label"
            type="symbol"
            layout={{
              'text-field': ['get', 'name'],
              'text-size': [
                'match',
                ['get', 'hierarchy'],
                'international_hub', 14,
                'regional_hub', 12,
                'local_hub', 11,
                'micro_destination', 10,
                11,
              ],
              'text-offset': [0, 1.8],
              'text-anchor': 'top',
              'text-max-width': 8,
              'text-optional': true,
            }}
            paint={{
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 1.5,
            }}
          />
        </Source>

        {/* ── Node popup ── */}
        {nodePopup && (
          <Popup
            longitude={nodePopup.longitude}
            latitude={nodePopup.latitude}
            closeOnClick={false}
            onClose={() => setNodePopup(null)}
            anchor="bottom"
            className="network-popup"
            maxWidth="280px"
          >
            <div className="p-2.5 min-w-[220px]">
              <h3 className="font-bold text-sm text-gray-900">{nodePopup.name}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                <span className="inline-block w-2 h-2 rounded-full" style={{
                  backgroundColor: HIERARCHY_COLOR[nodePopup.hierarchy] ?? '#f97316',
                }} />
                <span className="capitalize">{nodePopup.hierarchy.replace(/_/g, ' ')}</span>
                <span className="text-gray-300">·</span>
                <span>{nodePopup.connectionCount} connections</span>
              </div>

              {/* List connected destinations */}
              {nodePopup.connectedTo.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  <span className="font-medium text-gray-700">→ </span>
                  {nodePopup.connectedTo.slice(0, 6).join(', ')}
                  {nodePopup.connectedTo.length > 6 && (
                    <span className="text-gray-400"> +{nodePopup.connectedTo.length - 6} more</span>
                  )}
                </div>
              )}

              <div className="mt-2.5 flex gap-1.5">
                {onNodeClick && (
                  <button
                    onClick={handlePopupNodeClick}
                    className="flex-1 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded px-2 py-1.5 transition-colors"
                  >
                    View Connections
                  </button>
                )}
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(nodePopup.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Maps
                </a>
              </div>
            </div>
          </Popup>
        )}

        {/* ── Edge popup ── */}
        {edgePopup && (
          <Popup
            longitude={edgePopup.longitude}
            latitude={edgePopup.latitude}
            closeOnClick={false}
            onClose={() => setEdgePopup(null)}
            anchor="bottom"
            className="network-popup"
            maxWidth="260px"
          >
            <div className="p-2.5 min-w-[200px]">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-900">
                <span>{edgePopup.sourceName}</span>
                <span className="text-gray-400">{edgePopup.bidirectional ? '⇄' : '→'}</span>
                <span>{edgePopup.targetName}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 rounded font-medium capitalize"
                  style={{
                    backgroundColor: (TRANSPORT_COLORS[edgePopup.transportType] ?? '#6b7280') + '22',
                    color: TRANSPORT_COLORS[edgePopup.transportType] ?? '#6b7280',
                  }}
                >
                  {edgePopup.transportType}
                </span>
                <span className="text-gray-500">{edgePopup.distanceKm.toFixed(0)} km</span>
                <span className="text-gray-500">{formatDuration(edgePopup.durationMinutes)}</span>
                {edgePopup.costUsd && (
                  <span className="text-gray-500">${edgePopup.costUsd.toFixed(0)}</span>
                )}
              </div>
              {edgePopup.tips && (
                <p className="mt-1.5 text-xs text-gray-500 italic leading-snug">
                  💡 {edgePopup.tips}
                </p>
              )}
              {edgePopup.gmapsLink && (
                <a
                  href={edgePopup.gmapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Navigate in Google Maps
                </a>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* ── Legend overlay (hidden in mini mode) ── */}
      {!mini && (
        <div className="absolute bottom-8 right-3 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-xs text-white border border-white/10">
          <p className="font-semibold mb-2 text-white/90">Transport</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(TRANSPORT_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-0.5 rounded-full inline-block"
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize text-white/70">{type}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-white/10">
            <p className="font-semibold mb-1 text-white/90">Nodes</p>
            {Object.entries(HIERARCHY_SIZES).map(([h, size]) => (
              <div key={h} className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="rounded-full inline-block border border-white/60"
                  style={{
                    width: size * 0.7,
                    height: size * 0.7,
                    backgroundColor: HIERARCHY_COLOR[h] ?? '#f97316',
                  }}
                />
                <span className="text-white/70 capitalize">{h.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
