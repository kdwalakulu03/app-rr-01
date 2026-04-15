// Trip API methods
import { api } from './client';
import type { Trip, TripActivity, CreateTripInput } from './types';

export async function getTrips() {
  return api.request<{ trips: Trip[] }>('/api/trips');
}

export async function getTrip(id: number) {
  return api.request<{ trip: Trip }>(`/api/trips/${id}`);
}

export async function createTrip(data: CreateTripInput) {
  return api.request<{ trip: { id: number; name: string }; message: string }>(
    '/api/trips',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function updateTrip(id: number, data: Partial<Trip>) {
  return api.request<{ trip: Trip }>(`/api/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTrip(id: number) {
  return api.request<{ success: boolean }>(`/api/trips/${id}`, { method: 'DELETE' });
}

export async function startTrip(id: number) {
  return api.request<{ message: string; trip: Trip }>(`/api/trips/${id}/start`, { method: 'POST' });
}

export async function updateActivity(tripId: number, activityId: number, data: {
  status?: string;
  skipReason?: string;
  actualCost?: number;
  rating?: number;
  notes?: string;
}) {
  return api.request<{ activity: TripActivity }>(`/api/trips/${tripId}/activities/${activityId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getSharedTrip(token: string) {
  return api.request<{ trip: Trip }>(`/api/trips/share/${token}`);
}
