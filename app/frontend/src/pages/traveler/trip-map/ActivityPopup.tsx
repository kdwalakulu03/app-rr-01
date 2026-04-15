import { Loader2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORY_CONFIG, PRICE_LABELS, type PopupState, type EnrichedActivity } from './constants';
import type { Place } from '../../../lib/api';

interface Props extends PopupState {
  activity: EnrichedActivity;
  onFlyToPlace: (place: Place) => void;
}

export default function ActivityPopup({
  activity, popupDetails, popupNearby, popupLoading,
  showNearby, setShowNearby, onFlyToPlace,
}: Props) {
  return (
    <div className="p-3 max-w-[320px]">
      <div className="font-semibold text-sm text-gray-900">{activity.name}</div>
      {activity.placeName && activity.placeName !== activity.name && (
        <div className="text-xs text-gray-500 mt-0.5">{activity.placeName}</div>
      )}
      <div className="flex items-center flex-wrap gap-1.5 mt-1">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700">
          Day {activity._dayNumber}
        </span>
        {activity.category && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
            {CATEGORY_CONFIG[activity.category]?.icon}
            <span className="capitalize">{activity.category.replace(/_/g, ' ')}</span>
          </span>
        )}
      </div>

      {/* Fetched place details */}
      {popupDetails && (
        <div className="mt-2 space-y-1">
          {(popupDetails.rating > 0 || popupDetails.priceLevel) && (
            <div className="flex items-center gap-2 text-xs">
              {popupDetails.rating > 0 && (
                <span className="text-gray-700">⭐ {popupDetails.rating}{popupDetails.reviewCount ? ` (${popupDetails.reviewCount})` : ''}</span>
              )}
              {popupDetails.priceLevel && (
                <span className="text-green-700 font-medium">{PRICE_LABELS[popupDetails.priceLevel] || ''}</span>
              )}
              {popupDetails.source === 'user' && (
                <span className="px-1 py-0.5 rounded bg-purple-50 text-purple-600 text-[9px] font-semibold">Community</span>
              )}
            </div>
          )}
          {popupDetails.description && (
            <p className="text-xs text-gray-600 line-clamp-2">{popupDetails.description}</p>
          )}
          {(popupDetails.website || popupDetails.phone) && (
            <div className="flex items-center gap-3 text-xs">
              {popupDetails.website && (
                <a href={popupDetails.website} target="_blank" rel="noopener noreferrer"
                  className="text-blue-500 hover:underline inline-flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Website
                </a>
              )}
              {popupDetails.phone && <span className="text-gray-500">📞 {popupDetails.phone}</span>}
            </div>
          )}
          {popupDetails.address && (
            <div className="text-[11px] text-gray-500">📍 {popupDetails.address}</div>
          )}
          {popupDetails.openingHours && (
            <div className="text-[11px] text-gray-500">🕐 {popupDetails.openingHours}</div>
          )}
        </div>
      )}

      {!popupDetails && activity.description && (
        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{activity.description}</p>
      )}

      {popupLoading && (
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading details…
        </div>
      )}

      {/* Nearby places */}
      {popupNearby.length > 0 && (
        <NearbyList
          places={popupNearby}
          showNearby={showNearby}
          setShowNearby={setShowNearby}
          onFlyToPlace={onFlyToPlace}
        />
      )}
    </div>
  );
}

// ── Shared nearby list (also used by PlacePopup) ──
export function NearbyList({ places, showNearby, setShowNearby, onFlyToPlace }: {
  places: Place[];
  showNearby: boolean;
  setShowNearby: (v: boolean) => void;
  onFlyToPlace: (place: Place) => void;
}) {
  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
      <button
        onClick={() => setShowNearby(!showNearby)}
        className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 hover:text-gray-600"
      >
        Nearby {showNearby ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {showNearby && (
        <div className="space-y-0.5">
          {places.map((p) => (
            <button
              key={p.id}
              onClick={() => onFlyToPlace(p)}
              className="w-full flex items-center gap-2 text-xs text-left hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: CATEGORY_CONFIG[p.mainCategory || '']?.markerColor || '#9ca3af' }}
              />
              <span className="flex-1 truncate text-gray-700">{p.name}</span>
              {p.rating > 0 && <span className="text-gray-400 text-[10px]">⭐{p.rating}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
