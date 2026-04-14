import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Route, Users2, DollarSign, TrendingUp,
  Eye, Star, ArrowRight, PlusCircle, Clock,
  Calendar, Activity
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';

export default function ProviderDashboard() {
  const { user } = useAuth();

  // Fetch provider stats (would be real API in production)
  const { data: statsData } = useQuery({
    queryKey: ['provider-stats'],
    queryFn: async () => {
      // Mock data for now
      return {
        totalRoutes: 12,
        activeBookings: 5,
        totalRevenue: 15420,
        monthlyViews: 2340,
        avgRating: 4.8,
        totalReviews: 89,
      };
    },
  });

  // Fetch recent bookings
  const { data: bookingsData } = useQuery({
    queryKey: ['provider-recent-bookings'],
    queryFn: async () => {
      // Mock data
      return {
        bookings: [
          { id: '1', travelerName: 'John D.', route: 'Cultural Triangle 7 Days', date: '2026-02-15', status: 'confirmed', amount: 450 },
          { id: '2', travelerName: 'Sarah M.', route: 'South Coast Explorer', date: '2026-02-18', status: 'pending', amount: 320 },
          { id: '3', travelerName: 'Michael K.', route: 'Tea Country Escape', date: '2026-02-22', status: 'confirmed', amount: 280 },
        ],
      };
    },
  });

  // Fetch top routes
  const { data: routesData } = useQuery({
    queryKey: ['provider-top-routes'],
    queryFn: async () => {
      return {
        routes: [
          { id: '1', title: 'Cultural Triangle 7 Days', views: 1240, bookings: 18, rating: 4.9, revenue: 8100 },
          { id: '2', title: 'South Coast Explorer', views: 890, bookings: 12, rating: 4.7, revenue: 3840 },
          { id: '3', title: 'Tea Country Escape', views: 650, bookings: 8, rating: 4.8, revenue: 2240 },
        ],
      };
    },
  });

  const stats = statsData || { totalRoutes: 0, activeBookings: 0, totalRevenue: 0, monthlyViews: 0, avgRating: 0, totalReviews: 0 };
  const bookings = bookingsData?.bookings || [];
  const routes = routesData?.routes || [];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Provider Dashboard</h2>
          <p className="text-gray-500 mb-6">Sign in to access your provider dashboard</p>
          <Link to="/login" className="bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
              <p className="text-gray-500 mt-1">Manage your routes, track bookings, and grow your business</p>
            </div>
            <Link
              to="/provider/routes/new"
              className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
            >
              <PlusCircle className="h-5 w-5" />
              Create Route
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            icon={Route}
            label="Total Routes"
            value={stats.totalRoutes}
            color="blue"
          />
          <StatCard
            icon={Users2}
            label="Active Bookings"
            value={stats.activeBookings}
            color="green"
          />
          <StatCard
            icon={DollarSign}
            label="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            color="emerald"
          />
          <StatCard
            icon={Eye}
            label="Monthly Views"
            value={stats.monthlyViews.toLocaleString()}
            color="purple"
          />
          <StatCard
            icon={Star}
            label="Avg Rating"
            value={stats.avgRating.toFixed(1)}
            color="amber"
          />
          <StatCard
            icon={Activity}
            label="Reviews"
            value={stats.totalReviews}
            color="rose"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Bookings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-900">Recent Bookings</h2>
              <Link to="/provider/bookings" className="text-primary-500 text-sm font-medium flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {bookings.map((booking) => (
                <div key={booking.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{booking.travelerName}</p>
                      <p className="text-sm text-gray-500">{booking.route}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${booking.amount}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(booking.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {bookings.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <Users2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No bookings yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Routes */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-900">Top Performing Routes</h2>
              <Link to="/provider/routes" className="text-primary-500 text-sm font-medium flex items-center gap-1">
                All Routes <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {routes.map((route, index) => (
                <div key={route.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{route.title}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {route.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            {route.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">${route.revenue}</p>
                      <p className="text-xs text-gray-500">{route.bookings} bookings</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
          <h3 className="text-xl font-bold mb-4">Grow Your Travel Business 🚀</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <QuickAction
              title="Create New Route"
              description="Add a unique travel experience"
              href="/provider/routes/new"
              icon={PlusCircle}
            />
            <QuickAction
              title="View Analytics"
              description="Deep dive into your performance"
              href="/provider/analytics"
              icon={TrendingUp}
            />
            <QuickAction
              title="Manage Bookings"
              description="Confirm and track all bookings"
              href="/provider/bookings"
              icon={Clock}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  color: 'blue' | 'green' | 'emerald' | 'purple' | 'amber' | 'rose';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
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

function QuickAction({ title, description, href, icon: Icon }: {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      to={href}
      className="bg-white/10 hover:bg-white/20 rounded-xl p-4 transition-colors group"
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon className="h-5 w-5" />
        <span className="font-semibold">{title}</span>
      </div>
      <p className="text-sm text-white/80">{description}</p>
    </Link>
  );
}
