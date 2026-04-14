import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Calendar,
  Check,
  X,
  SkipForward,
  RefreshCw,
  DollarSign,
  Share2,
  Sparkles,
  AlertCircle,
  GripVertical,
  Plus,
  Search,
  Trash2,
  Edit3,
  Navigation,
  Utensils,
  Camera,
  Palette,
  Mountain,
  ShoppingBag,
  Moon,
  Heart,
  Zap,
  Loader2,
  ChevronLeft,
  Map as MapIcon,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Trip, TripActivity, TripDay, Place } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';
import TripTransitMap from '../components/TripTransitMap';
import TripPreviewMap from '../components/TripPreviewMap';

// Category icon + color mapping
const CATEGORY_META: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  food_drink: { icon: <Utensils className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Food & Drink' },
  attractions: { icon: <Camera className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Attraction' },
  culture: { icon: <Palette className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Culture' },
  nature: { icon: <Mountain className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Nature' },
  activities: { icon: <Zap className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Activity' },
  wellness: { icon: <Heart className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Wellness' },
  shopping: { icon: <ShoppingBag className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Shopping' },
  nightlife: { icon: <Moon className="h-4 w-4" />, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Nightlife' },
};

const DEFAULT_META = { icon: <MapPin className="h-4 w-4" />, color: 'text-content-muted', bg: 'bg-surface-subtle', label: 'Place' };

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  useAuth();
  const queryClient = useQueryClient();
  const tripId = parseInt(id!, 10);

  const [activeTab, setActiveTab] = useState<'itinerary' | 'autopilot' | 'expenses'>('itinerary');
  const [selectedDay, setSelectedDay] = useState(1);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('food');
  const [expenseNote, setExpenseNote] = useState('');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [toastFading, setToastFading] = useState(false);
  const toastShownRef = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Show "saved" toast when arriving from trip creation
  useEffect(() => {
    if (searchParams.get('new') === '1' && !toastShownRef.current) {
      toastShownRef.current = true;
      setShowSavedToast(true);
      setToastFading(false);
      // Clean URL via React Router
      setSearchParams({}, { replace: true });
      // Start fade after 3s, hide after 3.5s
      const fadeTimer = setTimeout(() => setToastFading(true), 3000);
      const hideTimer = setTimeout(() => setShowSavedToast(false), 3500);
      return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
    }
  }, [searchParams, setSearchParams]);

  // Fetch trip
  const { data: tripData, isLoading: tripLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => api.getTrip(tripId),
    enabled: !!id,
  });

  // Generate itinerary mutation
  const generateMutation = useMutation({
    mutationFn: () => api.generateItinerary(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
    },
  });

  // Delete activity mutation
  const deleteActivityMutation = useMutation({
    mutationFn: (activityId: number) => api.deleteItineraryActivity(tripId, activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
    },
  });

  // Update activity mutation
  const updateActivityMutation = useMutation({
    mutationFn: ({ activityId, data }: { activityId: number; data: Record<string, unknown> }) =>
      api.updateItineraryActivity(tripId, activityId, data),
    onSuccess: () => {
      setEditingActivityId(null);
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: ({ dayNumber, activityIds }: { dayNumber: number; activityIds: number[] }) =>
      api.reorderDayActivities(tripId, dayNumber, activityIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
    },
  });

  // Add activity mutation
  const addActivityMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.addItineraryActivity>[1]) =>
      api.addItineraryActivity(tripId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      setShowAddPanel(false);
    },
  });

  // Autopilot
  const { data: suggestionData, isLoading: suggestionLoading, refetch: refetchSuggestion } = useQuery({
    queryKey: ['autopilot-suggestion', id],
    queryFn: () => api.getAutopilotSuggestion(tripId),
    enabled: !!id && tripData?.trip?.status === 'active',
    refetchInterval: 60000,
  });

  const completeActivityMutation = useMutation({
    mutationFn: (activityId: string) => api.updateActivity(tripId, parseInt(activityId, 10), { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['autopilot-suggestion', id] });
    },
  });

  const skipActivityMutation = useMutation({
    mutationFn: (activityId: string) => api.updateActivity(tripId, parseInt(activityId, 10), { status: 'skipped' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['autopilot-suggestion', id] });
    },
  });

  const replanMutation = useMutation({
    mutationFn: (reason: string) => api.replanDay(tripId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['autopilot-suggestion', id] });
    },
  });

  const logExpenseMutation = useMutation({
    mutationFn: (data: { amount: number; category: string; description?: string }) =>
      api.logExpense(tripId, data),
    onSuccess: () => {
      setShowExpenseModal(false);
      setExpenseAmount('');
      setExpenseNote('');
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
    },
  });

  // Set first day with activities or day 1
  useEffect(() => {
    if (tripData?.trip?.days?.length) {
      const firstWithActivities = tripData.trip.days.find(
        (d: TripDay) => d.activities && d.activities.length > 0
      );
      if (firstWithActivities) {
        setSelectedDay(firstWithActivities.dayNumber);
      }
    }
  }, [tripData]);

  if (tripLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tripData?.trip) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-content-muted mb-4">Trip not found</h1>
        <Link to="/trips" className="text-primary-600 hover:text-primary-600">Back to trips</Link>
      </div>
    );
  }

  const trip = tripData.trip;
  const isActive = trip.status === 'active';
  const countryFlag = trip.countryCode ? getCountryFlag(trip.countryCode) : '🌍';
  const hasActivities = trip.days?.some((d: TripDay) => d.activities && d.activities.length > 0);
  const currentDayData = trip.days?.find((d: TripDay) => d.dayNumber === selectedDay);
  const dayActivities = currentDayData?.activities || [];

  // Detect city transition from previous day
  const prevDayData = trip.days?.find((d: TripDay) => d.dayNumber === selectedDay - 1);
  const cityTransition =
    prevDayData?.city && currentDayData?.city && prevDayData.city !== currentDayData.city
      ? { from: prevDayData.city, to: currentDayData.city }
      : null;

  // Count activities with coordinates (for map preview label)
  const tripActivities = trip.days?.flatMap((d: TripDay) =>
    (d.activities || []).filter((a: TripActivity) => a.latitude && a.longitude)
  ) || [];

  return (
    <div className="min-h-screen bg-surface">
      {/* Saved toast */}
      {showSavedToast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-opacity duration-500 ${toastFading ? 'opacity-0' : 'opacity-100'}`}>
          <Check className="h-5 w-5 text-primary-500" />
          <span className="font-medium">Trip saved successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-surface-card border-b border-line">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/trips" className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{countryFlag}</span>
                <h1 className="font-semibold text-lg truncate">
                  {trip.routeName || trip.name || 'My Trip'}
                </h1>
              </div>
              <div className="text-sm text-content-muted flex items-center gap-2">
                <span>{trip.days?.length || 0} days</span>
                <span>·</span>
                <span>{trip.totalActivities || 0} activities</span>
                {trip.cities?.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{trip.cities.join(', ')}</span>
                  </>
                )}
              </div>
            </div>
            <Link
              to={`/trips/${trip.id}/map`}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
              title="View on Map"
            >
              <MapIcon className="h-5 w-5 text-primary-500" />
            </Link>
            <button
              onClick={() => {
                const url = `${window.location.origin}/shared/${trip.id}`;
                navigator.clipboard.writeText(url);
                alert('Share link copied!');
              }}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
              title="Share trip"
            >
              <Share2 className="h-5 w-5 text-content-muted" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-card border-b border-line sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1">
            {(['itinerary', 'autopilot', 'expenses'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium text-sm capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-content-muted hover:text-content'
                }`}
              >
                {tab === 'itinerary' ? '📋 Itinerary' : tab === 'autopilot' ? '🤖 Autopilot' : '💰 Expenses'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── GIS Map Preview Hero ── */}
        {hasActivities && trip.days && (
          <Link
            to={`/trips/${trip.id}/map`}
            className="block mb-6 group relative rounded-2xl overflow-hidden border border-line shadow-sm hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300"
          >
            {/* Map */}
            <div className="h-52 sm:h-60 pointer-events-none">
              <TripPreviewMap days={trip.days} className="h-full w-full" />
            </div>

            {/* Gradient overlay + CTA */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-4 w-4 text-primary-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-400">Spatial View</span>
                  </div>
                  <h3 className="text-white font-bold text-lg leading-tight">
                    Explore your trip on the map
                  </h3>
                  <p className="text-white/60 text-sm mt-0.5">
                    {tripActivities.length} locations · Transport network · Nearby places
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 group-hover:bg-primary-400 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg">
                  Open Map
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* ===================== ITINERARY TAB ===================== */}
        {activeTab === 'itinerary' && (
          <>
            {/* Generate button if no activities */}
            {!hasActivities && (
              <div className="text-center py-12 bg-surface-card rounded-2xl shadow-sm mb-6">
                <Sparkles className="h-16 w-16 text-primary-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-content-heading mb-2">Generate Your Itinerary</h2>
                <p className="text-content-muted mb-6 max-w-md mx-auto">
                  We'll use your preferences and our database of {trip.countryCode ? 'local' : ''} places
                  to create a smart, geographically-optimized itinerary.
                </p>
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-60"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate Smart Itinerary
                    </>
                  )}
                </button>
                {generateMutation.isError && (
                  <p className="mt-3 text-red-500 text-sm">
                    {(generateMutation.error as Error)?.message || 'Generation failed'}
                  </p>
                )}
              </div>
            )}

            {/* Main itinerary layout */}
            {hasActivities && (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Day sidebar */}
                <div className="lg:w-56 flex-shrink-0">
                  <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden mb-4">
                    {trip.days?.map((day: TripDay) => {
                      const actCount = day.activities?.length || 0;
                      const isSelected = selectedDay === day.dayNumber;
                      return (
                        <button
                          key={day.dayNumber}
                          onClick={() => setSelectedDay(day.dayNumber)}
                          className={`w-full px-4 py-3 text-left border-b border-gray-50 last:border-0 transition-colors ${
                            isSelected
                              ? 'bg-primary-500/10 border-l-4 border-l-primary-500'
                              : 'hover:bg-surface-hover'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className={`font-semibold ${isSelected ? 'text-primary-600' : 'text-content-heading'}`}>
                                Day {day.dayNumber}
                              </div>
                              <div className="text-xs text-content-muted">
                                {day.city && <span className="mr-1">{day.city}</span>}
                                {day.date && new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              actCount > 0 ? 'bg-primary-500/15 text-primary-600' : 'bg-surface-subtle text-content-faint'
                            }`}>
                              {actCount}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Regenerate & Add buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => generateMutation.mutate()}
                      disabled={generateMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-card hover:bg-surface-hover border border-line rounded-xl text-sm font-medium text-content transition-colors disabled:opacity-60"
                    >
                      {generateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Regenerate All
                    </button>
                    <button
                      onClick={() => setShowAddPanel(!showAddPanel)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Activity
                    </button>
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 min-w-0">
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-content-heading">
                        Day {selectedDay}
                        {currentDayData?.city && <span className="text-content-faint font-normal"> — {currentDayData.city}</span>}
                      </h2>
                      <p className="text-sm text-content-muted">
                        {dayActivities.length} activities
                        {dayActivities.length > 0 && ` · ${dayActivities[0]?.plannedStartTime || '08:00'} — ${dayActivities[dayActivities.length - 1]?.plannedStartTime || '18:00'}`}
                      </p>
                    </div>
                  </div>

                  {/* City transition mini-map */}
                  {cityTransition && trip.countryCode && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2 text-sm text-content-muted">
                        <Navigation className="h-4 w-4 text-primary-500" />
                        <span>Transit from <strong className="text-content">{cityTransition.from}</strong> → <strong className="text-content">{cityTransition.to}</strong></span>
                      </div>
                      <TripTransitMap
                        cities={[cityTransition.from, cityTransition.to]}
                        countryCode={trip.countryCode}
                        className="h-48"
                      />
                    </div>
                  )}

                  {/* Activity timeline */}
                  {dayActivities.length > 0 ? (
                    <div className="space-y-0">
                      {dayActivities.map((activity: TripActivity, idx: number) => (
                        <TimelineActivity
                          key={activity.id}
                          activity={activity}
                          index={idx}
                          isLast={idx === dayActivities.length - 1}
                          prevActivity={idx > 0 ? dayActivities[idx - 1] : null}
                          isEditing={editingActivityId === activity.id}
                          onEdit={() => setEditingActivityId(activity.id)}
                          onCancelEdit={() => setEditingActivityId(null)}
                          onSaveEdit={(data) => updateActivityMutation.mutate({ activityId: activity.id, data })}
                          onDelete={() => {
                            if (confirm('Remove this activity?')) {
                              deleteActivityMutation.mutate(activity.id);
                            }
                          }}
                          onDragStart={(e: React.DragEvent) => {
                            e.dataTransfer.setData('activityId', String(activity.id));
                            e.dataTransfer.setData('fromIndex', String(idx));
                          }}
                          onDrop={(e: React.DragEvent) => {
                            e.preventDefault();
                            const fromIdx = parseInt(e.dataTransfer.getData('fromIndex'), 10);
                            if (fromIdx === idx) return;
                            const ids = dayActivities.map((a: TripActivity) => a.id);
                            const [moved] = ids.splice(fromIdx, 1);
                            ids.splice(idx, 0, moved);
                            reorderMutation.mutate({ dayNumber: selectedDay, activityIds: ids });
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-surface-card rounded-xl">
                      <Calendar className="h-12 w-12 text-content-faint mx-auto mb-4" />
                      <p className="text-content-muted mb-4">No activities for Day {selectedDay}</p>
                      <button
                        onClick={() => setShowAddPanel(true)}
                        className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-600 font-medium"
                      >
                        <Plus className="h-4 w-4" /> Add one
                      </button>
                    </div>
                  )}
                </div>

                {/* Add Activity Panel */}
                {showAddPanel && (
                  <AddActivityPanel
                    tripId={tripId}
                    dayNumber={selectedDay}
                    onAdd={(place) => {
                      addActivityMutation.mutate({
                        dayNumber: selectedDay,
                        placeId: place.id,
                        name: place.name,
                        description: place.description || undefined,
                        category: place.mainCategory || undefined,
                        placeName: place.name,
                        latitude: place.latitude,
                        longitude: place.longitude,
                        durationMinutes: 60,
                        source: 'places_db',
                      });
                    }}
                    onAddManual={(data) => {
                      addActivityMutation.mutate({
                        dayNumber: selectedDay,
                        name: data.name,
                        description: data.description || undefined,
                        category: data.category || undefined,
                        startTime: data.startTime || undefined,
                        durationMinutes: data.durationMinutes,
                        placeName: data.placeName || data.name,
                        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
                        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
                        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : undefined,
                        source: 'manual',
                      });
                    }}
                    onClose={() => setShowAddPanel(false)}
                    isAdding={addActivityMutation.isPending}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* ===================== AUTOPILOT TAB ===================== */}
        {activeTab === 'autopilot' && isActive && (
          <AutopilotView
            trip={trip}
            suggestion={suggestionData?.suggestion}
            loading={suggestionLoading}
            onComplete={(aid) => completeActivityMutation.mutate(aid)}
            onSkip={(aid) => skipActivityMutation.mutate(aid)}
            onReplan={(reason) => replanMutation.mutate(reason)}
            onRefresh={() => refetchSuggestion()}
          />
        )}

        {activeTab === 'autopilot' && !isActive && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-content-faint mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-content-muted mb-2">Trip is not active</h2>
            <p className="text-content-muted">
              {trip.status === 'planning'
                ? 'Start your trip to use autopilot mode'
                : 'This trip has been completed'}
            </p>
          </div>
        )}

        {/* ===================== EXPENSES TAB ===================== */}
        {activeTab === 'expenses' && (
          <ExpensesView trip={trip} onAddExpense={() => setShowExpenseModal(true)} />
        )}
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Log Expense</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              logExpenseMutation.mutate({
                amount: parseFloat(expenseAmount),
                category: expenseCategory,
                description: expenseNote || undefined,
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Amount</label>
                  <input type="number" step="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} required className="w-full px-4 py-2.5 border border-line rounded-lg bg-surface-card text-content" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Category</label>
                  <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="w-full px-4 py-2.5 border border-line rounded-lg bg-surface-card text-content">
                    <option value="food">Food & Drinks</option>
                    <option value="transport">Transport</option>
                    <option value="accommodation">Accommodation</option>
                    <option value="activities">Activities</option>
                    <option value="shopping">Shopping</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Note</label>
                  <input type="text" value={expenseNote} onChange={(e) => setExpenseNote(e.target.value)} className="w-full px-4 py-2.5 border border-line rounded-lg bg-surface-card text-content" placeholder="What was this for?" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 px-4 py-2.5 border border-line rounded-lg bg-surface-card text-content font-medium">Cancel</button>
                <button type="submit" disabled={logExpenseMutation.isPending} className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-lg font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// TIMELINE ACTIVITY COMPONENT
// =====================================================
interface TimelineActivityProps {
  activity: TripActivity;
  index: number;
  isLast: boolean;
  prevActivity: TripActivity | null;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function TimelineActivity({
  activity,
  index,
  isLast,
  prevActivity,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onDragStart,
  onDrop,
}: TimelineActivityProps) {
  const [editName, setEditName] = useState(activity.name);
  const [editNotes, setEditNotes] = useState(activity.notes || '');
  const [editTime, setEditTime] = useState(activity.plannedStartTime || '');
  const meta = CATEGORY_META[activity.category || ''] || DEFAULT_META;

  // Calculate travel from previous activity
  let travelMinutes = 0;
  if (prevActivity && prevActivity.latitude && prevActivity.longitude && activity.latitude && activity.longitude) {
    const dist = haversineMeters(prevActivity.latitude, prevActivity.longitude, activity.latitude, activity.longitude);
    travelMinutes = Math.max(3, Math.round(dist / 6 / 60)); // ~22 km/h avg
  }

  const isCompleted = activity.status === 'completed';
  const isSkipped = activity.status === 'skipped';

  return (
    <div>
      {/* Travel connector */}
      {index > 0 && (
        <div className="flex items-center ml-6 py-1">
          <div className="w-0.5 h-4 bg-surface-subtle ml-[11px]" />
          {travelMinutes > 0 && (
            <div className="ml-4 flex items-center gap-1 text-xs text-content-faint">
              <Navigation className="h-3 w-3" />
              <span>~{travelMinutes} min travel</span>
            </div>
          )}
        </div>
      )}

      {/* Activity card */}
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`group relative flex gap-3 ${
          isCompleted ? 'opacity-60' : isSkipped ? 'opacity-40' : ''
        }`}
      >
        {/* Timeline dot + line */}
        <div className="flex flex-col items-center pt-4">
          {/* Time */}
          <div className="text-xs font-medium text-content-faint mb-1 w-12 text-right">
            {activity.plannedStartTime || ''}
          </div>
          {/* Dot */}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            isCompleted ? 'bg-primary-500/15' : isSkipped ? 'bg-surface-subtle' : meta.bg
          }`}>
            {isCompleted ? (
              <Check className="h-3.5 w-3.5 text-primary-500" />
            ) : isSkipped ? (
              <X className="h-3.5 w-3.5 text-content-faint" />
            ) : (
              <span className={meta.color}>{meta.icon}</span>
            )}
          </div>
          {/* Line down */}
          {!isLast && <div className="w-0.5 flex-1 bg-surface-subtle mt-1" />}
        </div>

        {/* Card */}
        <div className="flex-1 pb-4">
          {isEditing ? (
            /* Edit mode */
            <div className="bg-surface-card rounded-xl shadow-md border-2 border-primary-500/40 p-4">
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content font-medium"
                  placeholder="Activity name"
                  autoFocus
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-24 px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
                    placeholder="09:00"
                  />
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="flex-1 px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
                    placeholder="Notes..."
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={onCancelEdit} className="px-3 py-1.5 text-sm border border-line rounded-lg bg-surface-card text-content">Cancel</button>
                  <button
                    onClick={() => onSaveEdit({
                      name: editName,
                      notes: editNotes || undefined,
                      plannedStartTime: editTime || undefined,
                    })}
                    className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* View mode */
            <div className="bg-surface-card rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 cursor-grab active:cursor-grabbing">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-content-heading truncate">{activity.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-sm text-content-muted line-clamp-2 mb-1">{activity.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-content-faint">
                    {activity.plannedDurationMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {activity.plannedDurationMinutes} min
                      </span>
                    )}
                    {activity.estimatedCost && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> ~${activity.estimatedCost}
                      </span>
                    )}
                    {activity.notes && (
                      <span className="italic truncate max-w-[150px]">{activity.notes}</span>
                    )}
                  </div>
                </div>

                {/* Action buttons (visible on hover) */}
                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button onClick={onEdit} className="p-1.5 hover:bg-surface-hover rounded-lg text-content-muted hover:text-content">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={onDelete} className="p-1.5 hover:bg-red-500/10 rounded-lg text-content-muted hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <GripVertical className="h-4 w-4 text-content-muted" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// ADD ACTIVITY PANEL (Search + Quick Add)
// =====================================================
interface ManualActivityData {
  name: string;
  category: string;
  startTime: string;
  durationMinutes: number;
  description: string;
  placeName: string;
  latitude: string;
  longitude: string;
  estimatedCost: string;
}

interface AddActivityPanelProps {
  tripId: number;
  dayNumber: number;
  onAdd: (place: Place) => void;
  onAddManual: (data: ManualActivityData) => void;
  onClose: () => void;
  isAdding: boolean;
}

const CATEGORIES = [
  { value: 'attractions', label: 'Attractions' },
  { value: 'food_drink', label: 'Food & Drink' },
  { value: 'culture', label: 'Culture' },
  { value: 'nature', label: 'Nature' },
  { value: 'activities', label: 'Activities' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'accommodation', label: 'Accommodation' },
];

function AddActivityPanel({ tripId, dayNumber, onAdd, onAddManual, onClose, isAdding }: AddActivityPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState<ManualActivityData>({
    name: '', category: 'attractions', startTime: '', durationMinutes: 60,
    description: '', placeName: '', latitude: '', longitude: '', estimatedCost: '',
  });

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['itinerary-search', tripId, searchQuery],
    queryFn: () => api.searchItineraryPlaces(tripId, { query: searchQuery, limit: 12 }),
    enabled: searchQuery.length >= 2,
    staleTime: 30000,
  });

  const { data: nearbyData } = useQuery({
    queryKey: ['nearby-places', tripId, dayNumber],
    queryFn: () => api.getNearbyPlacesForDay(tripId, { dayNumber, radius: 3000, limit: 10 }),
    staleTime: 60000,
  });

  const places = searchQuery.length >= 2 ? (searchResults?.places || []) : (nearbyData?.places || []);

  const setField = (field: keyof ManualActivityData, value: string | number) =>
    setManual(prev => ({ ...prev, [field]: value }));

  if (showManual) {
    return (
      <div className="lg:w-80 flex-shrink-0">
        <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden sticky top-16">
          <div className="p-4 border-b border-line-light flex items-center justify-between">
            <button onClick={() => setShowManual(false)} className="flex items-center gap-1 text-sm text-content-muted hover:text-content">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <h3 className="font-semibold text-content-heading">Add Manually</h3>
            <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded-lg">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {/* Name — required */}
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={manual.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="e.g. Wat Pho Temple"
                className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">Category</label>
              <select
                value={manual.category}
                onChange={e => setField('category', e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Time + Duration */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-content-muted mb-1">Start time</label>
                <input
                  type="time"
                  value={manual.startTime}
                  onChange={e => setField('startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content-muted mb-1">Duration (min)</label>
                <input
                  type="number"
                  value={manual.durationMinutes}
                  min={15} max={480} step={15}
                  onChange={e => setField('durationMinutes', parseInt(e.target.value) || 60)}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">Notes <span className="text-content-faint">(optional)</span></label>
              <input
                type="text"
                value={manual.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="Ticket price, tips, etc."
                className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
              />
            </div>

            {/* Estimated cost */}
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">Est. cost (USD) <span className="text-content-faint">(optional)</span></label>
              <input
                type="number"
                value={manual.estimatedCost}
                min={0} step={1}
                onChange={e => setField('estimatedCost', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
              />
            </div>

            {/* Lat/Lng — optional */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-content-muted mb-1">Latitude <span className="text-content-faint">(opt)</span></label>
                <input
                  type="text"
                  value={manual.latitude}
                  onChange={e => setField('latitude', e.target.value)}
                  placeholder="13.7563"
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content-muted mb-1">Longitude <span className="text-content-faint">(opt)</span></label>
                <input
                  type="text"
                  value={manual.longitude}
                  onChange={e => setField('longitude', e.target.value)}
                  placeholder="100.5018"
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
                />
              </div>
            </div>

            {/* Google Places tip */}
            <div className="bg-primary-500/10 rounded-lg p-3 text-xs text-content-muted">
              <p className="font-medium mb-1">💡 Get coordinates from Google Maps</p>
              <p className="text-content-muted">Right-click any location on <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="underline text-primary-500">maps.google.com</a> → copy the lat/lng shown at the top of the menu.</p>
            </div>
          </div>

          <div className="p-4 border-t border-line-light">
            <button
              onClick={() => { if (manual.name.trim()) { onAddManual(manual); } }}
              disabled={!manual.name.trim() || isAdding}
              className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add to Itinerary
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:w-80 flex-shrink-0">
      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden sticky top-16">
        <div className="p-4 border-b border-line-light">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-content-heading">Add Activity</h3>
            <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded-lg">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-faint" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places..."
              className="w-full pl-9 pr-4 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {searching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-content-faint" />
            </div>
          )}

          {!searching && places.length === 0 && searchQuery.length >= 2 && (
            <div className="text-center py-8 text-content-faint text-sm">No places found</div>
          )}

          {!searching && searchQuery.length < 2 && places.length === 0 && (
            <div className="text-center py-8 text-content-faint text-sm">
              Search or browse nearby places
            </div>
          )}

          {!searching && places.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-content-faint uppercase tracking-wider bg-surface">
                {searchQuery.length >= 2 ? 'Search Results' : 'Nearby Places'}
              </div>
              {places.map((place: any) => {
                const pm = CATEGORY_META[place.mainCategory] || DEFAULT_META;
                return (
                  <button
                    key={place.id}
                    onClick={() => onAdd(place)}
                    disabled={isAdding}
                    className="w-full px-4 py-3 text-left hover:bg-surface-hover border-b border-gray-50 last:border-0 transition-colors disabled:opacity-60"
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${pm.bg}`}>
                        <span className={pm.color}>{pm.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{place.name}</div>
                        <div className="flex items-center gap-2 text-xs text-content-faint">
                          {place.city && <span>{place.city}</span>}
                          {place.rating && <span>⭐ {Number(place.rating).toFixed(1)}</span>}
                          {place.distanceMeters && <span>{(Number(place.distanceMeters) / 1000).toFixed(1)} km</span>}
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-content-faint flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Manual entry button */}
        <div className="border-t border-line-light p-3">
          <button
            onClick={() => setShowManual(true)}
            className="w-full py-2 text-sm text-primary-600 hover:text-primary-600 hover:bg-primary-500/10 rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add activity manually
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// AUTOPILOT VIEW
// =====================================================
function AutopilotView({
  trip: _trip,
  suggestion,
  loading,
  onComplete,
  onSkip,
  onReplan,
  onRefresh,
}: {
  trip: Trip;
  suggestion: any;
  loading: boolean;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onReplan: (reason: string) => void;
  onRefresh: () => void;
}) {
  const [showReplanModal, setShowReplanModal] = useState(false);
  const [replanReason, setReplanReason] = useState('');

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-4" />
        <p className="text-content-muted">Loading suggestion...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">Next Up</span>
        </div>
        {suggestion ? (
          <>
            <h2 className="text-2xl font-bold mb-2">{suggestion.activity?.name}</h2>
            {suggestion.activity?.placeName && (
              <p className="text-white/80 mb-4 flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {suggestion.activity.placeName}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => onComplete(suggestion.activity.id)} className="flex-1 bg-surface-card text-primary-600 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                <Check className="h-5 w-5" /> Done
              </button>
              <button onClick={() => onSkip(suggestion.activity.id)} className="px-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl">
                <SkipForward className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <Check className="h-12 w-12 mx-auto mb-3 text-white/60" />
            <p className="text-lg font-medium">All done for today!</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={onRefresh} className="bg-surface-card p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-primary-500" /> <span className="font-medium">Refresh</span>
        </button>
        <button onClick={() => setShowReplanModal(true)} className="bg-surface-card p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-primary-500" /> <span className="font-medium">Replan Day</span>
        </button>
      </div>

      {showReplanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Replan Today</h2>
            <div className="space-y-2 mb-4">
              {['Tired / want to rest', 'Weather is bad', 'Found something better', 'Running late'].map((reason) => (
                <button key={reason} onClick={() => setReplanReason(reason)} className={`w-full p-3 rounded-lg border text-left ${replanReason === reason ? 'border-primary-500 bg-primary-500/10' : 'border-line'}`}>
                  {reason}
                </button>
              ))}
            </div>
            <input type="text" value={replanReason} onChange={(e) => setReplanReason(e.target.value)} placeholder="Or type your reason..." className="w-full px-4 py-2.5 border border-line rounded-lg bg-surface-card text-content mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowReplanModal(false)} className="flex-1 px-4 py-2.5 border border-line rounded-lg bg-surface-card text-content font-medium">Cancel</button>
              <button onClick={() => { onReplan(replanReason); setShowReplanModal(false); }} disabled={!replanReason} className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-lg font-medium disabled:opacity-50">Replan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// EXPENSES VIEW
// =====================================================
function ExpensesView({ trip, onAddExpense }: { trip: Trip; onAddExpense: () => void }) {
  const expenses = (trip as any).expenses || [];
  const total = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  return (
    <div>
      <div className="bg-surface-card rounded-xl p-6 shadow-sm mb-6 text-center">
        <div className="text-sm text-content-muted mb-1">Total Spent</div>
        <div className="text-3xl font-bold text-content-heading">${total.toFixed(2)}</div>
      </div>
      <button onClick={onAddExpense} className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 mb-6">
        <DollarSign className="h-5 w-5" /> Log Expense
      </button>
      {expenses.length > 0 ? (
        <div className="space-y-2">
          {expenses.map((expense: any) => (
            <div key={expense.id} className="bg-surface-card p-4 rounded-xl shadow-sm flex items-center gap-3">
              <div className="text-2xl">
                {expense.category === 'food' ? '🍽️' :
                 expense.category === 'transport' ? '🚗' :
                 expense.category === 'accommodation' ? '🏨' :
                 expense.category === 'activities' ? '🎯' :
                 expense.category === 'shopping' ? '🛍️' : '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium capitalize">{expense.category}</div>
                {expense.description && <div className="text-sm text-content-muted truncate">{expense.description}</div>}
              </div>
              <div className="font-semibold">${Number(expense.amount).toFixed(2)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-surface-card rounded-xl">
          <DollarSign className="h-12 w-12 text-content-faint mx-auto mb-4" />
          <p className="text-content-muted">No expenses logged yet</p>
        </div>
      )}
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================
function getCountryFlag(code: string): string {
  const codePoints = code.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
