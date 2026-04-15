import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, X, Sparkles, Search, Plus, Check, ChevronRight } from 'lucide-react';
import { api } from '../../../lib/api';
import { StepProps, NominatimResult, PlaceFormData } from './types';

interface CitiesStepProps extends StepProps {
  isLocked: boolean;
}

export default function CitiesStep({ data, onUpdate, isLocked }: CitiesStepProps) {
  const [customCity, setCustomCity] = useState('');
  const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([]);
  const [nominatimLoading, setNominatimLoading] = useState(false);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [placeForm, setPlaceForm] = useState<PlaceFormData>({
    name: '', latitude: 0, longitude: 0, city: '',
    mainCategory: 'attractions', subCategory: '', description: '', website: '',
  });
  const [placeSaving, setPlaceSaving] = useState(false);
  const [placeSaved, setPlaceSaved] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: citiesData, isLoading } = useQuery({
    queryKey: ['placeCities', data.countryCode],
    queryFn: () => api.getPlaceCities(data.countryCode),
    enabled: !!data.countryCode && !isLocked,
  });

  const availableCities = (citiesData?.cities || []).slice(0, 20);

  if (isLocked) {
    return (
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Destinations ✨</h2>
        <p className="text-content-muted mb-6">The route includes curated destinations</p>

        <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl">
          <p className="text-primary-600">
            <Sparkles className="h-4 w-4 inline mr-1" />
            Your route has pre-planned destinations. You'll visit the best spots!
          </p>
        </div>
      </div>
    );
  }

  const toggleCity = (cityName: string) => {
    const newCities = data.cities.includes(cityName)
      ? data.cities.filter(c => c !== cityName)
      : [...data.cities, cityName];
    onUpdate({ cities: newCities });
  };

  // ── Nominatim search ──
  const searchNominatim = (query: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 2) { setNominatimResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setNominatimLoading(true);
      try {
        const cc = data.countryCode.toLowerCase();
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=${cc}&format=json&limit=6&addressdetails=1`,
          { headers: { 'User-Agent': 'RoamRicher/1.0' } }
        );
        const results: NominatimResult[] = await res.json();
        setNominatimResults(results);
      } catch {
        setNominatimResults([]);
      }
      setNominatimLoading(false);
    }, 350);
  };

  const selectNominatimResult = (result: NominatimResult) => {
    const cityName = result.address?.city || result.address?.town || result.address?.village || result.display_name.split(',')[0];
    if (!data.cities.includes(cityName)) {
      onUpdate({ cities: [...data.cities, cityName] });
    }
    setCustomCity('');
    setNominatimResults([]);
  };

  const addCustomCity = () => {
    if (customCity.trim() && !data.cities.includes(customCity.trim())) {
      onUpdate({ cities: [...data.cities, customCity.trim()] });
      setCustomCity('');
      setNominatimResults([]);
    }
  };

  // ── Pick from Nominatim into Place form ──
  const populateFormFromNominatim = (result: NominatimResult) => {
    setPlaceForm((prev) => ({
      ...prev,
      name: result.display_name.split(',')[0],
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      city: result.address?.city || result.address?.town || result.address?.village || '',
    }));
    setCustomCity('');
    setNominatimResults([]);
  };

  // ── Save user place ──
  const saveUserPlace = async () => {
    if (!placeForm.name || !placeForm.latitude || !placeForm.longitude) return;
    setPlaceSaving(true);
    try {
      await api.createUserPlace({
        name: placeForm.name,
        latitude: placeForm.latitude,
        longitude: placeForm.longitude,
        countryCode: data.countryCode,
        city: placeForm.city || undefined,
        mainCategory: placeForm.mainCategory,
        subCategory: placeForm.subCategory || undefined,
        description: placeForm.description || undefined,
        website: placeForm.website || undefined,
      });
      // Also add the city to trip destinations if not there
      const cityName = placeForm.city || placeForm.name;
      if (!data.cities.includes(cityName)) {
        onUpdate({ cities: [...data.cities, cityName] });
      }
      setPlaceSaved(true);
      setTimeout(() => { setPlaceSaved(false); setShowAddPlace(false); }, 1500);
      setPlaceForm({ name: '', latitude: 0, longitude: 0, city: '', mainCategory: 'attractions', subCategory: '', description: '', website: '' });
    } catch (err) {
      console.error('Failed to save place:', err);
    }
    setPlaceSaving(false);
  };

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Which places in {data.country}?</h2>
      <p className="text-content-muted mb-6">Select cities or regions to visit</p>

      {data.cities.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-content mb-2">Your destinations ({data.cities.length})</label>
          <div className="flex flex-wrap gap-2">
            {data.cities.map((city) => (
              <span key={city} className="inline-flex items-center gap-1 px-3 py-2 bg-primary-500/15 text-primary-600 rounded-full font-medium">
                <MapPin className="w-4 h-4" />
                {city}
                <button onClick={() => toggleCity(city)} className="ml-1 hover:bg-primary-500/20 rounded-full p-0.5">
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : availableCities.length > 0 ? (
        <div className="mb-6">
          <label className="block text-sm font-medium text-content mb-2">🔥 Top cities ({availableCities.length})</label>
          <div className="flex flex-wrap gap-2">
            {availableCities.map((city) => (
              <button
                key={city.city}
                type="button"
                onClick={() => toggleCity(city.city)}
                className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                  data.cities.includes(city.city)
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-line hover:border-primary-500/40 hover:bg-primary-500/10'
                }`}
              >
                {city.city}
                <span className="text-xs ml-1 opacity-70">({city.placeCount})</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Search with autocomplete ── */}
      <div className="relative mb-4">
        <label className="block text-sm font-medium text-content mb-2">Search places</label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
            <input
              type="text"
              value={customCity}
              onChange={(e) => { setCustomCity(e.target.value); searchNominatim(e.target.value); }}
              onKeyDown={(e) => e.key === 'Enter' && addCustomCity()}
              placeholder={`Search in ${data.country}...`}
              className="w-full pl-10 pr-4 py-3 border-2 border-line rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-surface"
            />
            {nominatimLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={addCustomCity}
            disabled={!customCity.trim()}
            className="px-4 py-3 bg-surface-subtle hover:bg-surface-hover rounded-xl transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Nominatim dropdown */}
        {nominatimResults.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface-card border border-line rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
            {nominatimResults.map((r) => (
              <button
                key={r.place_id}
                className="w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors border-b border-line last:border-0"
                onClick={() => selectNominatimResult(r)}
              >
                <div className="font-medium text-sm text-content">{r.display_name.split(',')[0]}</div>
                <div className="text-xs text-content-muted truncate">{r.display_name}</div>
              </button>
            ))}
            <div className="px-4 py-2 bg-surface-subtle text-[10px] text-content-faint">
              Powered by OpenStreetMap Nominatim
            </div>
          </div>
        )}
      </div>

      {/* ── Add a Place (contribute) ── */}
      <div className="border border-dashed border-line rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAddPlace(!showAddPlace)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary-500" />
            <span className="text-sm font-medium text-content">Contribute a place</span>
            <span className="text-xs text-content-muted">— help fellow travelers!</span>
          </div>
          <ChevronRight className={`h-4 w-4 text-content-muted transition-transform ${showAddPlace ? 'rotate-90' : ''}`} />
        </button>

        {showAddPlace && (
          <div className="px-4 pb-4 pt-2 border-t border-line space-y-3">
            <p className="text-xs text-content-muted">
              Know a hidden gem? Add it to our community database.
              Search above to auto-fill coordinates, or{' '}
              <a
                href={`https://www.google.com/maps/@${data.countryCode === 'TH' ? '13.75,100.5' : '0,0'},6z`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:underline"
              >
                find it on Google Maps ↗
              </a>{' '}
              and paste the details.
            </p>

            {/* Quick fill from search */}
            {nominatimResults.length > 0 && (
              <div className="bg-surface-subtle rounded-lg p-2">
                <p className="text-[10px] font-medium text-content-muted mb-1">Pick from search to auto-fill:</p>
                <div className="flex flex-wrap gap-1">
                  {nominatimResults.slice(0, 3).map((r) => (
                    <button
                      key={r.place_id}
                      onClick={() => populateFormFromNominatim(r)}
                      className="text-xs px-2 py-1 bg-surface-card border border-line rounded-lg hover:border-primary-500/40 transition-colors"
                    >
                      📍 {r.display_name.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-content mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={placeForm.name}
                  onChange={(e) => setPlaceForm({ ...placeForm, name: e.target.value })}
                  placeholder="e.g. Sunset Beach"
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content mb-1">City</label>
                <input
                  type="text"
                  value={placeForm.city}
                  onChange={(e) => setPlaceForm({ ...placeForm, city: e.target.value })}
                  placeholder="e.g. Krabi"
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content mb-1">
                  Latitude <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={placeForm.latitude || ''}
                  onChange={(e) => setPlaceForm({ ...placeForm, latitude: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 7.8804"
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content mb-1">
                  Longitude <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={placeForm.longitude || ''}
                  onChange={(e) => setPlaceForm({ ...placeForm, longitude: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 98.3923"
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content mb-1">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={placeForm.mainCategory}
                  onChange={(e) => setPlaceForm({ ...placeForm, mainCategory: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500"
                >
                  <option value="attractions">Attraction</option>
                  <option value="food_drink">Food & Drink</option>
                  <option value="nature">Nature</option>
                  <option value="culture">Culture</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="activities">Activities</option>
                  <option value="wellness">Wellness</option>
                  <option value="shopping">Shopping</option>
                  <option value="nightlife">Nightlife</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-content mb-1">Website</label>
                <input
                  type="url"
                  value={placeForm.website}
                  onChange={(e) => setPlaceForm({ ...placeForm, website: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-content mb-1">Description</label>
              <textarea
                value={placeForm.description}
                onChange={(e) => setPlaceForm({ ...placeForm, description: e.target.value })}
                placeholder="What makes this place special? Any tips for visitors?"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-content-faint">
                Saved as community contribution · source: user
              </span>
              <button
                type="button"
                onClick={saveUserPlace}
                disabled={!placeForm.name || !placeForm.latitude || !placeForm.longitude || placeSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {placeSaved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved!
                  </>
                ) : placeSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Place
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
