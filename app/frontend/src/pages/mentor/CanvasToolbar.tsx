// ─── Left toolbar for MentorCanvas ─────────────────
import {
  MapPin, Route, MousePointer2, Save, Pentagon,
} from 'lucide-react';
import type { Tool } from './canvas-types';

interface CanvasToolbarProps {
  activeTool: Tool;
  setActiveTool: (t: Tool) => void;
  pinsCount: number;
  segmentsCount: number;
  areasCount: number;
  areaDrawPointsCount: number;
  saving: boolean;
  canSave: boolean;
  onFinishArea: () => void;
  onSave: () => void;
  onClearRouteDrawPoints: () => void;
  onClearAreaDrawPoints: () => void;
}

export default function CanvasToolbar({
  activeTool, setActiveTool,
  pinsCount, segmentsCount, areasCount,
  areaDrawPointsCount, saving, canSave,
  onFinishArea, onSave,
  onClearRouteDrawPoints, onClearAreaDrawPoints,
}: CanvasToolbarProps) {
  return (
    <div className="w-14 bg-surface-card border-r border-line flex flex-col items-center py-3 gap-1 z-10">
      <ToolButton
        icon={MousePointer2}
        label="Select"
        active={activeTool === 'select'}
        onClick={() => setActiveTool('select')}
      />
      <ToolButton
        icon={MapPin}
        label="Pin"
        active={activeTool === 'pin'}
        onClick={() => setActiveTool('pin')}
      />
      <ToolButton
        icon={Route}
        label="Route"
        active={activeTool === 'route'}
        onClick={() => {
          setActiveTool('route');
          onClearRouteDrawPoints();
        }}
      />
      <ToolButton
        icon={Pentagon}
        label="Area"
        active={activeTool === 'area'}
        onClick={() => {
          setActiveTool('area');
          onClearAreaDrawPoints();
        }}
      />
      <div className="flex-1" />

      {/* Stats */}
      <div className="text-center px-1 mb-2">
        <div className="text-xs text-content-muted">{pinsCount}</div>
        <div className="text-[10px] text-content-faint">pins</div>
      </div>
      <div className="text-center px-1 mb-2">
        <div className="text-xs text-content-muted">{segmentsCount}</div>
        <div className="text-[10px] text-content-faint">segs</div>
      </div>
      <div className="text-center px-1 mb-2">
        <div className="text-xs text-content-muted">{areasCount}</div>
        <div className="text-[10px] text-content-faint">areas</div>
      </div>

      <div className="border-t border-line w-full pt-2 flex flex-col items-center gap-1">
        {activeTool === 'area' && areaDrawPointsCount >= 3 && (
          <ToolButton icon={Pentagon} label="Finish Area" onClick={onFinishArea} accent />
        )}
        <ToolButton
          icon={Save}
          label="Save"
          onClick={onSave}
          accent
          disabled={saving || !canSave}
        />
      </div>
    </div>
  );
}

// ─── Reusable toolbar button ─────────────────────
export function ToolButton({ icon: Icon, label, active, onClick, accent, disabled }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
  accent?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
        disabled ? 'opacity-40 cursor-not-allowed' :
        active ? 'bg-emerald-500/20 text-emerald-500' :
        accent ? 'bg-emerald-500 text-white hover:bg-emerald-600' :
        'text-content-muted hover:bg-surface-hover hover:text-content'
      }`}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}
