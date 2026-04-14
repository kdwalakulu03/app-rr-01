import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Route, PlusCircle, Search, Edit, Trash2, Eye,
  Star, MapPin, Users, MoreVertical, Copy, BarChart3
} from 'lucide-react';

export default function ProviderRoutes() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');

  // Fetch provider's routes
  const { data: routesData, isLoading } = useQuery({
    queryKey: ['provider-routes'],
    queryFn: async () => {
      // Mock data for now
      return {
        routes: [
          {
            id: '1',
            title: 'Cultural Triangle 7 Days',
            countryCode: 'LK',
            countryName: 'Sri Lanka',
            totalDays: 7,
            status: 'active',
            price: 450,
            views: 1240,
            bookings: 18,
            rating: 4.9,
            stops: ['Colombo', 'Sigiriya', 'Kandy', 'Ella'],
            createdAt: '2025-12-01',
          },
          {
            id: '2',
            title: 'South Coast Explorer',
            countryCode: 'LK',
            countryName: 'Sri Lanka',
            totalDays: 5,
            status: 'active',
            price: 320,
            views: 890,
            bookings: 12,
            rating: 4.7,
            stops: ['Galle', 'Mirissa', 'Tangalle', 'Yala'],
            createdAt: '2025-11-15',
          },
          {
            id: '3',
            title: 'Tea Country Escape',
            countryCode: 'LK',
            countryName: 'Sri Lanka',
            totalDays: 4,
            status: 'draft',
            price: 280,
            views: 0,
            bookings: 0,
            rating: 0,
            stops: ['Nuwara Eliya', 'Ella', 'Haputale'],
            createdAt: '2026-01-10',
          },
        ],
      };
    },
  });

  const routes = routesData?.routes || [];
  const filteredRoutes = routes.filter(route => {
    const matchesSearch = route.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || route.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Routes</h1>
              <p className="text-gray-500 mt-1">Create and manage your travel routes</p>
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

        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search routes..."
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'draft', 'archived'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-3 rounded-xl font-medium transition-colors capitalize ${
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

        {/* Routes Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredRoutes.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoutes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Route className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No routes found</h3>
            <p className="text-gray-500 mb-6">
              {search ? 'Try a different search term' : 'Create your first route to start earning'}
            </p>
            <Link
              to="/provider/routes/new"
              className="inline-flex items-center gap-2 bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold"
            >
              <PlusCircle className="h-5 w-5" />
              Create Route
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function RouteCard({ route }: { route: any }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    draft: 'bg-amber-100 text-amber-700',
    archived: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header with status */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[route.status as keyof typeof statusColors]}`}>
            {route.status}
          </span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-gray-500" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 w-40 z-10">
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Route
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Duplicate
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </button>
                <hr className="my-1" />
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        <h3 className="font-bold text-lg text-gray-900">{route.title}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
          <span className="text-lg">{getFlag(route.countryCode)}</span>
          <span>{route.countryName}</span>
          <span>•</span>
          <span>{route.totalDays} days</span>
        </div>
      </div>

      {/* Stops */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <MapPin className="h-4 w-4 text-primary-500" />
          {route.stops.join(' → ')}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-4 text-center border-t border-gray-100">
        <div>
          <div className="flex items-center justify-center gap-1 text-gray-500">
            <Eye className="h-3.5 w-3.5" />
            <span className="text-sm">{route.views}</span>
          </div>
          <p className="text-xs text-gray-400">Views</p>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-gray-500">
            <Users className="h-3.5 w-3.5" />
            <span className="text-sm">{route.bookings}</span>
          </div>
          <p className="text-xs text-gray-400">Bookings</p>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-amber-500">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="text-sm">{route.rating > 0 ? route.rating : '-'}</span>
          </div>
          <p className="text-xs text-gray-400">Rating</p>
        </div>
      </div>

      {/* Price & Action */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold text-gray-900">${route.price}</span>
          <span className="text-gray-500 text-sm"> / person</span>
        </div>
        <Link
          to={`/provider/routes/${route.id}`}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Manage
        </Link>
      </div>
    </div>
  );
}

function getFlag(code: string): string {
  const flags: Record<string, string> = {
    LK: '🇱🇰', TH: '🇹🇭', JP: '🇯🇵', VN: '🇻🇳', ID: '🇮🇩',
    IN: '🇮🇳', MY: '🇲🇾', PH: '🇵🇭', NP: '🇳🇵', KH: '🇰🇭',
  };
  return flags[code] || '🌍';
}
