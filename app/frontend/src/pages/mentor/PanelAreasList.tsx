// ─── Areas list panel tab ─────────────────────────
import { Pentagon, ChevronRight } from 'lucide-react';
import type { Area } from './canvas-types';
import { AREA_CATEGORIES } from './canvas-constants';
import type { MapRef } from 'react-map-gl/maplibre';

interface Props {
  areas: Area[];
  selectedAreaIdx: number | null;
  onSelectArea: (idx: number) => void;
  mapRef: React.RefObject<MapRef | null>;
}

export default function PanelAreasList({ areas, selectedAreaIdx, onSelectArea, mapRef }: Props) {
  if (areas.length === 0) {
    return (
      <div className="text-center py-8">
        <Pentagon className="w-8 h-8 text-content-faint mx-auto mb-2" />
        <p className="text-sm text-content-muted">No areas yet</p>
        <p className="text-xs text-content-faint">Select the Area tool and click the map to draw a polygon</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {areas.map((area, idx) => {
        const catMeta = AREA_CATEGORIES.find(c => c.value === area.category);
        return (
          <button
            key={idx}
            onClick={() => {
              onSelectArea(idx);
              if (area.coordinates.length > 0) {
                const lngs = area.coordinates.map(c => c[0]);
                const lats = area.coordinates.map(c => c[1]);
                const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
                const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
                mapRef.current?.flyTo({ center: [cLng, cLat], zoom: 13, duration: 800 });
              }
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
              selectedAreaIdx === idx ? 'bg-emerald-500/10' : 'hover:bg-surface-hover'
            }`}
          >
            <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: area.color || '#10b981', opacity: 0.8 }}>
              <Pentagon className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-content-heading truncate">
                {area.label || `Area ${idx + 1}`}
              </div>
              <div className="text-[10px] text-content-muted">{catMeta?.label || area.category} • {area.coordinates.length} pts</div>
            </div>
            <ChevronRight className="w-4 h-4 text-content-faint flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
