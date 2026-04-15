// ─── MentorCanvas shared types ────────────────────

export interface Pin {
  id?: number;
  lat: number;
  lng: number;
  category: string;
  title: string;
  notes: string;
  tips: string;
  costUsd: string;
  durationMinutes: string;
  timeOfDay: string;
  dayNumber: string;
  sequenceOrder: number;
}

export interface Segment {
  id?: number;
  fromPinIdx: number;
  toPinIdx: number;
  geometry: GeoJSON.LineString;
  transportMode: string;
  distanceKm: number;
  durationMinutes: number;
}

export interface Area {
  id?: number;
  coordinates: [number, number][];
  label: string;
  notes: string;
  category: string;
  color: string;
  opacity: number;
}

export interface RouteData {
  id?: number;
  title: string;
  description: string;
  countryCode: string;
  travelStyle: string;
  difficulty: string;
}

export type Tool = 'select' | 'pin' | 'route' | 'area';

export type PanelTab = 'route' | 'pin' | 'pins' | 'areas' | 'area';
