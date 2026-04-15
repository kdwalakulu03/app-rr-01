// ─── Pin edit panel tab ───────────────────────────
import { Trash2 } from 'lucide-react';
import { MapPin } from 'lucide-react';
import type { Pin } from './canvas-types';
import { PIN_CATEGORIES } from './canvas-constants';

interface Props {
  pin: Pin | null;
  pinIdx: number | null;
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>;
  onDelete: () => void;
}

export default function PanelPinEdit({ pin, pinIdx, setPins, onDelete }: Props) {
  if (!pin) {
    return (
      <div className="text-center py-8">
        <MapPin className="w-8 h-8 text-content-faint mx-auto mb-2" />
        <p className="text-sm text-content-muted">No pin selected</p>
        <p className="text-xs text-content-faint">Click a pin on the map or in the list</p>
      </div>
    );
  }

  const update = (patch: Partial<Pin>) =>
    setPins(prev => prev.map((p, i) => i === pinIdx ? { ...p, ...patch } : p));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-content-muted mb-1 block">Pin Title</label>
        <input
          type="text"
          value={pin.title}
          onChange={e => update({ title: e.target.value })}
          placeholder="e.g. Best Phở in Hanoi"
          className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-content-heading placeholder:text-content-faint focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-content-muted mb-2 block">Category</label>
        <div className="grid grid-cols-4 gap-1.5">
          {PIN_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = pin.category === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => update({ category: cat.value })}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-lg text-[10px] transition-colors ${
                  isActive ? 'ring-2 ring-emerald-500 bg-surface-hover' : 'hover:bg-surface-hover'
                }`}
                title={cat.label}
              >
                <Icon className="w-4 h-4" style={{ color: cat.color }} />
                <span className="text-content-muted truncate w-full text-center">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-content-muted mb-1 block">Notes</label>
        <textarea
          value={pin.notes}
          onChange={e => update({ notes: e.target.value })}
          placeholder="What makes this place special?"
          rows={3}
          className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-content-heading placeholder:text-content-faint focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none resize-none"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-content-muted mb-1 block">Tips</label>
        <textarea
          value={pin.tips}
          onChange={e => update({ tips: e.target.value })}
          placeholder="Practical tips for the next traveler..."
          rows={2}
          className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-content-heading placeholder:text-content-faint focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none resize-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-medium text-content-muted mb-1 block">Cost (USD)</label>
          <input
            type="number"
            value={pin.costUsd}
            onChange={e => update({ costUsd: e.target.value })}
            placeholder="5"
            className="w-full bg-surface border border-line rounded-lg px-2 py-1.5 text-sm text-content-heading focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-content-muted mb-1 block">Duration</label>
          <input
            type="number"
            value={pin.durationMinutes}
            onChange={e => update({ durationMinutes: e.target.value })}
            placeholder="30 min"
            className="w-full bg-surface border border-line rounded-lg px-2 py-1.5 text-sm text-content-heading focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-content-muted mb-1 block">Day #</label>
          <input
            type="number"
            value={pin.dayNumber}
            onChange={e => update({ dayNumber: e.target.value })}
            placeholder="1"
            min={1}
            className="w-full bg-surface border border-line rounded-lg px-2 py-1.5 text-sm text-content-heading focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-content-muted mb-1 block">Best Time</label>
        <select
          value={pin.timeOfDay}
          onChange={e => update({ timeOfDay: e.target.value })}
          className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-content-heading focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
        >
          <option value="anytime">Anytime</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
          <option value="night">Night</option>
        </select>
      </div>

      <button
        onClick={onDelete}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete Pin
      </button>
    </div>
  );
}
