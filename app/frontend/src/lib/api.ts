// API client for Roam Richer

const API_URL = import.meta.env.VITE_API_URL || '';

// ============================================
// Types
// ============================================

export interface Country {
  code: string;
  name: string;
  nameLocal?: string;
  currency: string | null;
  timezone?: string;
  languages?: string[];
  flag: string | null;
  heroImage?: string | null;
  description?: string | null;
  dailyBudgetUsd?: number | null;
  routeCount: number;
  placeCount: number;
  providerCount?: number;
}

export interface Place {
  id: number;
  googlePlaceId: string | null;
  name: string;
  nameEn: string | null;
  slug: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  city: string | null;
  stateProvince: string | null;
  district: string | null;
  mainCategory: string | null;
  subCategory: string | null;
  amenities: string | null;
  shortDescription: string | null;
  description: string | null;
  imageUrl: string | null;
  rating: number;
  reviewCount: number;
  priceLevel: number | null;
  priceCurrency: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  openingHours: string | null;
  source: string | null;
  country: string | null;
  distance?: number;
}

export interface PlaceCategory {
  mainCategory: string;
  subCategory: string | null;
  count: number;
}

export interface CityInfo {
  city: string;
  placeCount: number;
}

export interface RouteTemplate {
  id: number;
  providerId: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  countryCode: string;
  country: string | null;
  region: string | null;
  cities: string[];
  startCity: string | null;
  endCity: string | null;
  durationDays: number;
  budgetLevel: 'budget' | 'moderate' | 'luxury';
  estimatedCostBudget: number | null;
  estimatedCostModerate: number | null;
  estimatedCostLuxury: number | null;
  currency: string;
  pace: string;
  groupTypes: string[];
  tags: string[];
  highlights: string[];
  interests: string[];
  coverImage: string | null;
  rating: number;
  reviewCount: number;
  timesUsed: number;
  completionRate: number | null;
  isFeatured: boolean;
  isOfficial: boolean;
  providerName?: string;
  providerType?: string;
  providerVerified?: boolean;
  currentVersionId?: number;
  days?: RouteDay[];
}

export interface RouteDay {
  id: number;
  dayNumber: number;
  title: string | null;
  description: string | null;
  city: string | null;
  overnightCity: string | null;
  accommodationNotes: string | null;
  mainTransport: string | null;
  activities?: RouteActivity[];
}

export interface RouteActivity {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  sequenceOrder: number;
  startTime: string | null;
  durationMinutes: number;
  placeName: string | null;
  placeId: number | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  tips: string | null;
  costEstimate: number | null;
}

export interface Trip {
  id: number;
  userId: string;
  routeVersionId: number | null;
  routeName?: string;
  routeSlug?: string;
  name: string | null;
  startDate: string;
  endDate: string;
  countryCode: string | null;
  cities: string[];
  groupType: string | null;
  travelers: number;
  adults: number;
  kids: number;
  pace: string;
  budgetLevel: string;
  interests: string[];
  transportModes: string[];
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  currentDay: number;
  totalActivities: number;
  completedActivities: number;
  skippedActivities: number;
  totalSpent: number;
  shareToken: string | null;
  isPublic: boolean;
  showCosts: boolean;
  showTimes: boolean;
  createdAt: string;
  days?: TripDay[];
}

export interface TripDay {
  id: number;
  dayNumber: number;
  date: string;
  status: 'upcoming' | 'active' | 'completed';
  city: string | null;
  plannedActivities: number;
  completedActivities: number;
  skippedActivities: number;
  totalSpent: number;
  activities?: TripActivity[];
}

export interface TripActivity {
  id: number;
  tripDayId: number | null;
  dayNumber: number;
  sequenceOrder: number;
  name: string;
  description: string | null;
  category: string | null;
  plannedStartTime: string | null;
  plannedDurationMinutes: number | null;
  placeName: string | null;
  latitude: number | null;
  longitude: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'rescheduled';
  skipReason: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  actualDurationMinutes: number | null;
  notes: string | null;
  rating: number | null;
}

