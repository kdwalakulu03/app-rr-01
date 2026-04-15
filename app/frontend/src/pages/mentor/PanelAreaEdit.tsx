// ─── Area edit panel tab ──────────────────────────
import { Trash2, Pentagon } from 'lucide-react';
import type { Area } from './canvas-types';
import { AREA_CATEGORIES } from './canvas-constants';

interface Props {
  area: Area | null;
  areaIdx: number | null;
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
  onDelete: () => void;
}

export default function PanelAreaEdit({ area, areaIdx, setAreas, onDelete }: Props) {
  if (!area) {
    return (
      <div className="text-center py-8">
        <Pentagon className="w-8 h-8 text-content-faint mx-auto mb-2" />
        <p className="text-sm text-content-muted">No area selected</p>
        <p className="text-xs text-content-faint">Click an area on the map or in the list</p>
      </div>
    );
  }

  const update = (patch: Partial<Area>) =>
    setAreas(prev => prev.map((a, i) => i === areaIdx ? { ...a, ...patch } : a));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-content-muted mb-1 block">Area Label</label>
        <input
          type="text"
          value={area.label}
          onChange={e => update({ label: e.target.value })}
          placeholder="e.g. Old Quarter walking zone"
          className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-content-heading placeholder:text-content-faint focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-content-muted mb-2 block">Category</label>
        <div className="grid grid-cols-2 gap-1.5">
          {AREA_CATEGORIES.map(cat => {
            const isActive = area.category === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => update({ category: cat.value, color: cat.color })}
                className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                  isActive ? 'ring-2 ring-emerald-500 bg-surface-hover' : 'hover:bg-surface-hover'
                }`}
              >
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-content-muted truncate">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-content-muted mb-1 block">Notes</label>
        <textarea
          value={area.notes}
          onChange={e => update({ notes: e.target.value })}
          placeholder="Describe this area..."
          rows={3}
          className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-content-heading placeholder:text-content-faint focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none resize-none"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-content-muted mb-1 block">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={area.color || '#10b981'}
            onChange={e => update({ color: e.target.value })}
            className="w-8 h-8 rounded border border-line cursor-pointer"
          />
          <span className="text-xs text-content-muted font-mono">{area.color || '#10b981'}</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-content-muted mb-1 block">Opacity ({Math.round((area.opacity ?? 0.2) * 100)}%)</label>
        <input
          type="range"
          min="0.05"
          max="0.8"
          step="0.05"
          value={area.opacity ?? 0.2}
          onChange={e => update({ opacity: parseFloat(e.target.value) })}
          className="w-full accent-emerald-500"
        />
      </div>

      <div className="text-xs text-content-faint pt-1 border-t border-line">
        {area.coordinates.length} vertices
      </div>

      <button
        onClick={onDelete}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete Area
      </button>
    </div>
  );
}
