// ─── MentorCanvas constants ──────────────────────
import {
  MapPin, Utensils, Hotel, Bus, Gem, AlertTriangle, Camera, Footprints,
  Palette, Moon, ShoppingBag, Trees,
} from 'lucide-react';

export const API_URL = import.meta.env.VITE_API_URL || '';

export const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
export const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export const PIN_CATEGORIES = [
  { value: 'food', label: 'Food', icon: Utensils, color: '#f97316' },
  { value: 'stay', label: 'Stay', icon: Hotel, color: '#3b82f6' },
  { value: 'transport', label: 'Transport', icon: Bus, color: '#8b5cf6' },
  { value: 'hidden-gem', label: 'Hidden Gem', icon: Gem, color: '#10b981' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: '#ef4444' },
  { value: 'photo-spot', label: 'Photo Spot', icon: Camera, color: '#ec4899' },
  { value: 'activity', label: 'Activity', icon: Footprints, color: '#14b8a6' },
  { value: 'culture', label: 'Culture', icon: Palette, color: '#a855f7' },
  { value: 'nature', label: 'Nature', icon: Trees, color: '#22c55e' },
  { value: 'nightlife', label: 'Nightlife', icon: Moon, color: '#6366f1' },
  { value: 'shopping', label: 'Shopping', icon: ShoppingBag, color: '#f59e0b' },
  { value: 'general', label: 'General', icon: MapPin, color: '#6b7280' },
] as const;

export function getCategoryMeta(cat: string) {
  return PIN_CATEGORIES.find(c => c.value === cat) || PIN_CATEGORIES[PIN_CATEGORIES.length - 1];
}

export const AREA_CATEGORIES = [
  { value: 'explored', label: 'Explored', color: '#10b981' },
  { value: 'recommended', label: 'Recommended', color: '#3b82f6' },
  { value: 'avoid', label: 'Avoid', color: '#ef4444' },
  { value: 'nightlife-zone', label: 'Nightlife', color: '#8b5cf6' },
  { value: 'food-street', label: 'Food Street', color: '#f97316' },
  { value: 'market', label: 'Market', color: '#f59e0b' },
  { value: 'other', label: 'Other', color: '#6b7280' },
] as const;