export interface CreateTripInput {
  routeVersionId?: number;
  name?: string;
  startDate: string;
  endDate: string;
  countryCode: string;
  cities: string[];
  groupType?: string;
  travelers?: number;
  adults?: number;
  kids?: number;
  pace?: string;
  budgetLevel?: string;
  interests?: string[];
  transportModes?: string[];
}

export interface AutopilotSuggestion {
  activity: TripActivity;
  score: number;
  reason: string;
  estimatedTravelTime: number;
}

// ============================================
// API Client
// ============================================

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

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
        // Token refresh failed — will proceed without token
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
    country?: string;
    city?: string;
    category?: string;
    subCategory?: string;
    search?: string;
    minRating?: number;
    lat?: number;
    lng?: number;
    radius?: number;
    limit?: number;
    offset?: number;
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
    name: string;
    latitude: number;
    longitude: number;
    countryCode: string;
    city?: string;
    mainCategory: string;
    subCategory?: string;
    description?: string;
    website?: string;
    rating?: number;
    priceLevel?: number;
  }) {
    return this.request<{ place: Place }>('/api/places/user', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // Routes
  // ==========================================
  async getRoutes(params?: {
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
    return this.request<{ routes: RouteTemplate[]; total: number }>(`/api/routes?${searchParams}`);
  }

  async getRoute(slug: string) {
    return this.request<{ route: RouteTemplate }>(`/api/routes/${slug}`);
  }

  async matchRoutes(params: {
    country: string;
    days: number;
    budget: string;
    interests?: string[];
    pace?: string;
    groupType?: string;
  }) {
    return this.request<{ matches: { route: RouteTemplate; matchScore: number; matchReasons: string[] }[] }>(
      '/api/routes/match',
      { method: 'POST', body: JSON.stringify(params) }
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
      '/api/trips',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async updateTrip(id: number, data: Partial<Trip>) {
    return this.request<{ trip: Trip }>(`/api/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTrip(id: number) {
    return this.request<{ success: boolean }>(`/api/trips/${id}`, { method: 'DELETE' });
  }

  async startTrip(id: number) {
    return this.request<{ message: string; trip: Trip }>(`/api/trips/${id}/start`, { method: 'POST' });
  }

  async updateActivity(tripId: number, activityId: number, data: {
    status?: string;
    skipReason?: string;
    actualCost?: number;
    rating?: number;
    notes?: string;
  }) {
    return this.request<{ activity: TripActivity }>(`/api/trips/${tripId}/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getSharedTrip(token: string) {
    return this.request<{ trip: Trip }>(`/api/trips/share/${token}`);
  }

  // ==========================================
  // Itinerary (GIS-powered)
  // ==========================================
  async generateItinerary(tripId: number) {
    return this.request<{
      message: string;
      totalActivities: number;
      activities: TripActivity[];
    }>(`/api/itinerary/${tripId}/generate`, { method: 'POST' });
  }

  async addItineraryActivity(tripId: number, data: {
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
    return this.request<{ activity: TripActivity }>(`/api/itinerary/${tripId}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateItineraryActivity(tripId: number, activityId: number, data: {
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
    return this.request<{ activity: TripActivity }>(`/api/itinerary/${tripId}/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteItineraryActivity(tripId: number, activityId: number) {
    return this.request<{ success: boolean }>(`/api/itinerary/${tripId}/activities/${activityId}`, {
      method: 'DELETE',
    });
  }

  async reorderDayActivities(tripId: number, dayNumber: number, activityIds: number[]) {
    return this.request<{ success: boolean }>(`/api/itinerary/${tripId}/days/${dayNumber}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ activityIds }),
    });
  }

  async moveActivity(tripId: number, activityId: number, toDayNumber: number, toSequenceOrder?: number) {
    return this.request<{ success: boolean }>(`/api/itinerary/${tripId}/activities/${activityId}/move`, {
      method: 'PUT',
      body: JSON.stringify({ toDayNumber, toSequenceOrder }),
    });
  }

  async searchItineraryPlaces(tripId: number, params: {
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
    return this.request<{ places: Place[] }>(`/api/itinerary/${tripId}/search-places?${searchParams}`);
  }

  async getNearbyPlacesForDay(tripId: number, params: {
    dayNumber: number;
    radius?: number;
    category?: string;
    limit?: number;
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
      suggestion: AutopilotSuggestion | null;
      alternatives?: AutopilotSuggestion[];
      remainingCount: number;
      dayComplete: boolean;
      message?: string;
    }>(`/api/autopilot/suggest/${tripId}?${searchParams}`);
  }

  async replanDay(tripId: number, data: { reason: string; currentTime?: string }) {
    return this.request<{ success: boolean; actions: string[]; message: string }>(
      `/api/autopilot/replan/${tripId}`,
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async endDay(tripId: number) {
    return this.request<{ message: string; nextDay?: number; tripComplete: boolean }>(
      `/api/autopilot/end-day/${tripId}`,
      { method: 'POST' }
    );
  }

  async logExpense(tripId: number, data: {
    activityId?: number;
    amount: number;
    currency?: string;
    category?: string;
    description?: string;
  }) {
    return this.request<{ success: boolean }>(`/api/autopilot/expense/${tripId}`, {
      method: 'POST',
      body: JSON.stringify(data),
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
    country?: string;
    hierarchy?: string;
    type?: string;
    search?: string;
    lat?: number;
    lng?: number;
    radius?: number;
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
    return this.request<{
      node: TransportNode;
      connections: TransportConnection[];
    }>(`/api/spatial/nodes/${nodeId}`);
  }

  async getSpatialNetwork(countryCode: string) {
    return this.request<{
      country: string;
      nodes: GeoJSON.FeatureCollection;
      edges: GeoJSON.FeatureCollection;
    }>(`/api/spatial/network/${countryCode}`);
  }

  async getSpatialEdges(params?: {
    country?: string;
    type?: string;
    from?: number;
    to?: number;
  }) {
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
      fromNodeId: number;
      maxMinutes: number;
      maxHops: number;
      reachable: ReachableNode[];
      count: number;
    }>(`/api/spatial/reachable/${nodeId}?${searchParams}`);
  }
}

// ==========================================
// Spatial Types
// ==========================================

export interface TransportNode {
  id: number;
  name: string;
  nameLocal: string | null;
  slug: string;
  nodeType: string;
  hierarchy: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  connectionCount: number;
}

export interface TransportConnection {
  edgeId: number;
  targetId: number;
  targetName: string;
  targetHierarchy: string;
  targetType: string;
  targetLat: number;
  targetLng: number;
  transportType: string;
  distanceKm: string;
  durationMinutes: number;
  typicalCostUsd: string | null;
  costCurrency: string | null;
  gmapsDeeplink: string;
  frequency: string | null;
  difficulty: string | null;
  tips: string | null;
  description: string | null;
  isBidirectional: boolean;
}

export interface TransportEdge {
  id: number;
  fromNodeId: number;
  toNodeId: number;
  fromName: string;
  toName: string;
  transportType: string;
  distanceKm: number;
  durationMinutes: number;
  costLocal: number | null;
  costCurrency: string | null;
  gmapsDeeplink: string;
  operatorName: string | null;
  frequency: string | null;
  travelTips: string | null;
  bidirectional: boolean;
}

export interface ReachableNode {
  nodeId: number;
  name: string;
  hierarchy: string;
  nodeType: string;
  latitude: number;
  longitude: number;
  totalMinutes: number;
  totalKm: string;
  totalCost: string | null;
  hops: number;
  transportTypes: string[];
}

export const api = new ApiClient();
