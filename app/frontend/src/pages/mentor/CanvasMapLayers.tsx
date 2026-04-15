// ─── Map layers + markers for MentorCanvas ────────
import { Source, Layer, Marker } from 'react-map-gl/maplibre';
import type { Pin } from './canvas-types';
import { getCategoryMeta } from './canvas-constants';

interface CanvasMapLayersProps {
  // GeoJSON sources
  segmentsGeoJSON: GeoJSON.FeatureCollection;
  drawPreviewGeoJSON: GeoJSON.FeatureCollection;
  areasGeoJSON: GeoJSON.FeatureCollection;
  areaDrawPreviewGeoJSON: GeoJSON.FeatureCollection;

  // Active tool state
  activeTool: string;
  routeDrawPoints: [number, number][];
  areaDrawPoints: [number, number][];

  // Pins
  pins: Pin[];
  selectedPinIdx: number | null;
  onPinClick: (idx: number) => void;
}

export default function CanvasMapLayers({
  segmentsGeoJSON, drawPreviewGeoJSON, areasGeoJSON, areaDrawPreviewGeoJSON,
  activeTool, routeDrawPoints, areaDrawPoints,
  pins, selectedPinIdx, onPinClick,
}: CanvasMapLayersProps) {
  return (
    <>
      {/* Rendered segments */}
      <Source id="segments" type="geojson" data={segmentsGeoJSON}>
        <Layer
          id="segments-line"
          type="line"
          paint={{ 'line-color': '#10b981', 'line-width': 4, 'line-opacity': 0.8 }}
        />
      </Source>

      {/* Route draw preview (straight lines while drawing) */}
      {activeTool === 'route' && (
        <Source id="draw-preview" type="geojson" data={drawPreviewGeoJSON}>
          <Layer
            id="draw-preview-line"
            type="line"
            paint={{ 'line-color': '#6366f1', 'line-width': 2, 'line-dasharray': [4, 3], 'line-opacity': 0.6 }}
          />
        </Source>
      )}

      {/* Saved area polygons — fill + outline */}
      <Source id="areas-fill" type="geojson" data={areasGeoJSON}>
        <Layer
          id="areas-fill-layer"
          type="fill"
          paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'] }}
        />
        <Layer
          id="areas-outline-layer"
          type="line"
          paint={{ 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.7 }}
        />
      </Source>

      {/* Area draw preview (in-progress polygon) */}
      {activeTool === 'area' && areaDrawPoints.length >= 2 && (
        <Source id="area-draw-preview" type="geojson" data={areaDrawPreviewGeoJSON}>
          <Layer
            id="area-draw-preview-fill"
            type="fill"
            paint={{ 'fill-color': '#10b981', 'fill-opacity': 0.15 }}
          />
          <Layer
            id="area-draw-preview-outline"
            type="line"
            paint={{ 'line-color': '#10b981', 'line-width': 2, 'line-dasharray': [4, 3], 'line-opacity': 0.7 }}
          />
        </Source>
      )}

      {/* Pin markers */}
      {pins.map((pin, idx) => {
        const meta = getCategoryMeta(pin.category);
        const Icon = meta.icon;
        const isSelected = selectedPinIdx === idx;
        return (
          <Marker
            key={idx}
            longitude={pin.lng}
            latitude={pin.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onPinClick(idx);
            }}
          >
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full shadow-lg cursor-pointer transition-transform ${isSelected ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
              style={{ backgroundColor: meta.color }}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
            {pin.title && (
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-content-heading bg-surface-card/90 px-1.5 py-0.5 rounded shadow">
                {pin.title}
              </div>
            )}
          </Marker>
        );
      })}

      {/* Route draw waypoint dots */}
      {activeTool === 'route' && routeDrawPoints.map(([lng, lat], idx) => (
        <Marker key={`rp-${idx}`} longitude={lng} latitude={lat} anchor="center">
          <div className="w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow" />
        </Marker>
      ))}

      {/* Area draw vertex dots */}
      {activeTool === 'area' && areaDrawPoints.map(([lng, lat], idx) => (
        <Marker key={`ap-${idx}`} longitude={lng} latitude={lat} anchor="center">
          <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
        </Marker>
      ))}
    </>
  );
}
