// ─── AddActivityPanel — search + manual activity add ───
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, X, ChevronLeft, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import type { Place } from '../../../lib/api';
import { CATEGORY_META, DEFAULT_META, CATEGORIES } from './constants';
import type { ManualActivityData } from './constants';
import Button from '../../../components/ui/Button';

interface AddActivityPanelProps {
  tripId: number;
  dayNumber: number;
  onAdd: (place: Place) => void;
  onAddManual: (data: ManualActivityData) => void;
  onClose: () => void;
  isAdding: boolean;
}

export default function AddActivityPanel({ tripId, dayNumber, onAdd, onAddManual, onClose, isAdding }: AddActivityPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState<ManualActivityData>({
    name: '', category: 'attractions', startTime: '', durationMinutes: 60,
    description: '', placeName: '', latitude: '', longitude: '', estimatedCost: '',
  });

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['itinerary-search', tripId, searchQuery],
    queryFn: () => api.searchItineraryPlaces(tripId, { query: searchQuery, limit: 12 }),
    enabled: searchQuery.length >= 2,
    staleTime: 30000,
  });

  const { data: nearbyData } = useQuery({
    queryKey: ['nearby-places', tripId, dayNumber],
    queryFn: () => api.getNearbyPlacesForDay(tripId, { dayNumber, radius: 3000, limit: 10 }),
    staleTime: 60000,
  });

  const places = searchQuery.length >= 2 ? (searchResults?.places || []) : (nearbyData?.places || []);

  const setField = (field: keyof ManualActivityData, value: string | number) =>
    setManual(prev => ({ ...prev, [field]: value }));

  if (showManual) {
    return (
      <div className="lg:w-80 flex-shrink-0">
        <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden sticky top-16">
          <div className="p-4 border-b border-line-light flex items-center justify-between">
            <button onClick={() => setShowManual(false)} className="flex items-center gap-1 text-sm text-content-muted hover:text-content">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <h3 className="font-semibold text-content-heading">Add Manually</h3>
            <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded-lg">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {/* Name — required */}
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={manual.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="e.g. Wat Pho Temple"
                className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">Category</label>
              <select
                value={manual.category}
                onChange={e => setField('category', e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Time + Duration */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-content-muted mb-1">Start time</label>
                <input
                  type="time"
                  value={manual.startTime}
                  onChange={e => setField('startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content-muted mb-1">Duration (min)</label>
                <input
                  type="number"
                  value={manual.durationMinutes}
                  min={15} max={480} step={15}
                  onChange={e => setField('durationMinutes', parseInt(e.target.value) || 60)}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">Notes <span className="text-content-faint">(optional)</span></label>
              <input
                type="text"
                value={manual.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="Ticket price, tips, etc."
                className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
              />
            </div>

            {/* Estimated cost */}
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">Est. cost (USD) <span className="text-content-faint">(optional)</span></label>
              <input
                type="number"
                value={manual.estimatedCost}
                min={0} step={1}
                onChange={e => setField('estimatedCost', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
              />
            </div>

            {/* Lat/Lng — optional */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-content-muted mb-1">Latitude <span className="text-content-faint">(opt)</span></label>
                <input
                  type="text"
                  value={manual.latitude}
                  onChange={e => setField('latitude', e.target.value)}
                  placeholder="13.7563"
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content-muted mb-1">Longitude <span className="text-content-faint">(opt)</span></label>
                <input
                  type="text"
                  value={manual.longitude}
                  onChange={e => setField('longitude', e.target.value)}
                  placeholder="100.5018"
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
                />
              </div>
            </div>

            {/* Google Places tip */}
            <div className="bg-primary-500/10 rounded-lg p-3 text-xs text-content-muted">
              <p className="font-medium mb-1">💡 Get coordinates from Google Maps</p>
              <p className="text-content-muted">Right-click any location on <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="underline text-primary-500">maps.google.com</a> → copy the lat/lng shown at the top of the menu.</p>
            </div>
          </div>

          <div className="p-4 border-t border-line-light">
            <Button
              onClick={() => { if (manual.name.trim()) { onAddManual(manual); } }}
              disabled={!manual.name.trim() || isAdding}
              loading={isAdding}
              icon={!isAdding ? <Plus className="h-4 w-4" /> : undefined}
              size="sm"
              className="w-full"
            >
              Add to Itinerary
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:w-80 flex-shrink-0">
      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden sticky top-16">
        <div className="p-4 border-b border-line-light">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-content-heading">Add Activity</h3>
            <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded-lg">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-faint" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places..."
              className="w-full pl-9 pr-4 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {searching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-content-faint" />
            </div>
          )}

          {!searching && places.length === 0 && searchQuery.length >= 2 && (
            <div className="text-center py-8 text-content-faint text-sm">No places found</div>
          )}

          {!searching && searchQuery.length < 2 && places.length === 0 && (
            <div className="text-center py-8 text-content-faint text-sm">
              Search or browse nearby places
            </div>
          )}

          {!searching && places.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-content-faint uppercase tracking-wider bg-surface">
                {searchQuery.length >= 2 ? 'Search Results' : 'Nearby Places'}
              </div>
              {places.map((place: any) => {
                const pm = CATEGORY_META[place.mainCategory] || DEFAULT_META;
                return (
                  <button
                    key={place.id}
                    onClick={() => onAdd(place)}
                    disabled={isAdding}
                    className="w-full px-4 py-3 text-left hover:bg-surface-hover border-b border-gray-50 last:border-0 transition-colors disabled:opacity-60"
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${pm.bg}`}>
                        <span className={pm.color}>{pm.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{place.name}</div>
                        <div className="flex items-center gap-2 text-xs text-content-faint">
                          {place.city && <span>{place.city}</span>}
                          {place.rating && <span>⭐ {Number(place.rating).toFixed(1)}</span>}
                          {place.distanceMeters && <span>{(Number(place.distanceMeters) / 1000).toFixed(1)} km</span>}
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-content-faint flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Manual entry button */}
        <div className="border-t border-line-light p-3">
          <button
            onClick={() => setShowManual(true)}
            className="w-full py-2 text-sm text-primary-600 hover:text-primary-600 hover:bg-primary-500/10 rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add activity manually
          </button>
        </div>
      </div>
    </div>
  );
}
