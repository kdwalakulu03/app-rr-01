// Autopilot API methods
import { api } from './client';
import type { AutopilotSuggestion } from './types';

export async function getAutopilotSuggestion(tripId: number, params?: { lat?: number; lng?: number; time?: string }) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  return api.request<{
    suggestion: AutopilotSuggestion | null;
    alternatives?: AutopilotSuggestion[];
    remainingCount: number;
    dayComplete: boolean;
    message?: string;
  }>(`/api/autopilot/suggest/${tripId}?${searchParams}`);
}

export async function replanDay(tripId: number, data: { reason: string; currentTime?: string }) {
  return api.request<{ success: boolean; actions: string[]; message: string }>(
    `/api/autopilot/replan/${tripId}`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function endDay(tripId: number) {
  return api.request<{ message: string; nextDay?: number; tripComplete: boolean }>(
    `/api/autopilot/end-day/${tripId}`,
    { method: 'POST' }
  );
}

export async function logExpense(tripId: number, data: {
  activityId?: number;
  amount: number;
  currency?: string;
  category?: string;
  description?: string;
}) {
  return api.request<{ success: boolean }>(`/api/autopilot/expense/${tripId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getTripAnalytics(tripId: number) {
  return api.request<{
    trip: { name: string; status: string; totalDays: number };
    activities: { total: number; completed: number; skipped: number };
    completionRate: number;
  }>(`/api/autopilot/analytics/${tripId}`);
}
