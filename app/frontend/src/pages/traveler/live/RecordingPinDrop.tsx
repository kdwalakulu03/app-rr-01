// ─── RecordingPinDrop — quick category picker overlay ───
import { X } from 'lucide-react';
import { PIN_CATEGORIES } from '../../mentor/canvas-constants';

interface Props {
  onSelect: (category: string) => void;
  onClose: () => void;
}

export default function RecordingPinDrop({ onSelect, onClose }: Props) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md mb-28 mx-4 bg-surface-card rounded-2xl shadow-2xl border border-line overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <h3 className="font-semibold text-content-heading">Drop a Pin</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
            <X className="w-4 h-4 text-content-muted" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4">
          {PIN_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => onSelect(cat.value)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-surface-hover transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <span className="text-xs text-content-body font-medium">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
