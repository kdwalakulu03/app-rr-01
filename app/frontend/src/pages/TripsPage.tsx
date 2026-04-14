import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, MapPin, Play, Check, Clock, ArrowRight, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';

export default function TripsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['trips'],
    queryFn: () => api.getTrips(),
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: 'always',
    gcTime: 0, // Don't cache — always fetch fresh
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const handleDelete = (e: React.MouseEvent, tripId: number, tripName: string) => {
    e.preventDefault(); // Don't navigate to trip detail
    e.stopPropagation();
    if (window.confirm(`Delete "${tripName}"? This cannot be undone.`)) {
      deleteMutation.mutate(tripId);
    }
  };

  // Debug: log fetch errors
  useEffect(() => {
    if (error) console.error('Failed to fetch trips:', error);
  }, [error]);

  const trips = data?.trips || [];

  // Separate trips by status
  const activeTrips = trips.filter((t: any) => t.status === 'active');
  const planningTrips = trips.filter((t: any) => t.status === 'planning');
  const upcomingTrips = trips.filter((t: any) => t.status === 'upcoming');
  const completedTrips = trips.filter((t: any) => t.status === 'completed');

  if (!user) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Calendar className="h-16 w-16 text-content-faint mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your Trips</h1>
          <p className="text-content-muted mb-6">
            Sign in to view and manage your travel itineraries
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Sign In
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Trips</h1>
            <p className="text-content-muted">Manage your travel adventures</p>
          </div>
          <Link
            to="/trips/new"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl font-semibold"
          >
            <Plus className="h-5 w-5" />
            New Trip
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-surface-card rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-6 bg-surface-subtle rounded w-1/3 mb-3" />
                <div className="h-4 bg-surface-subtle rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16 bg-surface-card rounded-xl shadow-sm">
            <MapPin className="h-16 w-16 text-content-faint mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-content-muted mb-2">No trips yet</h2>
            <p className="text-content-muted mb-6">
              Start by browsing routes and creating your first trip
            </p>
            <Link
              to="/routes"
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-600 font-medium"
            >
              Browse Routes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Trips */}
            {activeTrips.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Play className="h-5 w-5 text-primary-500" />
                  Active Trips
                </h2>
                <div className="space-y-4">
                  {activeTrips.map((trip: any) => (
                    <TripCard key={trip.id} trip={trip} isActive onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}

            {/* Planning Trips */}
            {planningTrips.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <MapPin className="h-5 w-5 text-primary-500" />
                  Planning
                </h2>
                <div className="space-y-4">
                  {planningTrips.map((trip: any) => (
                    <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Trips */}
            {upcomingTrips.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Clock className="h-5 w-5 text-content-muted" />
                  Upcoming Trips
                </h2>
                <div className="space-y-4">
                  {upcomingTrips.map((trip: any) => (
                    <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Trips */}
            {completedTrips.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Check className="h-5 w-5 text-content-faint" />
                  Completed Trips
                </h2>
                <div className="space-y-4">
                  {completedTrips.map((trip: any) => (
                    <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface TripCardProps {
  trip: {
    id: number;
    name?: string;
    startDate: string | null;
    endDate: string | null;
    status: string;
    currentDay?: number;
    routeName?: string;
    countryCode?: string | null;
    cities?: string[];
  };
  isActive?: boolean;
  onDelete?: (e: React.MouseEvent, tripId: number, tripName: string) => void;
}

function TripCard({ trip, isActive, onDelete }: TripCardProps) {
  const startDate = trip.startDate ? new Date(trip.startDate) : null;
  const endDate = trip.endDate ? new Date(trip.endDate) : null;
  const countryFlag = trip.countryCode ? getCountryFlag(trip.countryCode) : '🌍';
  const totalDays = startDate && endDate
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Link
      to={`/trips/${trip.id}`}
      className={`block bg-surface-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${
        isActive ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-surface' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Country Flag */}
        <div className="text-3xl">{countryFlag}</div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1 truncate">
            {trip.routeName || trip.name || 'Custom Trip'}
          </h3>
          <div className="flex flex-wrap items-center gap-4 text-sm text-content-muted">
            {startDate && endDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(startDate)} - {formatDate(endDate)}
              </span>
            )}
            {trip.cities && trip.cities.length > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {trip.cities.join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Status / Progress + Delete */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            {isActive ? (
              <div>
                <div className="text-primary-500 font-medium mb-1">Day {trip.currentDay}</div>
                <div className="text-sm text-content-muted">
                  of {totalDays} days
                </div>
              </div>
            ) : trip.status === 'planning' ? (
              <div className="px-3 py-1 bg-primary-500/10 text-primary-600 rounded-full text-sm font-medium">
                Planning
              </div>
            ) : trip.status === 'upcoming' ? (
              <div className="px-3 py-1 bg-primary-500/10 text-primary-500 rounded-full text-sm font-medium">
                Upcoming
              </div>
            ) : (
              <div className="px-3 py-1 bg-surface-subtle text-content-muted rounded-full text-sm font-medium">
                Completed
              </div>
            )}
          </div>
          {onDelete && (
            <button
              onClick={(e) => onDelete(e, trip.id, trip.routeName || trip.name || 'this trip')}
              className="p-2 rounded-lg text-content-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Delete trip"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar for Active */}
      {isActive && totalDays > 0 && (
        <div className="mt-4">
          <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{
                width: `${((trip.currentDay || 1) / totalDays) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

function getCountryFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
