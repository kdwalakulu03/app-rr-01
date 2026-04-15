// ============================================
// Type definitions — Places, Countries, Routes
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
// Spatial Transport Network Types
// ============================================

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
