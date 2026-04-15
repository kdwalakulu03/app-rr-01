import {
  Users, Globe, MapPin, Calendar, Heart, Train, Sparkles,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

export interface PlaceFormData {
  name: string;
  latitude: number;
  longitude: number;
  city: string;
  mainCategory: string;
  subCategory: string;
  description: string;
  website: string;
}

export interface TripData {
  // Step 1: Who
  groupType: 'solo' | 'couple' | 'family' | 'group';
  travelers: number;
  adults: number;
  kids: number;

  // Step 2: Where - Country
  country: string;
  countryCode: string;

  // Step 3: Where - Cities
  cities: string[];

  // Step 4: When
  startDate: string;
  endDate: string;
  flexible: boolean;

  // Step 5: Style
  pace: 'relaxed' | 'normal' | 'fast';
  budgetLevel: 'budget' | 'moderate' | 'luxury';
  interests: string[];

  // Step 6: Transport Preferences
  transportModes: string[];

  // Step 7: Activity Preferences
  activityPreferences: string[];

  // Route selection (if using a preset route)
  routeId?: string;
}

export interface StepProps {
  data: TripData;
  onUpdate: (d: Partial<TripData>) => void;
}

// ============================================
// CONSTANTS
// ============================================

export const STEPS = [
  { id: 'who', label: 'Who', icon: Users },
  { id: 'country', label: 'Country', icon: Globe },
  { id: 'cities', label: 'Cities', icon: MapPin },
  { id: 'when', label: 'When', icon: Calendar },
  { id: 'style', label: 'Style', icon: Heart },
  { id: 'transport', label: 'Transport', icon: Train },
  { id: 'activities', label: 'Activities', icon: Sparkles },
];

export function getCountryFlag(code: string): string {
  const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const GROUP_OPTIONS = [
  { value: 'solo', label: 'Solo', icon: '🧑', description: 'Just me', defaultTravelers: 1 },
  { value: 'couple', label: 'Couple', icon: '👫', description: '2 people', defaultTravelers: 2 },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', description: 'With kids', defaultTravelers: 4 },
  { value: 'group', label: 'Group', icon: '👥', description: '3+ friends', defaultTravelers: 4 },
] as const;

export const PACE_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed', icon: '🐢', description: '4-5 activities per day', subtitle: 'Take it easy' },
  { value: 'normal', label: 'Balanced', icon: '🚶', description: '6-7 activities per day', subtitle: 'Best of both' },
  { value: 'fast', label: 'Action', icon: '🏃', description: '8+ activities per day', subtitle: 'See it all' },
] as const;

export const BUDGET_OPTIONS = [
  { value: 'budget', label: 'Budget', icon: '💵', description: 'Free & affordable' },
  { value: 'moderate', label: 'Moderate', icon: '💳', description: 'Mix of experiences' },
  { value: 'luxury', label: 'Luxury', icon: '💎', description: 'Premium & exclusive' },
] as const;

export const INTEREST_OPTIONS = [
  { value: 'food', label: 'Food & Dining', icon: '🍔' },
  { value: 'culture', label: 'History & Culture', icon: '🏛️' },
  { value: 'nature', label: 'Nature & Outdoors', icon: '🌲' },
  { value: 'photography', label: 'Photography', icon: '📷' },
  { value: 'adventure', label: 'Adventure', icon: '🪂' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'relaxation', label: 'Relaxation', icon: '🧘' },
  { value: 'nightlife', label: 'Nightlife', icon: '🎉' },
  { value: 'beaches', label: 'Beaches', icon: '🏖️' },
  { value: 'wildlife', label: 'Wildlife', icon: '🦁' },
];

export const TRANSPORT_OPTIONS = [
  { value: 'train', label: 'Train / Rail', icon: '🚂', description: 'Scenic train journeys' },
  { value: 'bus', label: 'Bus', icon: '🚌', description: 'Public & tourist buses' },
  { value: 'uber', label: 'Uber / Taxi', icon: '🚕', description: 'Rideshare & taxis' },
  { value: 'tuktuk', label: 'Tuk Tuk', icon: '🛺', description: 'Local three-wheelers' },
  { value: 'rental', label: 'Rental Car', icon: '🚗', description: 'Self-drive freedom' },
  { value: 'scooter', label: 'Scooter / Bike', icon: '🛵', description: 'Two-wheel adventures' },
  { value: 'walking', label: 'Walking', icon: '🚶', description: 'On foot exploration' },
  { value: 'boat', label: 'Boat / Ferry', icon: '⛵', description: 'Water transport' },
  { value: 'private', label: 'Private Driver', icon: '🎖️', description: 'Chauffeur service' },
];

export const ACTIVITY_PREFERENCES: Record<string, { label: string; options: { value: string; label: string; icon: string }[] }> = {
  food: {
    label: 'Food Experiences',
    options: [
      { value: 'street_food', label: 'Street Food Tours', icon: '🍜' },
      { value: 'fine_dining', label: 'Fine Dining', icon: '🍽️' },
      { value: 'cooking_class', label: 'Cooking Classes', icon: '👨‍🍳' },
      { value: 'local_markets', label: 'Local Markets', icon: '🏪' },
      { value: 'cafe_hopping', label: 'Café Hopping', icon: '☕' },
    ],
  },
  culture: {
    label: 'Cultural Experiences',
    options: [
      { value: 'ancient_ruins', label: 'Ancient Ruins', icon: '🏛️' },
      { value: 'temples', label: 'Temples & Shrines', icon: '⛩️' },
      { value: 'museums', label: 'Museums', icon: '🏛️' },
      { value: 'heritage_walks', label: 'Heritage Walks', icon: '🚶' },
      { value: 'art_galleries', label: 'Art Galleries', icon: '🎨' },
    ],
  },
  nature: {
    label: 'Nature Activities',
    options: [
      { value: 'hiking', label: 'Hiking & Trekking', icon: '🥾' },
      { value: 'waterfalls', label: 'Waterfalls', icon: '💧' },
      { value: 'national_parks', label: 'National Parks', icon: '🌲' },
      { value: 'scenic_viewpoints', label: 'Scenic Viewpoints', icon: '🏔️' },
    ],
  },
  adventure: {
    label: 'Adventure Activities',
    options: [
      { value: 'surfing', label: 'Surfing', icon: '🏄' },
      { value: 'diving', label: 'Diving & Snorkeling', icon: '🤿' },
      { value: 'white_water', label: 'White Water Rafting', icon: '🚣' },
      { value: 'zip_lining', label: 'Zip Lining', icon: '🎢' },
    ],
  },
  wildlife: {
    label: 'Wildlife Experiences',
    options: [
      { value: 'safari', label: 'Safari Tours', icon: '🦁' },
      { value: 'whale_watching', label: 'Whale Watching', icon: '🐋' },
      { value: 'elephant_sanctuary', label: 'Elephant Sanctuaries', icon: '🐘' },
    ],
  },
  beaches: {
    label: 'Beach Activities',
    options: [
      { value: 'beach_relaxation', label: 'Beach Relaxation', icon: '🏖️' },
      { value: 'water_sports', label: 'Water Sports', icon: '🚤' },
      { value: 'sunset_spots', label: 'Sunset Spots', icon: '🌅' },
    ],
  },
  relaxation: {
    label: 'Relaxation & Wellness',
    options: [
      { value: 'spa_wellness', label: 'Spa & Wellness', icon: '💆' },
      { value: 'yoga_retreats', label: 'Yoga Retreats', icon: '🧘' },
      { value: 'ayurveda', label: 'Ayurveda Treatments', icon: '🌿' },
    ],
  },
};
