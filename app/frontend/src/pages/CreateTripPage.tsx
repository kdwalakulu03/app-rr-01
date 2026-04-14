import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Calendar, Users, Globe, X,
  ChevronLeft, ChevronRight, Check, Heart, Sparkles, Search, Plus,
  Train, ArrowLeft
} from 'lucide-react';
import { api, CreateTripInput } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';

// ============================================
// TYPES
// ============================================

interface NominatimResult {
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

interface PlaceFormData {
  name: string;
  latitude: number;
  longitude: number;
  city: string;
  mainCategory: string;
  subCategory: string;
  description: string;
  website: string;
}

interface TripData {
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

// ============================================
// CONSTANTS - Countries, Cities, Options
// ============================================
const STEPS = [
  { id: 'who', label: 'Who', icon: Users },
  { id: 'country', label: 'Country', icon: Globe },
  { id: 'cities', label: 'Cities', icon: MapPin },
  { id: 'when', label: 'When', icon: Calendar },
  { id: 'style', label: 'Style', icon: Heart },
  { id: 'transport', label: 'Transport', icon: Train },
  { id: 'activities', label: 'Activities', icon: Sparkles },
];

// Countries and cities are now fetched from the API in their respective step components
function getCountryFlag(code: string): string {
  const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const GROUP_OPTIONS = [
  { value: 'solo', label: 'Solo', icon: '🧑', description: 'Just me', defaultTravelers: 1 },
  { value: 'couple', label: 'Couple', icon: '👫', description: '2 people', defaultTravelers: 2 },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', description: 'With kids', defaultTravelers: 4 },
  { value: 'group', label: 'Group', icon: '👥', description: '3+ friends', defaultTravelers: 4 },
] as const;

const PACE_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed', icon: '🐢', description: '4-5 activities per day', subtitle: 'Take it easy' },
  { value: 'normal', label: 'Balanced', icon: '🚶', description: '6-7 activities per day', subtitle: 'Best of both' },
  { value: 'fast', label: 'Action', icon: '🏃', description: '8+ activities per day', subtitle: 'See it all' },
] as const;

const BUDGET_OPTIONS = [
  { value: 'budget', label: 'Budget', icon: '💵', description: 'Free & affordable' },
  { value: 'moderate', label: 'Moderate', icon: '💳', description: 'Mix of experiences' },
  { value: 'luxury', label: 'Luxury', icon: '💎', description: 'Premium & exclusive' },
] as const;

const INTEREST_OPTIONS = [
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

const TRANSPORT_OPTIONS = [
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

const ACTIVITY_PREFERENCES: Record<string, { label: string; options: { value: string; label: string; icon: string }[] }> = {
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

// ============================================
// MAIN COMPONENT
// ============================================
export default function CreateTripPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');

  // Warn before leaving with unsaved progress
  const hasProgress = currentStep > 0 || isGenerating;
  
  // Browser tab close / refresh warning
  useEffect(() => {
    if (!hasProgress) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasProgress]);

  // In-app navigation: warn via Back button handler
  const guardedNavigate = (delta: number) => {
    if (hasProgress && !window.confirm('You have unsaved progress. Discard and leave?')) return;
    navigate(delta);
  };
  
  // Pre-selected route from URL
  const preselectedRouteId = searchParams.get('route');
  
  // Fetch route details if pre-selected
  const { data: routeData } = useQuery({
    queryKey: ['route', preselectedRouteId],
    queryFn: () => api.getRoute(preselectedRouteId!),
    enabled: !!preselectedRouteId,
  });
  
  const preselectedRoute = routeData?.route;
  
  const [data, setData] = useState<TripData>({
    groupType: 'solo',
    travelers: 1,
    adults: 1,
    kids: 0,
    country: '',
    countryCode: '',
    cities: [],
    startDate: '',
    endDate: '',
    flexible: false,
    pace: 'normal',
    budgetLevel: 'moderate',
    interests: [],
    transportModes: [],
    activityPreferences: [],
    routeId: preselectedRouteId || undefined,
  });

  // Pre-fill data from route
  useEffect(() => {
    if (preselectedRoute) {
      setData(prev => ({
        ...prev,
        country: preselectedRoute.country || '',
        countryCode: preselectedRoute.countryCode || '',
        routeId: String(preselectedRoute.id),
      }));
    }
  }, [preselectedRoute]);

  const updateData = (updates: Partial<TripData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  // Create trip mutation
  const createTripMutation = useMutation({
    mutationFn: (tripData: CreateTripInput) => api.createTrip(tripData),
    onSuccess: (result) => {
      // Invalidate trips cache so TripsPage shows the new trip
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      navigate(`/trips/${result.trip.id}?new=1`);
    },
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      guardedNavigate(-1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsGenerating(true);
      setGenerationStatus('Creating your trip...');

      const totalTravelers = data.groupType === 'family'
        ? data.adults + data.kids
        : data.travelers;

      // Calculate end date based on route duration if using preset
      let endDate = data.endDate;
      if (preselectedRoute && data.startDate && !endDate) {
        const start = new Date(data.startDate);
        start.setDate(start.getDate() + (preselectedRoute.durationDays - 1));
        endDate = start.toISOString().split('T')[0];
      }

      // Determine country code and cities
      const countryCode = data.countryCode || preselectedRoute?.countryCode || '';
      const cities = data.cities.length > 0
        ? data.cities
        : (preselectedRoute?.cities || []);

      await createTripMutation.mutateAsync({
        routeVersionId: preselectedRoute?.currentVersionId || undefined,
        name: preselectedRoute
          ? `${preselectedRoute.name}`
          : `Trip to ${cities[0] || countryCode}`,
        startDate: data.startDate,
        endDate,
        countryCode,
        cities,
        groupType: data.groupType,
        travelers: totalTravelers,
        adults: data.adults,
        kids: data.kids,
        pace: data.pace,
        budgetLevel: data.budgetLevel,
        interests: data.interests,
        transportModes: data.transportModes,
      });
    } catch (error) {
      console.error('Failed to create trip:', error);
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return data.groupType && data.travelers > 0;
      case 1: return data.country.length > 0 || !!preselectedRoute;
      case 2: return data.cities.length > 0 || !!preselectedRoute;
      case 3: return data.startDate.length > 0;
      case 4: return data.interests.length > 0;
      case 5: return data.transportModes.length > 0;
      case 6: return true; // Optional
      default: return true;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
        <Sparkles className="h-16 w-16 text-primary-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Create Your Trip</h1>
        <p className="text-content-muted mb-6">Sign in to start planning your adventure</p>
        <Link to="/login" className="bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => guardedNavigate(-1)}
            className="flex items-center gap-2 text-content-muted hover:text-content-heading mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          {preselectedRoute && (
            <div className="p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg mb-4">
              <p className="text-sm text-primary-600">
                <Sparkles className="h-4 w-4 inline mr-1" />
                Creating trip from: <strong>{preselectedRoute.name}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isActive
                          ? 'bg-primary-500 text-white scale-110 shadow-lg shadow-primary-500/30'
                          : isCompleted
                          ? 'bg-primary-500 text-white'
                          : 'bg-surface-subtle text-content-muted'
                      }`}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-4 h-4 md:w-5 md:h-5" />}
                    </div>
                    <span className={`mt-2 text-xs font-medium hidden sm:block ${isActive ? 'text-primary-600' : 'text-content-muted'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 md:mx-2 rounded ${index < currentStep ? 'bg-primary-500' : 'bg-surface-subtle'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-surface-card rounded-2xl shadow-lg p-6 md:p-8 min-h-[450px]">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-80">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                <Sparkles className="w-6 h-6 text-primary-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="mt-6 text-xl font-semibold">{generationStatus}</h3>
              <p className="mt-2 text-content-muted">Building your perfect itinerary...</p>
            </div>
          ) : (
            <>
              {currentStep === 0 && <WhoStep data={data} onUpdate={updateData} />}
              {currentStep === 1 && <CountryStep data={data} onUpdate={updateData} isLocked={!!preselectedRoute} />}
              {currentStep === 2 && <CitiesStep data={data} onUpdate={updateData} isLocked={!!preselectedRoute} />}
              {currentStep === 3 && <WhenStep data={data} onUpdate={updateData} routeDays={preselectedRoute?.durationDays} />}
              {currentStep === 4 && <StyleStep data={data} onUpdate={updateData} />}
              {currentStep === 5 && <TransportStep data={data} onUpdate={updateData} />}
              {currentStep === 6 && <ActivitiesStep data={data} onUpdate={updateData} />}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t border-line-light">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-content-muted hover:bg-surface-hover"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>

                <button
                  onClick={handleNext}
                  disabled={!canProceed() || createTripMutation.isPending}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all ${
                    canProceed()
                      ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/30'
                      : 'bg-surface-subtle text-content-faint cursor-not-allowed'
                  }`}
                >
                  {currentStep === STEPS.length - 1 ? (
                    <>
                      Create Trip
                      <Sparkles className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// STEP COMPONENTS
// ============================================

function WhoStep({ data, onUpdate }: { data: TripData; onUpdate: (d: Partial<TripData>) => void }) {
  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Who's traveling?</h2>
      <p className="text-content-muted mb-6">Tell us about your travel group</p>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
        {GROUP_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onUpdate({ groupType: option.value, travelers: option.defaultTravelers })}
            className={`p-4 md:p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
              data.groupType === option.value
                ? 'border-primary-500 bg-primary-500/10 shadow-lg'
                : 'border-line hover:border-content-faint hover:shadow-md'
            }`}
          >
            <div className="text-3xl md:text-4xl mb-2">{option.icon}</div>
            <div className="font-bold text-content-heading">{option.label}</div>
            <div className="text-sm text-content-muted">{option.description}</div>
          </button>
        ))}
      </div>

      {data.groupType === 'family' && (
        <div className="space-y-4 p-4 bg-surface rounded-xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content mb-2">Adults (18+)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={data.adults}
                onChange={(e) => onUpdate({ adults: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-3 rounded-lg border border-line focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content mb-2">Children</label>
              <input
                type="number"
                min={0}
                max={10}
                value={data.kids}
                onChange={(e) => onUpdate({ kids: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-lg border border-line focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="p-3 bg-primary-500/15 rounded-lg text-center">
            <span className="text-content-muted">Total: </span>
            <span className="text-xl font-bold text-primary-600">{data.adults + data.kids} travelers</span>
          </div>
        </div>
      )}

      {data.groupType === 'group' && (
        <div className="p-4 bg-surface rounded-xl">
          <label className="block text-sm font-medium text-content mb-2">Number of travelers</label>
          <input
            type="number"
            min={3}
            max={20}
            value={data.travelers}
            onChange={(e) => onUpdate({ travelers: parseInt(e.target.value) || 3 })}
            className="w-full px-4 py-3 rounded-lg border border-line focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}
    </div>
  );
}

function CountryStep({ data, onUpdate, isLocked }: { data: TripData; onUpdate: (d: Partial<TripData>) => void; isLocked: boolean }) {
  const [search, setSearch] = useState('');
  
  const { data: countriesData, isLoading } = useQuery({
    queryKey: ['countriesWithPlaces'],
    queryFn: () => api.getCountriesWithPlaces(),
  });

  const countries = countriesData?.countries || [];

  const filteredCountries = useMemo(() => {
    if (!search) return countries;
    return countries.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [search, countries]);

  if (isLocked && data.country) {
    return (
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Destination ✨</h2>
        <p className="text-content-muted mb-6">Pre-selected from your chosen route</p>

        <div className="p-5 bg-primary-500/10 border-2 border-primary-500 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{getCountryFlag(data.countryCode)}</span>
            <div>
              <span className="font-bold text-primary-600 text-2xl">{data.country}</span>
              <p className="text-primary-600 text-sm">From your selected route</p>
            </div>
          </div>
          <Check className="w-8 h-8 text-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Where do you want to go?</h2>
      <p className="text-content-muted mb-6">Select your destination country</p>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-content-faint" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search countries..."
          className="w-full pl-12 pr-4 py-3 border-2 border-line rounded-xl focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {data.country && (
        <div className="mb-4 p-4 bg-primary-500/10 border-2 border-primary-500 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getCountryFlag(data.countryCode)}</span>
            <span className="font-semibold text-primary-600">{data.country}</span>
          </div>
          <Check className="w-6 h-6 text-primary-500" />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
          {filteredCountries.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => onUpdate({ country: country.name, countryCode: country.code, cities: [] })}
              className={`p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                data.countryCode === country.code
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-line hover:border-content-faint'
              }`}
            >
              <span className="text-2xl mr-2">{country.flag || getCountryFlag(country.code)}</span>
              <span className="font-medium text-content-heading">{country.name}</span>
              {country.placeCount > 0 && (
                <span className="block text-xs text-content-faint ml-9">{country.placeCount.toLocaleString()} places</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CitiesStep({ data, onUpdate, isLocked }: { data: TripData; onUpdate: (d: Partial<TripData>) => void; isLocked: boolean }) {
  const [customCity, setCustomCity] = useState('');
  const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([]);
  const [nominatimLoading, setNominatimLoading] = useState(false);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [placeForm, setPlaceForm] = useState<PlaceFormData>({
    name: '', latitude: 0, longitude: 0, city: '',
    mainCategory: 'attractions', subCategory: '', description: '', website: '',
  });
  const [placeSaving, setPlaceSaving] = useState(false);
  const [placeSaved, setPlaceSaved] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { data: citiesData, isLoading } = useQuery({
    queryKey: ['placeCities', data.countryCode],
    queryFn: () => api.getPlaceCities(data.countryCode),
    enabled: !!data.countryCode && !isLocked,
  });
  
  const availableCities = (citiesData?.cities || []).slice(0, 20);

  if (isLocked) {
    return (
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Destinations ✨</h2>
        <p className="text-content-muted mb-6">The route includes curated destinations</p>

        <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl">
          <p className="text-primary-600">
            <Sparkles className="h-4 w-4 inline mr-1" />
            Your route has pre-planned destinations. You'll visit the best spots!
          </p>
        </div>
      </div>
    );
  }

  const toggleCity = (cityName: string) => {
    const newCities = data.cities.includes(cityName)
      ? data.cities.filter(c => c !== cityName)
      : [...data.cities, cityName];
    onUpdate({ cities: newCities });
  };

  // ── Nominatim search ──
  const searchNominatim = (query: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 2) { setNominatimResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setNominatimLoading(true);
      try {
        const cc = data.countryCode.toLowerCase();
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=${cc}&format=json&limit=6&addressdetails=1`,
          { headers: { 'User-Agent': 'RoamRicher/1.0' } }
        );
        const results: NominatimResult[] = await res.json();
        setNominatimResults(results);
      } catch {
        setNominatimResults([]);
      }
      setNominatimLoading(false);
    }, 350);
  };

  const selectNominatimResult = (result: NominatimResult) => {
    const cityName = result.address?.city || result.address?.town || result.address?.village || result.display_name.split(',')[0];
    if (!data.cities.includes(cityName)) {
      onUpdate({ cities: [...data.cities, cityName] });
    }
    setCustomCity('');
    setNominatimResults([]);
  };

  const addCustomCity = () => {
    if (customCity.trim() && !data.cities.includes(customCity.trim())) {
      onUpdate({ cities: [...data.cities, customCity.trim()] });
      setCustomCity('');
      setNominatimResults([]);
    }
  };

  // ── Pick from Nominatim into Place form ──
  const populateFormFromNominatim = (result: NominatimResult) => {
    setPlaceForm((prev) => ({
      ...prev,
      name: result.display_name.split(',')[0],
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      city: result.address?.city || result.address?.town || result.address?.village || '',
    }));
    setCustomCity('');
    setNominatimResults([]);
  };

  // ── Save user place ──
  const saveUserPlace = async () => {
    if (!placeForm.name || !placeForm.latitude || !placeForm.longitude) return;
    setPlaceSaving(true);
    try {
      await api.createUserPlace({
        name: placeForm.name,
        latitude: placeForm.latitude,
        longitude: placeForm.longitude,
        countryCode: data.countryCode,
        city: placeForm.city || undefined,
        mainCategory: placeForm.mainCategory,
        subCategory: placeForm.subCategory || undefined,
        description: placeForm.description || undefined,
        website: placeForm.website || undefined,
      });
      // Also add the city to trip destinations if not there
      const cityName = placeForm.city || placeForm.name;
      if (!data.cities.includes(cityName)) {
        onUpdate({ cities: [...data.cities, cityName] });
      }
      setPlaceSaved(true);
      setTimeout(() => { setPlaceSaved(false); setShowAddPlace(false); }, 1500);
      setPlaceForm({ name: '', latitude: 0, longitude: 0, city: '', mainCategory: 'attractions', subCategory: '', description: '', website: '' });
    } catch (err) {
      console.error('Failed to save place:', err);
    }
    setPlaceSaving(false);
  };

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Which places in {data.country}?</h2>
      <p className="text-content-muted mb-6">Select cities or regions to visit</p>

      {data.cities.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-content mb-2">Your destinations ({data.cities.length})</label>
          <div className="flex flex-wrap gap-2">
            {data.cities.map((city) => (
              <span key={city} className="inline-flex items-center gap-1 px-3 py-2 bg-primary-500/15 text-primary-600 rounded-full font-medium">
                <MapPin className="w-4 h-4" />
                {city}
                <button onClick={() => toggleCity(city)} className="ml-1 hover:bg-primary-500/20 rounded-full p-0.5">
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : availableCities.length > 0 ? (
        <div className="mb-6">
          <label className="block text-sm font-medium text-content mb-2">🔥 Top cities ({availableCities.length})</label>
          <div className="flex flex-wrap gap-2">
            {availableCities.map((city) => (
              <button
                key={city.city}
                type="button"
                onClick={() => toggleCity(city.city)}
                className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                  data.cities.includes(city.city)
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-line hover:border-primary-500/40 hover:bg-primary-500/10'
                }`}
              >
                {city.city}
                <span className="text-xs ml-1 opacity-70">({city.placeCount})</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Search with autocomplete ── */}
      <div className="relative mb-4">
        <label className="block text-sm font-medium text-content mb-2">Search places</label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
            <input
              type="text"
              value={customCity}
              onChange={(e) => { setCustomCity(e.target.value); searchNominatim(e.target.value); }}
              onKeyDown={(e) => e.key === 'Enter' && addCustomCity()}
              placeholder={`Search in ${data.country}...`}
              className="w-full pl-10 pr-4 py-3 border-2 border-line rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-surface"
            />
            {nominatimLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={addCustomCity}
            disabled={!customCity.trim()}
            className="px-4 py-3 bg-surface-subtle hover:bg-surface-hover rounded-xl transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Nominatim dropdown */}
        {nominatimResults.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface-card border border-line rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
            {nominatimResults.map((r) => (
              <button
                key={r.place_id}
                className="w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors border-b border-line last:border-0"
                onClick={() => selectNominatimResult(r)}
              >
                <div className="font-medium text-sm text-content">{r.display_name.split(',')[0]}</div>
                <div className="text-xs text-content-muted truncate">{r.display_name}</div>
              </button>
            ))}
            <div className="px-4 py-2 bg-surface-subtle text-[10px] text-content-faint">
              Powered by OpenStreetMap Nominatim
            </div>
          </div>
        )}
      </div>

      {/* ── Add a Place (contribute) ── */}
      <div className="border border-dashed border-line rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAddPlace(!showAddPlace)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary-500" />
            <span className="text-sm font-medium text-content">Contribute a place</span>
            <span className="text-xs text-content-muted">— help fellow travelers!</span>
          </div>
          <ChevronRight className={`h-4 w-4 text-content-muted transition-transform ${showAddPlace ? 'rotate-90' : ''}`} />
        </button>

        {showAddPlace && (
          <div className="px-4 pb-4 pt-2 border-t border-line space-y-3">
            <p className="text-xs text-content-muted">
              Know a hidden gem? Add it to our community database.
              Search above to auto-fill coordinates, or{' '}
              <a
                href={`https://www.google.com/maps/@${data.countryCode === 'TH' ? '13.75,100.5' : '0,0'},6z`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:underline"
              >
                find it on Google Maps ↗
              </a>{' '}
              and paste the details.
            </p>

            {/* Quick fill from search */}
            {nominatimResults.length > 0 && (
              <div className="bg-surface-subtle rounded-lg p-2">
                <p className="text-[10px] font-medium text-content-muted mb-1">Pick from search to auto-fill:</p>
                <div className="flex flex-wrap gap-1">
                  {nominatimResults.slice(0, 3).map((r) => (
                    <button
                      key={r.place_id}
                      onClick={() => populateFormFromNominatim(r)}
                      className="text-xs px-2 py-1 bg-surface-card border border-line rounded-lg hover:border-primary-500/40 transition-colors"
                    >
                      📍 {r.display_name.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-content mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={placeForm.name}
                  onChange={(e) => setPlaceForm({ ...placeForm, name: e.target.value })}
                  placeholder="e.g. Sunset Beach"
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content mb-1">City</label>
                <input
                  type="text"
                  value={placeForm.city}
                  onChange={(e) => setPlaceForm({ ...placeForm, city: e.target.value })}
                  placeholder="e.g. Krabi"
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content mb-1">
                  Latitude <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={placeForm.latitude || ''}
                  onChange={(e) => setPlaceForm({ ...placeForm, latitude: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 7.8804"
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content mb-1">
                  Longitude <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={placeForm.longitude || ''}
                  onChange={(e) => setPlaceForm({ ...placeForm, longitude: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 98.3923"
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content mb-1">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={placeForm.mainCategory}
                  onChange={(e) => setPlaceForm({ ...placeForm, mainCategory: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500"
                >
                  <option value="attractions">Attraction</option>
                  <option value="food_drink">Food & Drink</option>
                  <option value="nature">Nature</option>
                  <option value="culture">Culture</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="activities">Activities</option>
                  <option value="wellness">Wellness</option>
                  <option value="shopping">Shopping</option>
                  <option value="nightlife">Nightlife</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-content mb-1">Website</label>
                <input
                  type="url"
                  value={placeForm.website}
                  onChange={(e) => setPlaceForm({ ...placeForm, website: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-content mb-1">Description</label>
              <textarea
                value={placeForm.description}
                onChange={(e) => setPlaceForm({ ...placeForm, description: e.target.value })}
                placeholder="What makes this place special? Any tips for visitors?"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface focus:ring-1 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-content-faint">
                Saved as community contribution · source: user
              </span>
              <button
                type="button"
                onClick={saveUserPlace}
                disabled={!placeForm.name || !placeForm.latitude || !placeForm.longitude || placeSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {placeSaved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved!
                  </>
                ) : placeSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Place
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WhenStep({ data, onUpdate, routeDays }: { data: TripData; onUpdate: (d: Partial<TripData>) => void; routeDays?: number }) {
  const today = new Date().toISOString().split('T')[0];

  // Auto-calculate end date if route has fixed days
  const endDate = useMemo(() => {
    if (routeDays && data.startDate) {
      const start = new Date(data.startDate);
      start.setDate(start.getDate() + routeDays - 1);
      return start.toISOString().split('T')[0];
    }
    return data.endDate;
  }, [data.startDate, routeDays, data.endDate]);

  const duration = data.startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : routeDays || 0;

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">When are you going?</h2>
      <p className="text-content-muted mb-6">Select your travel dates</p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content mb-2">Start Date</label>
            <input
              type="date"
              value={data.startDate}
              min={today}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
              className="w-full px-4 py-3 border-2 border-line rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              min={data.startDate || today}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
              disabled={!!routeDays}
              className="w-full px-4 py-3 border-2 border-line rounded-xl focus:ring-2 focus:ring-primary-500 disabled:bg-surface"
            />
          </div>
        </div>

        {duration > 0 && (
          <div className="p-4 bg-primary-500/10 rounded-xl text-center">
            <span className="text-content-muted">Trip duration: </span>
            <span className="text-2xl font-bold text-primary-600">{duration} {duration === 1 ? 'day' : 'days'}</span>
          </div>
        )}

        {routeDays && (
          <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-sm text-content-muted">
            <Sparkles className="h-4 w-4 inline mr-1" />
            This route is designed for {routeDays} days. End date is automatically calculated.
          </div>
        )}

        <label className="flex items-center gap-3 p-4 bg-surface rounded-xl cursor-pointer hover:bg-surface-hover transition-colors">
          <input
            type="checkbox"
            checked={data.flexible}
            onChange={(e) => onUpdate({ flexible: e.target.checked })}
            className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
          />
          <div>
            <span className="font-medium text-content-heading">My dates are flexible</span>
            <p className="text-sm text-content-muted">We'll suggest the best times to visit</p>
          </div>
        </label>
      </div>
    </div>
  );
}

function StyleStep({ data, onUpdate }: { data: TripData; onUpdate: (d: Partial<TripData>) => void }) {
  const toggleInterest = (interest: string) => {
    const newInterests = data.interests.includes(interest)
      ? data.interests.filter(i => i !== interest)
      : [...data.interests, interest];
    onUpdate({ interests: newInterests });
  };

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Your travel style</h2>
      <p className="text-content-muted mb-6">Help us personalize your itinerary</p>

      {/* Pace */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-content mb-3">Travel pace</label>
        <div className="grid grid-cols-3 gap-3">
          {PACE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onUpdate({ pace: option.value })}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                data.pace === option.value ? 'border-primary-500 bg-primary-500/10' : 'border-line hover:border-content-faint'
              }`}
            >
              <div className="text-2xl mb-1">{option.icon}</div>
              <div className="font-semibold text-sm">{option.label}</div>
              <div className="text-xs text-content-muted">{option.subtitle}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-content mb-3">Budget level</label>
        <div className="grid grid-cols-3 gap-3">
          {BUDGET_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onUpdate({ budgetLevel: option.value })}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                data.budgetLevel === option.value ? 'border-primary-500 bg-primary-500/10' : 'border-line hover:border-content-faint'
              }`}
            >
              <div className="text-2xl mb-1">{option.icon}</div>
              <div className="font-semibold text-sm">{option.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="block text-sm font-medium text-content mb-3">What interests you? (select at least 1)</label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleInterest(option.value)}
              className={`px-4 py-2 rounded-full border-2 font-medium transition-all flex items-center gap-2 ${
                data.interests.includes(option.value)
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-line hover:border-primary-500/30 hover:bg-primary-500/5'
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransportStep({ data, onUpdate }: { data: TripData; onUpdate: (d: Partial<TripData>) => void }) {
  const toggleTransport = (value: string) => {
    const newModes = data.transportModes.includes(value)
      ? data.transportModes.filter(m => m !== value)
      : [...data.transportModes, value];
    onUpdate({ transportModes: newModes });
  };

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">How do you like to travel?</h2>
      <p className="text-content-muted mb-6">Select your preferred transport modes (at least 1)</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {TRANSPORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleTransport(option.value)}
            className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
              data.transportModes.includes(option.value)
                ? 'border-primary-500 bg-primary-500/10 shadow-md'
                : 'border-line hover:border-content-faint'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl">{option.icon}</span>
              {data.transportModes.includes(option.value) && <Check className="w-5 h-5 text-primary-500" />}
            </div>
            <div className="mt-2">
              <div className="font-semibold text-content-heading">{option.label}</div>
              <div className="text-xs text-content-muted">{option.description}</div>
            </div>
          </button>
        ))}
      </div>

      {data.transportModes.length > 0 && (
        <div className="mt-6 p-4 bg-primary-500/10 rounded-xl">
          <p className="text-sm text-primary-600">
            <span className="font-medium">{data.transportModes.length} transport mode{data.transportModes.length > 1 ? 's' : ''} selected</span>
          </p>
        </div>
      )}
    </div>
  );
}

function ActivitiesStep({ data, onUpdate }: { data: TripData; onUpdate: (d: Partial<TripData>) => void }) {
  const toggleActivity = (value: string) => {
    const newPrefs = data.activityPreferences.includes(value)
      ? data.activityPreferences.filter(p => p !== value)
      : [...data.activityPreferences, value];
    onUpdate({ activityPreferences: newPrefs });
  };

  const relevantCategories = data.interests
    .filter(interest => ACTIVITY_PREFERENCES[interest])
    .map(interest => ({ ...ACTIVITY_PREFERENCES[interest], interestValue: interest }));

  if (relevantCategories.length === 0) {
    return (
      <div className="text-center py-8">
        <Sparkles className="w-12 h-12 text-content-faint mx-auto mb-4" />
        <h3 className="text-lg font-medium text-content-heading mb-2">All set!</h3>
        <p className="text-content-muted">Click "Create Trip" to start your adventure.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Fine-tune your experiences</h2>
      <p className="text-content-muted mb-6">Select specific activities you'd love (optional)</p>

      <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2">
        {relevantCategories.map((category) => (
          <div key={category.interestValue} className="bg-surface rounded-xl p-4">
            <h3 className="font-semibold text-content-heading mb-3 flex items-center gap-2">
              <span>{INTEREST_OPTIONS.find(i => i.value === category.interestValue)?.icon}</span>
              {category.label}
            </h3>
            <div className="flex flex-wrap gap-2">
              {category.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleActivity(option.value)}
                  className={`px-3 py-2 rounded-lg border-2 font-medium transition-all flex items-center gap-2 text-sm ${
                    data.activityPreferences.includes(option.value)
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-line bg-surface-card hover:border-primary-500/30'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
        <p className="text-sm text-content-muted">
          <span className="font-medium">✨ Almost there!</span> These help us personalize your trip. You can skip if you prefer broader recommendations.
        </p>
      </div>
    </div>
  );
}
