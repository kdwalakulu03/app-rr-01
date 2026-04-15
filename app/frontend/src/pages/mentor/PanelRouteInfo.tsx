// ─── Route Info panel tab ─────────────────────────
import type { RouteData } from './canvas-types';

interface Props {
  routeData: RouteData;
  setRouteData: React.Dispatch<React.SetStateAction<RouteData>>;
  routeId: number | null;
}

export default function PanelRouteInfo({ routeData, setRouteData, routeId }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-content-muted mb-1 block">Route Title</label>
        <input
          type="text"
          value={routeData.title}
          onChange={e => setRouteData(d => ({ ...d, title: e.target.value }))}
          placeholder="e.g. Hanoi to Ho Chi Minh — 3 weeks backpacking"
          className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-content-heading placeholder:text-content-faint focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-content-muted mb-1 block">Description</label>
        <textarea
          value={routeData.description}
          onChange={e => setRouteData(d => ({ ...d, description: e.target.value }))}
          placeholder="Share the story of your trip..."
          rows={4}
          className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-content-heading placeholder:text-content-faint focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-content-muted mb-1 block">Country</label>
          <input
            type="text"
            value={routeData.countryCode}
            onChange={e => setRouteData(d => ({ ...d, countryCode: e.target.value.toUpperCase().slice(0, 2) }))}
            placeholder="VN"
            maxLength={2}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-content-heading uppercase focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-content-muted mb-1 block">Difficulty</label>
          <select
            value={routeData.difficulty}
            onChange={e => setRouteData(d => ({ ...d, difficulty: e.target.value }))}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-content-heading focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
          >
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="challenging">Challenging</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-content-muted mb-1 block">Travel Style</label>
        <select
          value={routeData.travelStyle}
          onChange={e => setRouteData(d => ({ ...d, travelStyle: e.target.value }))}
          className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-content-heading focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
        >
          <option value="backpacker">Backpacker</option>
          <option value="mid-range">Mid-Range</option>
          <option value="luxury">Luxury</option>
          <option value="adventure">Adventure</option>
        </select>
      </div>
      {routeId && (
        <div className="text-xs text-content-faint pt-2 border-t border-line">
          Route ID: {routeId} • Draft
        </div>
      )}
    </div>
  );
}
