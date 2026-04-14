import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users2, Calendar, Check, X, Clock, MessageSquare,
  Search, ChevronDown, Mail, Phone, DollarSign, Eye
} from 'lucide-react';

type BookingStatus = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

export default function ProviderBookings() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus>('all');
  const queryClient = useQueryClient();

  // Fetch bookings
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['provider-bookings'],
    queryFn: async () => {
      // Mock data
      return {
        bookings: [
          {
            id: '1',
            travelerName: 'John Davidson',
            travelerEmail: 'john.d@example.com',
            travelerPhone: '+1 555-0123',
            route: 'Cultural Triangle 7 Days',
            routeId: 'route-1',
            startDate: '2026-02-15',
            endDate: '2026-02-21',
            travelers: 2,
            totalAmount: 900,
            status: 'confirmed',
            createdAt: '2026-01-20T10:30:00Z',
            notes: 'Vegetarian meals preferred',
          },
          {
            id: '2',
            travelerName: 'Sarah Mitchell',
            travelerEmail: 'sarah.m@example.com',
            travelerPhone: '+44 7700 900123',
            route: 'South Coast Explorer',
            routeId: 'route-2',
            startDate: '2026-02-18',
            endDate: '2026-02-22',
            travelers: 1,
            totalAmount: 320,
            status: 'pending',
            createdAt: '2026-01-25T14:15:00Z',
            notes: '',
          },
          {
            id: '3',
            travelerName: 'Michael Kim',
            travelerEmail: 'mike.k@example.com',
            travelerPhone: '+82 10-1234-5678',
            route: 'Tea Country Escape',
            routeId: 'route-3',
            startDate: '2026-02-22',
            endDate: '2026-02-25',
            travelers: 4,
            totalAmount: 1120,
            status: 'confirmed',
            createdAt: '2026-01-28T09:45:00Z',
            notes: 'Family with 2 children (ages 8 and 12)',
          },
          {
            id: '4',
            travelerName: 'Emma Thompson',
            travelerEmail: 'emma.t@example.com',
            travelerPhone: '+61 400 123 456',
            route: 'Cultural Triangle 7 Days',
            routeId: 'route-1',
            startDate: '2026-01-10',
            endDate: '2026-01-16',
            travelers: 2,
            totalAmount: 900,
            status: 'completed',
            createdAt: '2025-12-15T11:20:00Z',
            notes: '',
          },
          {
            id: '5',
            travelerName: 'David Chen',
            travelerEmail: 'david.c@example.com',
            travelerPhone: '+1 555-9876',
            route: 'South Coast Explorer',
            routeId: 'route-2',
            startDate: '2026-02-01',
            endDate: '2026-02-05',
            travelers: 1,
            totalAmount: 320,
            status: 'cancelled',
            createdAt: '2026-01-05T16:30:00Z',
            notes: 'Had to cancel due to personal reasons',
          },
        ],
      };
    },
  });

  const bookings = bookingsData?.bookings || [];
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.travelerName.toLowerCase().includes(search.toLowerCase()) ||
      booking.route.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    totalRevenue: bookings.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.totalAmount, 0),
  };

  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // Would call API
      await new Promise(r => setTimeout(r, 500));
      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-1">Manage traveler bookings and reservations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Clock} label="Pending" value={stats.pending} color="amber" />
          <StatCard icon={Check} label="Confirmed" value={stats.confirmed} color="green" />
          <StatCard icon={Users2} label="Completed" value={stats.completed} color="blue" />
          <StatCard icon={DollarSign} label="Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} color="emerald" />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by traveler or route..."
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as BookingStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-3 rounded-xl font-medium transition-colors capitalize whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-primary-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />
            ))}
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onUpdateStatus={(status) => updateBookingStatus.mutate({ id: booking.id, status })}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Users2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500">
              {search ? 'Try a different search term' : 'Bookings will appear here when travelers book your routes'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  color: 'amber' | 'green' | 'blue' | 'emerald';
}) {
  const colors = {
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function BookingCard({ booking, onUpdateStatus }: { booking: any; onUpdateStatus: (status: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    confirmed: 'bg-green-100 text-green-700 border-green-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize border ${statusColors[booking.status as keyof typeof statusColors]}`}>
                {booking.status}
              </span>
              <span className="text-sm text-gray-500">
                Booked {new Date(booking.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{booking.travelerName}</h3>
            <p className="text-gray-600">{booking.route}</p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
              </span>
              <span className="flex items-center gap-1">
                <Users2 className="h-4 w-4" />
                {booking.travelers} traveler{booking.travelers > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">${booking.totalAmount}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
            
            {booking.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateStatus('confirmed')}
                  className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg"
                  title="Confirm booking"
                >
                  <Check className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onUpdateStatus('cancelled')}
                  className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg"
                  title="Decline booking"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="px-6 pb-6 pt-4 border-t border-gray-100 bg-gray-50">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
              <div className="space-y-2">
                <a href={`mailto:${booking.travelerEmail}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-500">
                  <Mail className="h-4 w-4" />
                  {booking.travelerEmail}
                </a>
                <a href={`tel:${booking.travelerPhone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-500">
                  <Phone className="h-4 w-4" />
                  {booking.travelerPhone}
                </a>
              </div>
            </div>
            {booking.notes && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Special Requests</h4>
                <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                  {booking.notes}
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
              <MessageSquare className="h-4 w-4" />
              Message Traveler
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
              <Eye className="h-4 w-4" />
              View Trip Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
