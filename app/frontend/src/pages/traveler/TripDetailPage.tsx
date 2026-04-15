// ─── TripDetailPage — trip detail orchestrator ───
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MapPin, Calendar, Check, RefreshCw,
  Share2, Sparkles, AlertCircle, Plus, Loader2, Map as MapIcon, Globe,
  ArrowRight, FileDown, ImageDown,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { TripActivity, TripDay } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import TripTransitMap from '../../components/TripTransitMap';
import TripPreviewMap from '../../components/TripPreviewMap';
import { toPng } from 'html-to-image';
import Modal, { ModalFooter } from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

// Sub-components
import { getCountryFlag } from './trip-detail/constants';
import TimelineActivity from './trip-detail/TimelineActivity';
import AddActivityPanel from './trip-detail/AddActivityPanel';
import AutopilotView from './trip-detail/AutopilotView';
import ExpensesView from './trip-detail/ExpensesView';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();

  // Show toast if navigated from trip creation
  useEffect(() => {
    if (searchParams.get('new') === '1' && !toastShownRef.current) {
      toastShownRef.current = true;
      setShowSavedToast(true);
      const fadeTimer = setTimeout(() => setToastFading(true), 3000);
      const hideTimer = setTimeout(() => setShowSavedToast(false), 3500);
      return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
    }
  }, [searchParams]);

  // Fetch trip data
  const { data: tripData, isLoading, error } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => api.getTrip(tripId),
    enabled: !!id,
  });

  // Mutations
  const generateMutation = useMutation({
    mutationFn: () => api.generateItinerary(tripId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip', id] }),
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (activityId: number) => api.deleteItineraryActivity(tripId, activityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip', id] }),
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ activityId, data }: { activityId: number; data: Record<string, unknown> }) =>
      api.updateActivity(tripId, activityId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip', id] }),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ dayNumber, activityIds }: { dayNumber: number; activityIds: number[] }) =>
      api.reorderDayActivities(tripId, dayNumber, activityIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip', id] }),
  });

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

  // Set first day with activities
  useEffect(() => {
    if (tripData?.trip?.days?.length) {
      const firstWithActivities = tripData.trip.days.find(
        (d: TripDay) => d.activities && d.activities.length > 0
      );
      if (firstWithActivities) setSelectedDay(firstWithActivities.dayNumber);
    }
  }, [tripData]);

  // Loading / error states
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !tripData?.trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-content-muted">Trip not found</p>
          <Link to="/trips" className="text-primary-500 hover:underline mt-2 block">← Back to trips</Link>
        </div>
      </div>
    );
  }

  const trip = tripData.trip;
  const isActive = trip.status === 'active';
  const hasActivities = trip.days?.some((d: TripDay) => d.activities && d.activities.length > 0);
  const currentDayData = trip.days?.find((d: TripDay) => d.dayNumber === selectedDay);
  const dayActivities = currentDayData?.activities || [];

  // Detect city transition (prev day vs this day)
  const prevDay = trip.days?.find((d: TripDay) => d.dayNumber === selectedDay - 1);
  const cityTransition = prevDay?.city && currentDayData?.city && prevDay.city !== currentDayData.city
    ? { from: prevDay.city, to: currentDayData.city }
    : null;

  // Count activities with coordinates
  const tripActivities = trip.days?.flatMap((d: TripDay) =>
    (d.activities || []).filter((a: TripActivity) => a.latitude && a.longitude)
  ) || [];

  return (
    <div className="min-h-screen bg-surface" ref={contentRef}>
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
              <ArrowLeft className="h-5 w-5 text-content-muted" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-content-heading truncate">{trip.name}</h1>
              <div className="flex items-center gap-3 text-sm text-content-muted">
                {trip.countryCode && (
                  <>
                    <span>{getCountryFlag(trip.countryCode)}</span>
                  </>
                )}
                {trip.startDate && trip.endDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(trip.startDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })} — {new Date(trip.endDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                {trip.cities?.length > 0 && (
                  <>
                    <span className="text-content-faint">·</span>
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
            <button
              onClick={async () => {
                try {
                  const token = await (user as any)?.getIdToken?.();
                  const apiUrl = import.meta.env.VITE_API_URL || '';
                  const res = await fetch(`${apiUrl}/api/trips/export/${trip.id}/export/pdf`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!res.ok) throw new Error('Export failed');
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${trip.name || 'itinerary'}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  alert('Failed to export PDF');
                }
              }}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
              title="Export PDF"
            >
              <FileDown className="h-5 w-5 text-content-muted" />
            </button>
            <button
              onClick={async () => {
                if (!contentRef.current) return;
                try {
                  const dataUrl = await toPng(contentRef.current, {
                    backgroundColor: '#ffffff',
                    pixelRatio: 2,
                  });
                  const a = document.createElement('a');
                  a.href = dataUrl;
                  a.download = `${trip.name || 'itinerary'}.png`;
                  a.click();
                } catch {
                  alert('Failed to export PNG');
                }
              }}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
              title="Export PNG"
            >
              <ImageDown className="h-5 w-5 text-content-muted" />
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

        {/* GIS Map Preview Hero */}
        {hasActivities && trip.days && (
          <Link
            to={`/trips/${trip.id}/map`}
            className="block mb-6 group relative rounded-2xl overflow-hidden border border-line shadow-sm hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300"
          >
            <div className="h-52 sm:h-60 pointer-events-none">
              <TripPreviewMap days={trip.days} className="h-full w-full" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-4 w-4 text-primary-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-400">Spatial View</span>
                  </div>
                  <h3 className="text-white font-bold text-lg leading-tight">Explore your trip on the map</h3>
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

        {/* ── ITINERARY TAB ── */}
        {activeTab === 'itinerary' && (
          <>
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
                    <><Loader2 className="h-5 w-5 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="h-5 w-5" /> Generate Smart Itinerary</>
                  )}
                </button>
                {generateMutation.isError && (
                  <p className="mt-3 text-red-500 text-sm">
                    {(generateMutation.error as Error)?.message || 'Generation failed'}
                  </p>
                )}
              </div>
            )}

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
                            isSelected ? 'bg-primary-500/10 border-l-4 border-l-primary-500' : 'hover:bg-surface-hover'
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

                  <div className="space-y-2">
                    <button
                      onClick={() => generateMutation.mutate()}
                      disabled={generateMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-card hover:bg-surface-hover border border-line rounded-xl text-sm font-medium text-content transition-colors disabled:opacity-60"
                    >
                      {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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
                        <MapPin className="h-4 w-4 text-primary-500" />
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
                            if (confirm('Remove this activity?')) deleteActivityMutation.mutate(activity.id);
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
                      <button onClick={() => setShowAddPanel(true)} className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-600 font-medium">
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

        {/* ── AUTOPILOT TAB ── */}
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
              {trip.status === 'planning' ? 'Start your trip to use autopilot mode' : 'This trip has been completed'}
            </p>
          </div>
        )}

        {/* ── EXPENSES TAB ── */}
        {activeTab === 'expenses' && (
          <ExpensesView trip={trip} onAddExpense={() => setShowExpenseModal(true)} />
        )}
      </div>

      {/* Expense Modal */}
      <Modal open={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Log Expense" maxWidth="max-w-md">
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
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setShowExpenseModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={logExpenseMutation.isPending} className="flex-1">Save</Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
