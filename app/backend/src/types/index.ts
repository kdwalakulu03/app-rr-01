// Roam Richer shared types

// ============================================
// Provider
// ============================================
export interface Provider {
  id: number;
  name: string;
  slug: string;
  type: 'editorial' | 'guide' | 'agency';
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  credentials: Record<string, unknown>;
  email: string | null;
  phone: string | null;
  website: string | null;
  socialLinks: Record<string, string>;
  countryCode: string | null;
  city: string | null;
  routeCount: number;
  totalTrips: number;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Place (Google Maps sourced)
// ============================================
export interface Place {
  id: number;
  googlePlaceId: string | null;
  name: string;
  nameEn: string | null;
  slug: string | null;
  latitude: number;
  longitude: number;
  countryCode: string;
  country: string | null;
  city: string | null;
  stateProvince: string | null;
  district: string | null;
  address: string | null;
  mainCategory: string;
  subCategory: string | null;
  description: string | null;
  openingHours: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  imageUrl: string | null;
  photosJson: string | null;
  rating: number | null;
  reviewCount: number;
  priceLevel: number | null;
  price: string | null;
  priceCurrency: string;
  amenities: string | null;
  source: string;
  visitCount: number;
  avgDurationMinutes: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Experience
// ============================================
export interface Experience {
  id: number;
  placeId: number | null;
  place?: Place;
  name: string;
  description: string | null;
  activityType: string | null;
  category: string | null;
  durationMinutes: number;
  timeOfDayFit: string[];
  bestDays: string[];
  priority: 'anchor' | 'high' | 'normal' | 'optional';
  isSkippable: boolean;
  skipIfRain: boolean;
  indoor: boolean;
  costBudget: number | null;
  costModerate: number | null;
  costLuxury: number | null;
  currency: string;
  requiresBooking: boolean;
  bookingUrl: string | null;
  minGroupSize: number;
  maxGroupSize: number | null;
  ageRestriction: string | null;
  tags: string[];
  completionRate: number | null;
  actualAvgDuration: number | null;
  skipRate: number | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Route
// ============================================
export interface RouteTemplate {
  id: number;
  providerId: number;
  provider?: Provider;
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
  pace: 'relaxed' | 'normal' | 'fast';
  groupTypes: string[];
  minTravelers: number;
  maxTravelers: number | null;
  tags: string[];
  highlights: string[];
  interests: string[];
  coverImage: string | null;
  images: string[];
  rating: number;
  reviewCount: number;
  timesUsed: number;
  completionRate: number | null;
  isPublished: boolean;
  isFeatured: boolean;
  isOfficial: boolean;
  currentVersionId: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  days?: RouteDay[];
}

export interface RouteVersion {
  id: number;
  routeTemplateId: number;
  versionNumber: number;
  changeNotes: string | null;
  isActive: boolean;
  createdAt: string;
  days?: RouteDay[];
}

export interface RouteDay {
  id: number;
  routeVersionId: number;
  dayNumber: number;
  title: string | null;
  description: string | null;
  city: string | null;
  overnightCity: string | null;
  accommodationNotes: string | null;
  mainTransport: string | null;
  transportNotes: string | null;
  activities?: RouteActivity[];
  createdAt: string;
}

export interface RouteActivity {
  id: number;
  routeDayId: number;
  experienceId: number | null;
  placeId: number | null;
  experience?: Experience;
  name: string;
  description: string | null;
  category: string | null;
  sequenceOrder: number;
  startTime: string | null;
  durationMinutes: number;
  placeName: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  tips: string | null;
  costEstimate: number | null;
  createdAt: string;
}

// ============================================
// Trip
// ============================================
export interface Trip {
  id: number;
  userId: string;
  routeVersionId: number | null;
  routeVersion?: RouteVersion;
  name: string | null;
  startDate: string;
  endDate: string;
  countryCode: string | null;
  cities: string[];
  groupType: 'solo' | 'couple' | 'family' | 'group' | null;
  travelers: number;
  adults: number;
  kids: number;
  pace: 'relaxed' | 'normal' | 'fast';
  budgetLevel: 'budget' | 'moderate' | 'luxury';
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
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  days?: TripDay[];
}

export interface TripDay {
  id: number;
  tripId: number;
  dayNumber: number;
  date: string;
  status: 'upcoming' | 'active' | 'completed';
  city: string | null;
  weatherCondition: string | null;
  weatherTempC: number | null;
  plannedActivities: number;
  completedActivities: number;
  skippedActivities: number;
  totalSpent: number;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  activities?: TripActivity[];
}

export interface TripActivity {
  id: number;
  tripId: number;
  tripDayId: number | null;
  routeActivityId: number | null;
  experienceId: number | null;
  placeId: number | null;
  place?: Place;
  name: string;
  description: string | null;
  category: string | null;
  dayNumber: number;
  sequenceOrder: number;
  plannedStartTime: string | null;
  plannedDurationMinutes: number | null;
  placeName: string | null;
  latitude: number | null;
  longitude: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
  currency: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'rescheduled';
  skipReason: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  actualDurationMinutes: number | null;
  notes: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// TripLog
// ============================================
export interface TripLog {
  id: number;
  tripId: number;
  tripActivityId: number | null;
  userId: string;
  eventType: TripLogEventType;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  data: Record<string, unknown>;
  timestamp: string;
}

export type TripLogEventType =
  | 'trip_started' | 'day_started' | 'day_ended' | 'trip_completed'
  | 'activity_started' | 'activity_completed' | 'activity_skipped'
  | 'check_in' | 'expense_logged' | 'photo_added' | 'note_added'
  | 'location_update' | 'weather_check' | 'safety_checkin';

// ============================================
// Country
// ============================================
export interface Country {
  code: string;
  name: string;
  nameLocal: string | null;
  currency: string | null;
  timezone: string | null;
  languages: string[];
  flag: string | null;
  heroImage: string | null;
  description: string | null;
  dailyBudgetUsd: number | null;
  marketplaceEnabled: boolean;
  guideSignupEnabled: boolean;
  bookingPaymentsEnabled: boolean;
  routeCount: number;
  placeCount: number;
  providerCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Review
// ============================================
export interface Review {
  id: number;
  userId: string;
  tripId: number | null;
  routeTemplateId: number | null;
  providerId: number | null;
  rating: number;
  title: string | null;
  content: string | null;
  ratingAccuracy: number | null;
  ratingValue: number | null;
  ratingExperience: number | null;
  photos: string[];
  isVerified: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// API Input/Output Types
// ============================================
export interface RouteSearchParams {
  country?: string;
  minDays?: number;
  maxDays?: number;
  budgetLevel?: string;
  pace?: string;
  interests?: string[];
  tags?: string[];
  groupType?: string;
  limit?: number;
  offset?: number;
}

export interface RouteMatchResult {
  route: RouteTemplate;
  matchScore: number;
  matchReasons: string[];
}

export interface AutopilotSuggestion {
  activity: TripActivity;
  score: number;
  reason: string;
  estimatedTravelTime: number;
  alternativeActivities?: TripActivity[];
}

export interface CreateTripInput {
  routeVersionId?: number;
  name?: string;
  startDate: string;
  endDate: string;
  countryCode: string;
  cities: string[];
  groupType?: 'solo' | 'couple' | 'family' | 'group';
  travelers?: number;
  adults?: number;
  kids?: number;
  pace?: 'relaxed' | 'normal' | 'fast';
  budgetLevel?: 'budget' | 'moderate' | 'luxury';
  interests?: string[];
  transportModes?: string[];
}

export interface LogEventInput {
  tripActivityId?: number;
  eventType: TripLogEventType;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  data?: Record<string, unknown>;
}
