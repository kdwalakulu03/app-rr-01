import {
  Utensils, Camera, Palette, Mountain, ShoppingBag, Moon, Heart, Zap, Bed,
} from 'lucide-react';
import type { Place, TripActivity } from '../../../lib/api';

// ── Map constants ──

export const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; markerColor: string; label: string }> = {
  food_drink:     { icon: <Utensils className="h-3.5 w-3.5" />, color: 'text-orange-400', markerColor: '#fb923c', label: 'Food & Drink' },
  attractions:    { icon: <Camera  className="h-3.5 w-3.5" />, color: 'text-blue-400',   markerColor: '#60a5fa', label: 'Attractions' },
  culture:        { icon: <Palette className="h-3.5 w-3.5" />, color: 'text-purple-400', markerColor: '#c084fc', label: 'Culture' },
  nature:         { icon: <Mountain className="h-3.5 w-3.5" />,color: 'text-green-400',  markerColor: '#4ade80', label: 'Nature' },
  activities:     { icon: <Zap     className="h-3.5 w-3.5" />, color: 'text-yellow-400', markerColor: '#facc15', label: 'Activities' },
  wellness:       { icon: <Heart   className="h-3.5 w-3.5" />, color: 'text-pink-400',   markerColor: '#f472b6', label: 'Wellness' },
  shopping:       { icon: <ShoppingBag className="h-3.5 w-3.5" />, color: 'text-cyan-400', markerColor: '#22d3ee', label: 'Shopping' },
  nightlife:      { icon: <Moon    className="h-3.5 w-3.5" />, color: 'text-indigo-400', markerColor: '#818cf8', label: 'Nightlife' },
  accommodation:  { icon: <Bed     className="h-3.5 w-3.5" />, color: 'text-teal-400',   markerColor: '#2dd4bf', label: 'Accommodation' },
};

export const PRICE_LABELS = ['', '$', '$$', '$$$', '$$$$'];

export const CONTRIBUTE_CATEGORIES = [
  'food_drink', 'attractions', 'culture', 'nature', 'activities',
  'wellness', 'shopping', 'nightlife', 'accommodation',
];

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    city?: string; town?: string; village?: string; state?: string; country?: string;
  };
}

export function getCountryFlag(code: string): string {
  const codePoints = code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/** TripActivity extended with its day number (for display in popups). */
export type EnrichedActivity = TripActivity & { _dayNumber: number };

/** Shared popup state for enriched place details + nearby. */
export interface PopupState {
  popupDetails: Place | null;
  popupNearby: Place[];
  popupLoading: boolean;
  showNearby: boolean;
  setShowNearby: (v: boolean) => void;
}
