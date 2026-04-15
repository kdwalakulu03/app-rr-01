// ─── Trip detail shared types & constants ───
import { MapPin, Utensils, Camera, Palette, Mountain, ShoppingBag, Moon, Heart, Zap } from 'lucide-react';

export const CATEGORY_META: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  food_drink: { icon: <Utensils className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Food & Drink' },
  attractions: { icon: <Camera className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Attraction' },
  culture: { icon: <Palette className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Culture' },
  nature: { icon: <Mountain className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Nature' },
  activities: { icon: <Zap className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Activity' },
  wellness: { icon: <Heart className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Wellness' },
  shopping: { icon: <ShoppingBag className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Shopping' },
  nightlife: { icon: <Moon className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Nightlife' },
};

export const DEFAULT_META = { icon: <MapPin className="h-4 w-4" />, color: 'text-content-muted', bg: 'bg-surface-subtle', label: 'Place' };

export const CATEGORIES = [
  { value: 'attractions', label: 'Attractions' },
  { value: 'food_drink', label: 'Food & Drink' },
  { value: 'culture', label: 'Culture' },
  { value: 'nature', label: 'Nature' },
  { value: 'activities', label: 'Activities' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'accommodation', label: 'Accommodation' },
];

export function getCountryFlag(code: string): string {
  const codePoints = code.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface ManualActivityData {
  name: string;
  category: string;
  startTime: string;
  durationMinutes: number;
  description: string;
  placeName: string;
  latitude: string;
  longitude: string;
  estimatedCost: string;
}
