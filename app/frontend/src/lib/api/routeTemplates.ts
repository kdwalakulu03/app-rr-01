// Route template API methods
import { api } from './client';
import type { RouteTemplate } from './types';

export async function getRoutes(params?: {
  country?: string;
  minDays?: number;
  maxDays?: number;
  budgetLevel?: string;
  pace?: string;
  tags?: string[];
  interests?: string[];
  groupType?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
  }
  return api.request<{ routes: RouteTemplate[]; total: number }>(`/api/routes?${searchParams}`);
}

export async function getRoute(slug: string) {
  return api.request<{ route: RouteTemplate }>(`/api/routes/${slug}`);
}

export async function matchRoutes(params: {
  country: string;
  days: number;
  budget: string;
  interests?: string[];
  pace?: string;
  groupType?: string;
}) {
  return api.request<{ matches: { route: RouteTemplate; matchScore: number; matchReasons: string[] }[] }>(
    '/api/routes/match',
    { method: 'POST', body: JSON.stringify(params) }
  );
}
