import { Loader2, ExternalLink } from 'lucide-react';
import { CATEGORY_CONFIG, PRICE_LABELS, type PopupState } from './constants';
import { NearbyList } from './ActivityPopup';
import type { Place } from '../../../lib/api';

interface Props extends PopupState {
  place: Place;
  onFlyToPlace: (place: Place) => void;
}

export default function PlacePopup({
  place, popupDetails, popupNearby, popupLoading,
  showNearby, setShowNearby, onFlyToPlace,
}: Props) {
  return (
    <div className="p-3 max-w-[320px]">
      <div className="font-semibold text-sm text-gray-900">
        {popupDetails?.name || place.name}
      </div>
      <div className="flex items-center flex-wrap gap-1.5 mt-1">
        {(popupDetails?.mainCategory || place.mainCategory) && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
            {CATEGORY_CONFIG[popupDetails?.mainCategory || place.mainCategory || '']?.icon}
            <span className="capitalize">{(popupDetails?.mainCategory || place.mainCategory || '').replace(/_/g, ' ')}</span>
          </span>
        )}
        {(popupDetails?.city || place.city) && (
          <span className="text-xs text-gray-500">{popupDetails?.city || place.city}</span>
        )}
      </div>

      {/* Rating + price + source */}
      {((popupDetails?.rating ?? place.rating) > 0 || popupDetails?.priceLevel) && (
        <div className="flex items-center gap-2 mt-1.5 text-xs">
          {(popupDetails?.rating ?? place.rating) > 0 && (
            <span className="text-gray-700">
              ⭐ {popupDetails?.rating ?? place.rating}
              {popupDetails?.reviewCount ? ` (${popupDetails.reviewCount})` : ''}
            </span>
          )}
          {popupDetails?.priceLevel && (
            <span className="text-green-700 font-medium">{PRICE_LABELS[popupDetails.priceLevel] || ''}</span>
          )}
          {popupDetails?.source === 'user' && (
            <span className="px-1 py-0.5 rounded bg-purple-50 text-purple-600 text-[9px] font-semibold">Community</span>
          )}
        </div>
      )}

      {/* Description */}
      {popupDetails?.description && (
        <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{popupDetails.description}</p>
      )}

      {/* Links */}
      {(popupDetails?.website || popupDetails?.phone) && (
        <div className="flex items-center gap-3 mt-1.5 text-xs">
          {popupDetails.website && (
            <a href={popupDetails.website} target="_blank" rel="noopener noreferrer"
              className="text-blue-500 hover:underline inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Website
            </a>
          )}
          {popupDetails.phone && <span className="text-gray-500">📞 {popupDetails.phone}</span>}
        </div>
      )}

      {popupDetails?.address && (
        <div className="text-[11px] text-gray-500 mt-1">📍 {popupDetails.address}</div>
      )}
      {popupDetails?.openingHours && (
        <div className="text-[11px] text-gray-500 mt-0.5">🕐 {popupDetails.openingHours}</div>
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
