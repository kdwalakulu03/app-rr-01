// Base API client — token management + fetch wrapper + all domain methods
// Existing code uses: api.getCountries(), api.getTrips(), etc.
// Domain modules (routes.ts, trips.ts, etc.) provide standalone functions for new code.

import type {
  Country, Place, PlaceCategory, CityInfo,
  RouteTemplate,
  Trip, TripActivity, CreateTripInput,
  AutopilotSuggestion,
  TransportNode, TransportConnection, TransportEdge, ReachableNode,
} from './types';

const API_URL = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private token: string | null = null;
  private tokenGetter: (() => Promise<string>) | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  /** Set a function that provides a fresh token on every request (handles auto-refresh) */
  setTokenGetter(getter: (() => Promise<string>) | null) {
    this.tokenGetter = getter;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Always get a fresh token if we have a getter (Firebase auto-refreshes)
    if (this.tokenGetter) {
      try {
        this.token = await this.tokenGetter();
      } catch (err) {
        console.error('Token refresh failed:', err);
      }
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error(`API ${options.method || 'GET'} ${path} failed:`, response.status, error);
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Health
  async health() {
    return this.request<{ status: string; database: string }>('/api/health');
  }

  // ==========================================
  // Countries
  // ==========================================
  async getCountries() {
    return this.request<{ countries: Country[] }>('/api/countries');
  }

  async getCountriesWithPlaces() {
    return this.request<{ countries: Country[] }>('/api/countries/with-places');
  }

  async getCountriesWithRoutes() {
    return this.request<{ countries: Country[] }>('/api/countries/with-routes');
  }

  async getCountry(code: string) {
    return this.request<{ country: Country & { topCities: CityInfo[]; categories: PlaceCategory[] } }>(`/api/countries/${code}`);
  }

  // ==========================================
  // Places
  // ==========================================
  async getPlaces(params: {
    country?: string; city?: string; category?: string; subCategory?: string;
    search?: string; minRating?: number; lat?: number; lng?: number;
    radius?: number; limit?: number; offset?: number;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
    return this.request<{ places: Place[]; total?: number }>(`/api/places?${searchParams}`);
  }

  async getPlace(id: number) {
    return this.request<{ place: Place }>(`/api/places/${id}`);
  }

  async getPlaceCategories(country: string) {
    return this.request<{ categories: PlaceCategory[] }>(`/api/places/categories?country=${country}`);
  }

  async getPlaceCities(country: string) {
    return this.request<{ cities: CityInfo[] }>(`/api/places/cities?country=${country}`);
  }

  async getNearbyPlaces(lat: number, lng: number, radius?: number) {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    if (radius) params.append('radius', String(radius));
    return this.request<{ places: Place[] }>(`/api/places/nearby?${params}`);
  }

  async createUserPlace(data: {
    name: string; latitude: number; longitude: number; countryCode: string;
    city?: string; mainCategory: string; subCategory?: string;
    description?: string; website?: string; rating?: number; priceLevel?: number;
  }) {
    return this.request<{ place: Place }>('/api/places/user', {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  // ==========================================
  // Routes
  // ==========================================
  async getRoutes(params?: {
    country?: string; minDays?: number; maxDays?: number; budgetLevel?: string;
    pace?: string; tags?: string[]; interests?: string[]; groupType?: string;
    limit?: number; offset?: number;
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
    return this.request<{ routes: RouteTemplate[]; total: number }>(`/api/routes?${searchParams}`);
  }

  async getRoute(slug: string) {
    return this.request<{ route: RouteTemplate }>(`/api/routes/${slug}`);
  }

  async matchRoutes(params: {
    country: string; days: number; budget: string;
    interests?: string[]; pace?: string; groupType?: string;
  }) {
    return this.request<{ matches: { route: RouteTemplate; matchScore: number; matchReasons: string[] }[] }>(
      '/api/routes/match', { method: 'POST', body: JSON.stringify(params) }
    );
  }

  // ==========================================
  // Trips
  // ==========================================
  async getTrips() {
    return this.request<{ trips: Trip[] }>('/api/trips');
  }

  async getTrip(id: number) {
    return this.request<{ trip: Trip }>(`/api/trips/${id}`);
  }

  async createTrip(data: CreateTripInput) {
    return this.request<{ trip: { id: number; name: string }; message: string }>(
      '/api/trips', { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async updateTrip(id: number, data: Partial<Trip>) {
    return this.request<{ trip: Trip }>(`/api/trips/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    });
  }

  async deleteTrip(id: number) {
    return this.request<{ success: boolean }>(`/api/trips/${id}`, { method: 'DELETE' });
  }

  async startTrip(id: number) {
    return this.request<{ message: string; trip: Trip }>(`/api/trips/${id}/start`, { method: 'POST' });
  }

  async updateActivity(tripId: number, activityId: number, data: {
    status?: string; skipReason?: string; actualCost?: number; rating?: number; notes?: string;
  }) {
    return this.request<{ activity: TripActivity }>(`/api/trips/${tripId}/activities/${activityId}`, {
      method: 'PUT', body: JSON.stringify(data),
    });
  }

  async getSharedTrip(token: string) {
    return this.request<{ trip: Trip }>(`/api/trips/share/${token}`);
  }

  // ==========================================
  // Itinerary (GIS-powered)
  // ==========================================
  async generateItinerary(tripId: number) {
    return this.request<{ message: string; totalActivities: number; activities: TripActivity[] }>(
      `/api/itinerary/${tripId}/generate`, { method: 'POST' }
    );
  }

  async addItineraryActivity(tripId: number, data: {
    dayNumber: number; placeId?: number; name: string; description?: string;
    category?: string; startTime?: string; durationMinutes?: number;
    placeName?: string; latitude?: number; longitude?: number;
    estimatedCost?: number; sequenceOrder?: number; source?: string;
  }) {
    return this.request<{ activity: TripActivity }>(`/api/itinerary/${tripId}/activities`, {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  async updateItineraryActivity(tripId: number, activityId: number, data: {
    name?: string; description?: string; category?: string; sequenceOrder?: number;
    plannedStartTime?: string; plannedDurationMinutes?: number;
    placeName?: string; notes?: string; estimatedCost?: number;
  }) {
    return this.request<{ activity: TripActivity }>(`/api/itinerary/${tripId}/activities/${activityId}`, {
      method: 'PUT', body: JSON.stringify(data),
    });
  }

  async deleteItineraryActivity(tripId: number, activityId: number) {
    return this.request<{ success: boolean }>(`/api/itinerary/${tripId}/activities/${activityId}`, {
      method: 'DELETE',
    });
  }

  async reorderDayActivities(tripId: number, dayNumber: number, activityIds: number[]) {
    return this.request<{ success: boolean }>(`/api/itinerary/${tripId}/days/${dayNumber}/reorder`, {
      method: 'PUT', body: JSON.stringify({ activityIds }),
    });
  }

  async moveActivity(tripId: number, activityId: number, toDayNumber: number, toSequenceOrder?: number) {
    return this.request<{ success: boolean }>(`/api/itinerary/${tripId}/activities/${activityId}/move`, {
      method: 'PUT', body: JSON.stringify({ toDayNumber, toSequenceOrder }),
    });
  }

  async searchItineraryPlaces(tripId: number, params: {
    query?: string; city?: string; category?: string;
    lat?: number; lng?: number; radius?: number; limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
    return this.request<{ places: Place[] }>(`/api/itinerary/${tripId}/search-places?${searchParams}`);
  }

  async getNearbyPlacesForDay(tripId: number, params: {
    dayNumber: number; radius?: number; category?: string; limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
    return this.request<{ places: (Place & { distanceMeters?: number })[] }>(`/api/itinerary/${tripId}/nearby?${searchParams}`);
  }

  // ==========================================
  // Autopilot
  // ==========================================
  async getAutopilotSuggestion(tripId: number, params?: { lat?: number; lng?: number; time?: string }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return this.request<{
      suggestion: AutopilotSuggestion | null; alternatives?: AutopilotSuggestion[];
      remainingCount: number; dayComplete: boolean; message?: string;
    }>(`/api/autopilot/suggest/${tripId}?${searchParams}`);
  }

  async replanDay(tripId: number, data: { reason: string; currentTime?: string }) {
    return this.request<{ success: boolean; actions: string[]; message: string }>(
      `/api/autopilot/replan/${tripId}`, { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async endDay(tripId: number) {
    return this.request<{ message: string; nextDay?: number; tripComplete: boolean }>(
      `/api/autopilot/end-day/${tripId}`, { method: 'POST' }
    );
  }

  async logExpense(tripId: number, data: {
    activityId?: number; amount: number; currency?: string; category?: string; description?: string;
  }) {
    return this.request<{ success: boolean }>(`/api/autopilot/expense/${tripId}`, {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  async getTripAnalytics(tripId: number) {
    return this.request<{
      trip: { name: string; status: string; totalDays: number };
      activities: { total: number; completed: number; skipped: number };
      completionRate: number;
    }>(`/api/autopilot/analytics/${tripId}`);
  }

  // ==========================================
  // Spatial Transport Network
  // ==========================================
  async getSpatialNodes(params?: {
    country?: string; hierarchy?: string; type?: string; search?: string;
    lat?: number; lng?: number; radius?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return this.request<{ nodes: TransportNode[] }>(`/api/spatial/nodes?${searchParams}`);
  }

  async getSpatialNode(nodeId: number) {
    return this.request<{ node: TransportNode; connections: TransportConnection[] }>(`/api/spatial/nodes/${nodeId}`);
  }

  async getSpatialNetwork(countryCode: string) {
    return this.request<{
      country: string; nodes: GeoJSON.FeatureCollection; edges: GeoJSON.FeatureCollection;
    }>(`/api/spatial/network/${countryCode}`);
  }

  async getSpatialEdges(params?: { country?: string; type?: string; from?: number; to?: number }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return this.request<{ edges: TransportEdge[] }>(`/api/spatial/edges?${searchParams}`);
  }

  async getReachableNodes(nodeId: number, maxMinutes?: number) {
    const searchParams = new URLSearchParams();
    if (maxMinutes !== undefined) searchParams.append('maxMinutes', String(maxMinutes));
    return this.request<{
      fromNodeId: number; maxMinutes: number; maxHops: number;
      reachable: ReachableNode[]; count: number;
    }>(`/api/spatial/reachable/${nodeId}?${searchParams}`);
  }
}

export const api = new ApiClient();
export type { ApiClient };
