import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Clock, ChevronDown, X, Star } from 'lucide-react';
import { api, RouteTemplate } from '../lib/api';

export default function RoutesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const selectedCountry = searchParams.get('country') || '';
  const searchQuery = searchParams.get('q') || '';
  const sortBy = searchParams.get('sort') || 'popular';

  // Fetch countries for filter
  const { data: countriesData } = useQuery({
    queryKey: ['countries-with-routes'],
    queryFn: () => api.getCountriesWithRoutes(),
  });

  // Fetch routes
  const { data: routesData, isLoading } = useQuery({
    queryKey: ['routes', selectedCountry],
    queryFn: () => api.getRoutes(selectedCountry ? { country: selectedCountry } : undefined),
  });

  const countries = countriesData?.countries || [];
  const allRoutes = routesData?.routes || [];

  // Filter and sort routes
  const filteredRoutes = useMemo(() => {
    let routes = [...allRoutes];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      routes = routes.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          (r.description || '').toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case 'rating':
        routes.sort((a, b) => b.rating - a.rating);
        break;
      case 'duration-asc':
        routes.sort((a, b) => a.durationDays - b.durationDays);
        break;
      case 'duration-desc':
        routes.sort((a, b) => b.durationDays - a.durationDays);
        break;
      case 'popular':
      default:
        routes.sort((a, b) => b.timesUsed - a.timesUsed);
        break;
    }

    return routes;
  }, [allRoutes, searchQuery, sortBy]);

  const updateParams = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Explore Routes</h1>
          <p className="text-content-muted">
            Discover expertly crafted itineraries for your next adventure
          </p>
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-surface-card rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-content-faint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => updateParams('q', e.target.value)}
                placeholder="Search routes..."
                className="w-full pl-10 pr-4 py-2.5 border border-line rounded-lg bg-surface-card text-content focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Country Filter */}
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={(e) => updateParams('country', e.target.value)}
                className="appearance-none w-full md:w-48 px-4 py-2.5 pr-10 border border-line rounded-lg bg-surface-card text-content focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-surface-card"
              >
                <option value="">All Countries</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.routeCount})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-faint pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => updateParams('sort', e.target.value)}
                className="appearance-none w-full md:w-40 px-4 py-2.5 pr-10 border border-line rounded-lg bg-surface-card text-content focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-surface-card"
              >
                <option value="popular">Most Popular</option>
                <option value="rating">Top Rated</option>
                <option value="duration-asc">Shortest</option>
                <option value="duration-desc">Longest</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-faint pointer-events-none" />
            </div>
          </div>

          {/* Active Filters */}
          {(selectedCountry || searchQuery) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line-light">
              {selectedCountry && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-500/10 text-primary-600 rounded-full text-sm">
                  {countries.find((c) => c.code === selectedCountry)?.name}
                  <button onClick={() => updateParams('country', '')}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-500/10 text-primary-600 rounded-full text-sm">
                  "{searchQuery}"
                  <button onClick={() => updateParams('q', '')}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-content-muted">
          {isLoading ? (
            <span>Loading routes...</span>
          ) : (
            <span>
              {filteredRoutes.length} route{filteredRoutes.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>

        {/* Routes Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-surface-card rounded-xl overflow-hidden shadow-sm animate-pulse">
                <div className="h-48 bg-surface-subtle" />
                <div className="p-4">
                  <div className="h-5 bg-surface-subtle rounded mb-2 w-3/4" />
                  <div className="h-4 bg-surface-subtle rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="text-center py-16 bg-surface-card rounded-xl">
            <MapPin className="h-12 w-12 text-content-faint mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-content-muted mb-2">No routes found</h3>
            <p className="text-content-muted">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoutes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RouteCard({ route }: { route: RouteTemplate }) {
  const countryFlag = getCountryFlag(route.countryCode);

  return (
    <Link
      to={`/routes/${route.slug}`}
      className="bg-surface-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
    >
      {/* Cover Image */}
      <div className="h-48 bg-gradient-to-br from-primary-500/15 to-primary-500/20 relative overflow-hidden">
        {route.coverImage ? (
          <img
            src={route.coverImage}
            alt={route.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="h-12 w-12 text-primary-500" />
          </div>
        )}
        {/* Country Badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1.5 text-sm font-medium">
          <span>{countryFlag}</span>
          {route.country || route.countryCode}
        </div>
        {/* Rating Badge */}
        {route.rating > 0 && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-medium">
            <Star className="h-3.5 w-3.5 text-primary-500 fill-current" />
            {route.rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary-600 transition-colors line-clamp-1">
          {route.name}
        </h3>
        <p className="text-content-muted text-sm mb-3 line-clamp-2">{route.shortDescription || route.description}</p>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-content-muted">
            <Clock className="h-4 w-4" />
            {route.durationDays} days
          </div>
          {route.providerName && (
            <div className="text-content-muted">by {route.providerName}</div>
          )}
        </div>

        {/* Tags */}
        {route.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {route.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-surface-subtle text-content-muted rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
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
