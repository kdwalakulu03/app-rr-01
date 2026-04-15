import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Calendar,
  Clock,
  Check,
  X,
  Compass,
  Share2,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react';
import { api } from '../../lib/api';

export default function SharedTripPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['shared-trip', id],
    queryFn: () => api.getSharedTrip(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data?.trip) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
        <Compass className="h-16 w-16 text-content-faint mb-4" />
        <h1 className="text-2xl font-bold text-content-muted mb-2">Trip Not Found</h1>
        <p className="text-content-muted mb-6">
          This trip may not exist or isn't being shared publicly.
        </p>
        <Link
          to="/routes"
          className="text-primary-600 hover:text-primary-600 font-medium"
        >
          Explore Routes
        </Link>
      </div>
    );
  }

  const trip = data.trip;
  const countryFlag = trip.countryCode
    ? getCountryFlag(trip.countryCode)
    : '🌍';

  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const shareUrl = window.location.href;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${trip.routeName || trip.name || 'My Trip'} on Roam Richer`,
          text: `Check out my trip!`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{countryFlag}</span>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">
                {trip.routeName || trip.name || 'My Trip'}
              </h1>
              <p className="text-white/80">{trip.cities?.join(', ') || 'Trip'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-white/90 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>
                {formatDate(startDate)} - {formatDate(endDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span>{trip.days?.length || '?'} days</span>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share Trip
          </button>
        </div>
      </div>

      {/* Trip Progress */}
      {trip.status === 'active' && (
        <div className="max-w-4xl mx-auto px-4 -mt-4">
          <div className="bg-surface-card rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Trip Progress</span>
              <span className="text-primary-600 font-semibold">
                Day {trip.currentDay} of {trip.days?.length || '?'}
              </span>
            </div>
            <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{
                  width: `${((trip.currentDay || 1) / (trip.days?.length || 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Itinerary */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold mb-6">Itinerary</h2>

        {(trip.days?.length || 0) > 0 ? (
          <div className="space-y-6">
            {trip.days?.map((day: any) => (
              <DayCard key={day.dayNumber} day={day} isCurrentDay={day.dayNumber === trip.currentDay} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-surface-card rounded-xl">
            <MapPin className="h-12 w-12 text-content-faint mx-auto mb-4" />
            <p className="text-content-muted">No itinerary details available</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <div className="bg-surface-card rounded-xl p-6 text-center border border-line">
          <h3 className="font-semibold text-lg mb-2">
            Want to take this trip yourself?
          </h3>
          <p className="text-content-muted mb-4">
            Create your own personalized version with Roam Richer's autopilot guidance.
          </p>
          <Link
            to={trip.routeSlug ? `/routes/${trip.routeSlug}` : '/routes'}
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            <Compass className="h-5 w-5" />
            Explore This Route
          </Link>
        </div>
      </div>
    </div>
  );
}

// Day Card Component
function DayCard({ day, isCurrentDay }: { day: any; isCurrentDay: boolean }) {
  const completedCount = day.activities?.filter((a: any) => a.status === 'completed').length || 0;
  const totalCount = day.activities?.length || 0;

  return (
    <div
      className={`bg-surface-card rounded-xl overflow-hidden shadow-sm ${
        isCurrentDay ? 'ring-2 ring-primary-500' : ''
      }`}
    >
      {/* Day Header */}
      <div className="p-4 border-b border-line-light flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isCurrentDay && (
            <span className="px-2 py-0.5 bg-primary-500/15 text-primary-600 text-xs font-medium rounded-full">
              Current
            </span>
          )}
          <h3 className="font-semibold">Day {day.dayNumber}</h3>
          {day.title && <span className="text-content-muted">– {day.title}</span>}
        </div>
        <span className="text-sm text-content-muted">
          {completedCount}/{totalCount} completed
        </span>
      </div>

      {/* Activities */}
      {day.activities?.length > 0 ? (
        <div className="divide-y divide-line-light">
          {day.activities.map((activity: any) => (
            <div
              key={activity.id}
              className={`p-4 flex items-start gap-3 ${
                activity.status === 'completed'
                  ? 'bg-primary-500/5'
                  : activity.status === 'skipped'
                  ? 'bg-surface opacity-60'
                  : ''
              }`}
            >
              {/* Status Icon */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  activity.status === 'completed'
                    ? 'bg-primary-500/15'
                    : activity.status === 'skipped'
                    ? 'bg-surface-subtle'
                    : 'bg-primary-500/15'
                }`}
              >
                {activity.status === 'completed' ? (
                  <Check className="h-4 w-4 text-primary-500" />
                ) : activity.status === 'skipped' ? (
                  <X className="h-4 w-4 text-content-faint" />
                ) : (
                  <MapPin className="h-4 w-4 text-primary-600" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="font-medium">{activity.title}</div>
                {activity.place && (
                  <div className="text-sm text-content-muted">{activity.place.name}</div>
                )}
                {activity.description && (
                  <p className="text-sm text-content-muted mt-1">{activity.description}</p>
                )}
              </div>

              {/* Time of Day */}
              {activity.timeOfDay && (
                <div className="flex items-center gap-1 text-sm text-content-faint">
                  {activity.timeOfDay === 'morning' && <Sun className="h-4 w-4" />}
                  {activity.timeOfDay === 'afternoon' && <Sunset className="h-4 w-4" />}
                  {activity.timeOfDay === 'evening' && <Moon className="h-4 w-4" />}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-content-faint">
          No activities for this day
        </div>
      )}
    </div>
  );
}

function getCountryFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
