import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Check, Sparkles, ArrowLeft } from 'lucide-react';
import { api, CreateTripInput } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';

import { STEPS, TripData } from './create-trip/types';
import WhoStep from './create-trip/WhoStep';
import CountryStep from './create-trip/CountryStep';
import CitiesStep from './create-trip/CitiesStep';
import WhenStep from './create-trip/WhenStep';
import StyleStep from './create-trip/StyleStep';
import TransportStep from './create-trip/TransportStep';
import ActivitiesStep from './create-trip/ActivitiesStep';

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

      let endDate = data.endDate;
      if (preselectedRoute && data.startDate && !endDate) {
        const start = new Date(data.startDate);
        start.setDate(start.getDate() + (preselectedRoute.durationDays - 1));
        endDate = start.toISOString().split('T')[0];
      }

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
      case 6: return true;
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
