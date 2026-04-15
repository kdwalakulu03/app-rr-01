import { useRef, useEffect, useState, useCallback } from 'react';
import {
  X, Sparkles, Search, Crosshair, Globe, Check, Loader2, Send,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { CATEGORY_CONFIG, CONTRIBUTE_CATEGORIES, NominatimResult } from './constants';
import type { MapRef } from 'react-map-gl/maplibre';

interface ContributeForm {
  name: string;
  latitude: number;
  longitude: number;
  city: string;
  mainCategory: string;
  subCategory: string;
  description: string;
  website: string;
}

interface Props {
  countryCode: string;
  userId: string | undefined;
  mapRef: React.RefObject<MapRef | null>;
  dropPinMode: boolean;
  contributeForm: ContributeForm;
  onDropPinModeToggle: () => void;
  onFormChange: (form: ContributeForm) => void;
  onClose: () => void;
  onSuccess: () => void;
  onNominatimPick: (lat: number, lng: number, name: string, city: string) => void;
}

export default function ContributePanel({
  countryCode, userId, mapRef,
  dropPinMode, contributeForm,
  onDropPinModeToggle, onFormChange, onClose, onSuccess, onNominatimPick,
}: Props) {
  const [contributeSearch, setContributeSearch] = useState('');
  const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([]);
  const [searchingNominatim, setSearchingNominatim] = useState(false);
  const [contributeSaving, setContributeSaving] = useState(false);
  const [contributeSuccess, setContributeSuccess] = useState(false);
  const nominatimTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Nominatim search ──
  useEffect(() => {
    if (!contributeSearch || contributeSearch.length < 3 || !countryCode) {
      setNominatimResults([]);
      return;
    }
    clearTimeout(nominatimTimer.current);
    nominatimTimer.current = setTimeout(async () => {
      setSearchingNominatim(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(contributeSearch)}&countrycodes=${countryCode}&format=json&limit=5&addressdetails=1`,
          { headers: { 'User-Agent': 'RoamRicher/1.0' } }
        );
        const data = await res.json();
        setNominatimResults(data || []);
      } catch {
        setNominatimResults([]);
      }
      setSearchingNominatim(false);
    }, 400);
    return () => clearTimeout(nominatimTimer.current);
  }, [contributeSearch, countryCode]);

  // ── Save contributed place ──
  const handleSave = useCallback(async () => {
    if (!contributeForm.name || !contributeForm.latitude || !contributeForm.longitude || !contributeForm.mainCategory) return;
    setContributeSaving(true);
    try {
      await api.createUserPlace({
        name: contributeForm.name,
        latitude: contributeForm.latitude,
        longitude: contributeForm.longitude,
        countryCode,
        city: contributeForm.city,
        mainCategory: contributeForm.mainCategory,
        subCategory: contributeForm.subCategory,
        description: contributeForm.description,
        website: contributeForm.website,
      });
      setContributeSuccess(true);
      setTimeout(() => {
        setContributeSuccess(false);
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Failed to save place:', err);
    }
    setContributeSaving(false);
  }, [contributeForm, countryCode, onSuccess]);

  return (
    <div className="absolute top-3 left-3 w-72 bg-surface-card/95 backdrop-blur-sm border border-line rounded-xl shadow-xl z-10 overflow-hidden max-h-[80vh] flex flex-col">
      <div className="px-3 py-2 border-b border-line flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-content-heading">Contribute a Place</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-surface-hover rounded text-content-muted">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        {!userId ? (
          <p className="text-xs text-content-muted text-center py-4">Sign in to contribute places</p>
        ) : contributeSuccess ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-400" />
            </div>
            <p className="text-sm font-medium text-content">Saved!</p>
            <p className="text-xs text-content-muted">Your place has been added</p>
          </div>
        ) : (
          <>
            {/* Search via Nominatim */}
            <div>
              <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">
                Search OSM
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-faint" />
                <input
                  type="text"
                  placeholder="Search for a place…"
                  value={contributeSearch}
                  onChange={(e) => setContributeSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-content"
                />
                {searchingNominatim && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-primary-500" />
                )}
              </div>
              {nominatimResults.length > 0 && (
                <div className="mt-1 border border-line rounded-lg overflow-hidden bg-surface-card max-h-40 overflow-y-auto">
                  {nominatimResults.map((r) => (
                    <button
                      key={r.place_id}
                      onClick={() => {
                        const city = r.address?.city || r.address?.town || r.address?.village || '';
                        const lat = parseFloat(r.lat);
                        const lng = parseFloat(r.lon);
                        onNominatimPick(lat, lng, r.display_name.split(',')[0], city);
                        mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
                        setNominatimResults([]);
                        setContributeSearch('');
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-surface-hover border-b border-line last:border-0 transition-colors"
                    >
                      <div className="font-medium text-content truncate">
                        {r.display_name.split(',')[0]}
                      </div>
                      <div className="text-[10px] text-content-muted truncate">
                        {r.display_name.split(',').slice(1, 3).join(',')}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Drop pin + Google Maps */}
            <div className="flex items-center gap-2">
              <button
                onClick={onDropPinModeToggle}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  dropPinMode
                    ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                    : 'bg-surface-subtle text-content-muted hover:bg-surface-hover'
                }`}
              >
                <Crosshair className="h-3.5 w-3.5" />
                {dropPinMode ? 'Click map…' : 'Drop Pin'}
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${contributeForm.latitude || ''},${contributeForm.longitude || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-content-muted bg-surface-subtle hover:bg-surface-hover transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                GMaps
              </a>
            </div>

            {/* Form fields */}
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">Name *</label>
                <input
                  type="text"
                  value={contributeForm.name}
                  onChange={(e) => onFormChange({ ...contributeForm, name: e.target.value })}
                  className="w-full mt-0.5 px-2.5 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg focus:ring-1 focus:ring-primary-500 text-content"
                  placeholder="Place name"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">Lat *</label>
                  <input
                    type="number" step="any"
                    value={contributeForm.latitude || ''}
                    onChange={(e) => onFormChange({ ...contributeForm, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-0.5 px-2 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg text-content"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">Lng *</label>
                  <input
                    type="number" step="any"
                    value={contributeForm.longitude || ''}
                    onChange={(e) => onFormChange({ ...contributeForm, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-0.5 px-2 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg text-content"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">Category *</label>
                <select
                  value={contributeForm.mainCategory}
                  onChange={(e) => onFormChange({ ...contributeForm, mainCategory: e.target.value })}
                  className="w-full mt-0.5 px-2.5 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg text-content"
                >
                  <option value="">Select…</option>
                  {CONTRIBUTE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_CONFIG[c]?.label || c.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">City</label>
                <input
                  type="text"
                  value={contributeForm.city}
                  onChange={(e) => onFormChange({ ...contributeForm, city: e.target.value })}
                  className="w-full mt-0.5 px-2.5 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg text-content"
                  placeholder="City name"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">Description</label>
                <textarea
                  value={contributeForm.description}
                  onChange={(e) => onFormChange({ ...contributeForm, description: e.target.value })}
                  className="w-full mt-0.5 px-2.5 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg text-content resize-none"
                  rows={2}
                  placeholder="What makes this place special?"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">Website</label>
                <input
                  type="url"
                  value={contributeForm.website}
                  onChange={(e) => onFormChange({ ...contributeForm, website: e.target.value })}
                  className="w-full mt-0.5 px-2.5 py-1.5 text-xs bg-surface-subtle border border-line rounded-lg text-content"
                  placeholder="https://…"
                />
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={contributeSaving || !contributeForm.name || !contributeForm.latitude || !contributeForm.mainCategory}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {contributeSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {contributeSaving ? 'Saving…' : 'Save Place'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
