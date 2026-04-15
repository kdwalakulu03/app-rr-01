// Itinerary API methods (GIS-powered)
import { api } from './client';
import type { TripActivity, Place } from './types';

export async function generateItinerary(tripId: number) {
  return api.request<{
    message: string;
    totalActivities: number;
    activities: TripActivity[];
  }>(`/api/itinerary/${tripId}/generate`, { method: 'POST' });
}

export async function addItineraryActivity(tripId: number, data: {
  dayNumber: number;
  placeId?: number;
  name: string;
  description?: string;
  category?: string;
  startTime?: string;
  durationMinutes?: number;
  placeName?: string;
  latitude?: number;
  longitude?: number;
  estimatedCost?: number;
  sequenceOrder?: number;
  source?: string;
}) {
  return api.request<{ activity: TripActivity }>(`/api/itinerary/${tripId}/activities`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateItineraryActivity(tripId: number, activityId: number, data: {
  name?: string;
  description?: string;
  category?: string;
  sequenceOrder?: number;
  plannedStartTime?: string;
  plannedDurationMinutes?: number;
  placeName?: string;
  notes?: string;
  estimatedCost?: number;
}) {
  return api.request<{ activity: TripActivity }>(`/api/itinerary/${tripId}/activities/${activityId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteItineraryActivity(tripId: number, activityId: number) {
  return api.request<{ success: boolean }>(`/api/itinerary/${tripId}/activities/${activityId}`, {
    method: 'DELETE',
  });
}

export async function reorderDayActivities(tripId: number, dayNumber: number, activityIds: number[]) {
  return api.request<{ success: boolean }>(`/api/itinerary/${tripId}/days/${dayNumber}/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ activityIds }),
  });
}

export async function moveActivity(tripId: number, activityId: number, toDayNumber: number, toSequenceOrder?: number) {
  return api.request<{ success: boolean }>(`/api/itinerary/${tripId}/activities/${activityId}/move`, {
    method: 'PUT',
    body: JSON.stringify({ toDayNumber, toSequenceOrder }),
  });
}

export async function searchItineraryPlaces(tripId: number, params: {
  query?: string;
  city?: string;
  category?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.append(key, String(value));
  });
  return api.request<{ places: Place[] }>(`/api/itinerary/${tripId}/search-places?${searchParams}`);
}

export async function getNearbyPlacesForDay(tripId: number, params: {
  dayNumber: number;
  radius?: number;
  category?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.append(key, String(value));
  });
  return api.request<{ places: (Place & { distanceMeters?: number })[] }>(`/api/itinerary/${tripId}/nearby?${searchParams}`);
}
