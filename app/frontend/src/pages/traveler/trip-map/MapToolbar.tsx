import { Link } from 'react-router-dom';
import { ArrowLeft, Network, Layers, Loader2 } from 'lucide-react';
import { getCountryFlag } from './constants';

interface Props {
  tripId: string;
  tripName: string;
  countryCode: string;
  cities: string[];
  activityCount: number;
  showNetwork: boolean;
  networkLoading: boolean;
  showControls: boolean;
  onToggleNetwork: () => void;
  onToggleControls: () => void;
}

export default function MapToolbar({
  tripId, tripName, countryCode, cities,
  activityCount, showNetwork, networkLoading,
  showControls, onToggleNetwork, onToggleControls,
}: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-surface-card border-b border-line shrink-0 z-20">
      <Link
        to={`/trips/${tripId}`}
        className="flex items-center gap-1.5 text-sm text-content-muted hover:text-content transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to trip
      </Link>
      <div className="h-4 w-px bg-line" />
      <span className="text-base">{countryCode ? getCountryFlag(countryCode) : '🌍'}</span>
      <h1 className="font-semibold text-content-heading text-sm truncate">{tripName}</h1>
      <span className="text-xs text-content-muted">
        {activityCount} locations · {cities?.join(', ') || ''}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onToggleNetwork}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showNetwork
              ? 'bg-primary-500/15 text-primary-400 ring-1 ring-primary-500/30'
              : 'bg-surface-subtle text-content-muted hover:bg-surface-hover'
          }`}
        >
          <Network className="h-3.5 w-3.5" />
          Transport Network
          {networkLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        </button>

        <button
          onClick={onToggleControls}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showControls
              ? 'bg-surface-subtle text-content hover:bg-surface-hover'
              : 'bg-surface-subtle text-content-muted hover:bg-surface-hover'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Places
        </button>
      </div>
    </div>
  );
}
