// User profile API methods
import { api } from './client';

export async function getMe() {
  return api.request<{ user: any }>('/api/users/me');
}

export async function updateProfile(data: {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  travelerMeta?: Record<string, unknown>;
  providerMeta?: Record<string, unknown>;
  mentorMeta?: Record<string, unknown>;
}) {
  return api.request<{ user: any }>('/api/users/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function switchRole(role: 'traveler' | 'provider' | 'mentor') {
  return api.request<{ activeRole: string }>('/api/users/switch-role', {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function updateLocation(lat: number, lng: number) {
  return api.request<{ success: boolean }>('/api/users/location', {
    method: 'PUT',
    body: JSON.stringify({ lat, lng }),
  });
}
