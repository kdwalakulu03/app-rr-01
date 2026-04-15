// ─── Pins list panel tab ──────────────────────────
import { MapPin, ChevronRight } from 'lucide-react';
import type { Pin } from './canvas-types';
import { getCategoryMeta } from './canvas-constants';
import type { MapRef } from 'react-map-gl/maplibre';

interface Props {
  pins: Pin[];
  selectedPinIdx: number | null;
  onSelectPin: (idx: number) => void;
  mapRef: React.RefObject<MapRef | null>;
}

export default function PanelPinsList({ pins, selectedPinIdx, onSelectPin, mapRef }: Props) {
  if (pins.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="w-8 h-8 text-content-faint mx-auto mb-2" />
        <p className="text-sm text-content-muted">No pins yet</p>
        <p className="text-xs text-content-faint">Select the Pin tool and click the map</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pins.map((pin, idx) => {
        const meta = getCategoryMeta(pin.category);
        const Icon = meta.icon;
        return (
          <button
            key={idx}
            onClick={() => {
              onSelectPin(idx);
              mapRef.current?.flyTo({ center: [pin.lng, pin.lat], zoom: 14, duration: 800 });
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
              selectedPinIdx === idx ? 'bg-emerald-500/10' : 'hover:bg-surface-hover'
            }`}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: meta.color }}>
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-content-heading truncate">
                {pin.title || `Pin ${idx + 1}`}
              </div>
              <div className="text-[10px] text-content-muted">{meta.label} • Day {pin.dayNumber || '?'}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-content-faint flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
