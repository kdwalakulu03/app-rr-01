import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin, Clock, Calendar, ChevronRight, User, ArrowLeft,
  Sparkles, DollarSign, ArrowRight,
} from 'lucide-react';
import { api, RouteActivity } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';

export default function RouteDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['route', slug],
    queryFn: () => api.getRoute(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data?.route) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-content-muted mb-4">Route not found</h1>
        <Link to="/routes" className="text-primary-600 hover:text-primary-600">
          Browse all routes
        </Link>
      </div>
    );
  }

  const route = data.route;
  const currentDay = route.days?.find((d) => d.dayNumber === selectedDay);
  const countryFlag = getCountryFlag(route.countryCode);

  const handleStartTrip = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/trips/new?route=${route.slug}`);
  };

  const budgetLabel = { budget: '💵 Budget', moderate: '💳 Moderate', luxury: '💎 Luxury' }[route.budgetLevel] || route.budgetLevel;
  const paceLabel = { relaxed: '🐢 Relaxed', normal: '🚶 Balanced', fast: '🏃 Action' }[route.pace] || route.pace;

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link to="/routes" className="inline-flex items-center gap-1 text-white/80 hover:text-white mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Routes
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{countryFlag}</span>
                <span className="text-white/80">{route.country || route.countryCode}</span>
                {route.isOfficial && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Official</span>
                )}
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-4">{route.name}</h1>
              <p className="text-white/90 text-lg mb-6">{route.description}</p>

              {/* Route Meta */}
              <div className="flex flex-wrap gap-4 text-white/90 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>{route.durationDays} days</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>{route.cities?.length || 0} cities</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <span>{budgetLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>{paceLabel}</span>
                </div>
                {route.providerName && (
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    <span>by {route.providerName}</span>
                  </div>
                )}
              </div>

              {/* Cities Route */}
              {route.cities?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                  {route.cities.map((city, i) => (
                    <span key={city} className="flex items-center gap-1">
                      {city}
                      {i < route.cities.length - 1 && <ArrowRight className="h-3 w-3" />}
                    </span>
                  ))}
                </div>
              )}

              {/* Tags */}
              {route.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {route.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2.5 py-1 bg-white/15 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* CTA Card */}
            <div className="bg-surface-card rounded-2xl p-6 text-content-heading shadow-xl lg:w-80 flex-shrink-0">
              <div className="text-center mb-4">
                <div className="text-sm text-content-muted mb-1">Trip Duration</div>
                <div className="text-3xl font-bold text-primary-600">{route.durationDays} Days</div>
                {route.cities?.length > 0 && (
                  <div className="text-sm text-content-muted mt-1">
                    {route.startCity} → {route.endCity}
                  </div>
                )}
              </div>

              {/* Group Types */}
              {route.groupTypes?.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center mb-4">
                  {route.groupTypes.map((g) => (
                    <span key={g} className="text-xs px-2 py-1 bg-surface-subtle rounded-full capitalize">{g}</span>
                  ))}
                </div>
              )}

              <button
                onClick={handleStartTrip}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mb-3"
              >
                <Sparkles className="h-5 w-5" />
                Start This Trip
              </button>

              <p className="text-center text-sm text-content-muted">
                Free to use with autopilot guidance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Itinerary */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Day Selector */}
          <div className="lg:w-64 flex-shrink-0">
            <h2 className="font-semibold text-content-heading mb-4">
              Itinerary ({route.days?.length || 0} days)
            </h2>
            <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
              {route.days?.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => setSelectedDay(day.dayNumber)}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between border-b border-line-light last:border-0 transition-colors ${
                    selectedDay === day.dayNumber
                      ? 'bg-primary-500/10 text-primary-600'
                      : 'hover:bg-surface-hover'
                  }`}
                >
                  <div>
                    <div className="font-medium">Day {day.dayNumber}</div>
                    <div className="text-sm text-content-muted">{day.city || day.title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-content-faint">
                      {day.activities?.length || 0}
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 ${selectedDay === day.dayNumber ? 'text-primary-500' : 'text-content-faint'}`}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Day Details */}
          <div className="flex-1">
            {currentDay ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-1">
                    {currentDay.title || `Day ${currentDay.dayNumber}`}
                  </h2>
                  {currentDay.city && (
                    <p className="text-content-muted flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {currentDay.city}
                      {currentDay.overnightCity && currentDay.overnightCity !== currentDay.city && 
                        ` → overnight in ${currentDay.overnightCity}`}
                    </p>
                  )}
                </div>

                {/* Activities */}
                {currentDay.activities && currentDay.activities.length > 0 ? (
                  <div className="space-y-3">
                    {currentDay.activities
                      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                      .map((activity, idx) => (
                        <ActivityCard key={activity.id || idx} activity={activity} index={idx} />
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-surface-card rounded-xl">
                    <MapPin className="h-12 w-12 text-content-faint mx-auto mb-4" />
                    <p className="text-content-muted">No activities for this day yet</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-surface-card rounded-xl">
                <Calendar className="h-12 w-12 text-content-faint mx-auto mb-4" />
                <p className="text-content-muted">Select a day to view the itinerary</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityCard({ activity, index }: { activity: RouteActivity; index: number }) {
  const CATEGORY_COLORS: Record<string, string> = {
    food_drink: 'bg-primary-500/10 text-primary-500',
    accommodation: 'bg-primary-500/10 text-primary-500',
    attractions: 'bg-primary-500/10 text-primary-500',
    shopping: 'bg-primary-500/10 text-primary-500',
    nature: 'bg-primary-500/10 text-primary-500',
    activities: 'bg-primary-500/10 text-primary-500',
    nightlife: 'bg-primary-500/10 text-primary-500',
    culture: 'bg-primary-500/10 text-primary-500',
    wellness: 'bg-primary-500/10 text-primary-500',
  };

  const iconColor = CATEGORY_COLORS[activity.category || ''] || 'bg-primary-500/15 text-primary-600';

  return (
    <div className="bg-surface-card rounded-xl p-4 shadow-sm border border-line-light hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
          <span className="font-bold text-sm">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4 className="font-semibold text-content-heading">{activity.name}</h4>
            {activity.startTime && (
              <span className="text-xs text-content-faint ml-2 flex-shrink-0 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {activity.startTime}
              </span>
            )}
          </div>
          {activity.placeName && activity.placeName !== activity.name && (
            <p className="text-sm text-content-muted flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {activity.placeName}
            </p>
          )}
          {activity.description && (
            <p className="text-sm text-content-muted mt-1">{activity.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-content-faint">
            {activity.durationMinutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {activity.durationMinutes} min
              </span>
            )}
            {activity.category && (
              <span className="capitalize px-1.5 py-0.5 bg-surface-subtle rounded text-content-muted">
                {activity.category.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getCountryFlag(code: string): string {
  const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
