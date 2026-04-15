import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, MapPin, Clock, ChevronDown, X, Star, Eye, GitFork,
  User, Compass,
} from 'lucide-react';
import { api, RouteTemplate } from '../../lib/api';

const API_URL = import.meta.env.VITE_API_URL || '';

// ─── Mentor route type from public API ───────────
interface MentorPublicRoute {
  id: number;
  title: string;
  description: string | null;
  country_code: string;
  region: string | null;
  cities: string[] | null;
  duration_days: number | null;
  travel_style: string | null;
  difficulty: string | null;
  view_count: number;
  save_count: number;
  fork_count: number;
  published_at: string;
  creator_name: string | null;
  creator_avatar: string | null;
  pin_count: number;
}

type SourceFilter = 'all' | 'editorial' | 'mentor';

export default function RoutesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [source, setSource] = useState<SourceFilter>('all');

  const selectedCountry = searchParams.get('country') || '';
  const searchQuery = searchParams.get('q') || '';
  const sortBy = searchParams.get('sort') || 'popular';

  // ─── Editorial routes ────────────────────────────
  const { data: countriesData } = useQuery({
    queryKey: ['countries-with-routes'],
    queryFn: () => api.getCountriesWithRoutes(),
  });

  const { data: routesData, isLoading: editorialLoading } = useQuery({
    queryKey: ['routes', selectedCountry],
    queryFn: () => api.getRoutes(selectedCountry ? { country: selectedCountry } : undefined),
  });

  // ─── Mentor published routes ────────────────────
  const { data: mentorData, isLoading: mentorLoading } = useQuery({
    queryKey: ['mentor-public-routes', selectedCountry],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100', sort: sortBy === 'rating' ? 'popular' : 'recent' });
      if (selectedCountry) params.set('country', selectedCountry);
      const res = await fetch(`${API_URL}/api/mentor/public?${params}`);
      if (!res.ok) return { routes: [] };
      return res.json() as Promise<{ routes: MentorPublicRoute[] }>;
    },
  });

  const countries = countriesData?.countries || [];
  const editorialRoutes = routesData?.routes || [];
  const mentorRoutes = mentorData?.routes || [];
  const isLoading = editorialLoading || mentorLoading;

  // ─── Unified list ────────────────────────────────
  type UnifiedRoute = {
    kind: 'editorial';
    data: RouteTemplate;
  } | {
    kind: 'mentor';
    data: MentorPublicRoute;
  };

  const unifiedRoutes = useMemo(() => {
    const list: UnifiedRoute[] = [];

    if (source !== 'mentor') {
      editorialRoutes.forEach(r => list.push({ kind: 'editorial', data: r }));
    }
    if (source !== 'editorial') {
      mentorRoutes.forEach(r => list.push({ kind: 'mentor', data: r }));
    }

    // Search filter
    const filtered = searchQuery
      ? list.filter(item => {
          const title = item.kind === 'editorial' ? item.data.name : item.data.title;
          const desc = item.data.description || '';
          const q = searchQuery.toLowerCase();
          return title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
        })
      : list;

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'rating') {
        const ra = a.kind === 'editorial' ? a.data.rating : 0;
        const rb = b.kind === 'editorial' ? b.data.rating : 0;
        return rb - ra;
      }
      if (sortBy === 'duration-asc') {
        const da = a.kind === 'editorial' ? a.data.durationDays : (a.data.duration_days || 0);
        const db = b.kind === 'editorial' ? b.data.durationDays : (b.data.duration_days || 0);
        return da - db;
      }
      if (sortBy === 'duration-desc') {
        const da = a.kind === 'editorial' ? a.data.durationDays : (a.data.duration_days || 0);
        const db = b.kind === 'editorial' ? b.data.durationDays : (b.data.duration_days || 0);
        return db - da;
      }
      // popular — editorial by timesUsed, mentor by view_count
      const va = a.kind === 'editorial' ? a.data.timesUsed : a.data.view_count;
      const vb = b.kind === 'editorial' ? b.data.timesUsed : b.data.view_count;
      return vb - va;
    });

    return filtered;
  }, [editorialRoutes, mentorRoutes, source, searchQuery, sortBy]);

  const updateParams = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value); else newParams.delete(key);
    setSearchParams(newParams);
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Explore Routes</h1>
          <p className="text-content-muted">
            Discover expertly crafted itineraries and real mentor-drawn travel routes
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
                className="appearance-none w-full md:w-48 px-4 py-2.5 pr-10 border border-line rounded-lg bg-surface-card text-content focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                className="appearance-none w-full md:w-40 px-4 py-2.5 pr-10 border border-line rounded-lg bg-surface-card text-content focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="popular">Most Popular</option>
                <option value="rating">Top Rated</option>
                <option value="duration-asc">Shortest</option>
                <option value="duration-desc">Longest</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-faint pointer-events-none" />
            </div>
          </div>

          {/* Source filter tabs */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-line-light">
            {([
              { key: 'all' as const, label: 'All Routes' },
              { key: 'editorial' as const, label: 'Editorial' },
              { key: 'mentor' as const, label: 'Mentor Routes' },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setSource(tab.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  source === tab.key
                    ? 'bg-primary-500/10 text-primary-600 ring-1 ring-primary-500/30'
                    : 'text-content-muted hover:bg-surface-hover'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-70">
                  {tab.key === 'all' ? editorialRoutes.length + mentorRoutes.length
                    : tab.key === 'editorial' ? editorialRoutes.length
                    : mentorRoutes.length}
                </span>
              </button>
            ))}
          </div>

          {/* Active Filters */}
          {(selectedCountry || searchQuery) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-line-light">
              {selectedCountry && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-500/10 text-primary-600 rounded-full text-sm">
                  {countries.find((c) => c.code === selectedCountry)?.name}
                  <button onClick={() => updateParams('country', '')}><X className="h-3.5 w-3.5" /></button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-500/10 text-primary-600 rounded-full text-sm">
                  "{searchQuery}"
                  <button onClick={() => updateParams('q', '')}><X className="h-3.5 w-3.5" /></button>
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
              {unifiedRoutes.length} route{unifiedRoutes.length !== 1 ? 's' : ''} found
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
        ) : unifiedRoutes.length === 0 ? (
          <div className="text-center py-16 bg-surface-card rounded-xl">
            <MapPin className="h-12 w-12 text-content-faint mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-content-muted mb-2">No routes found</h3>
            <p className="text-content-muted">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unifiedRoutes.map((item) =>
              item.kind === 'editorial' ? (
                <EditorialRouteCard key={`e-${item.data.id}`} route={item.data} />
              ) : (
                <MentorRouteCard key={`m-${item.data.id}`} route={item.data} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Editorial Route Card ──────────────────────────
function EditorialRouteCard({ route }: { route: RouteTemplate }) {
  const countryFlag = getCountryFlag(route.countryCode);

  return (
    <Link
      to={`/routes/${route.slug}`}
      className="bg-surface-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="h-48 bg-gradient-to-br from-primary-500/15 to-primary-500/20 relative overflow-hidden">
        {route.coverImage ? (
          <img src={route.coverImage} alt={route.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Compass className="h-12 w-12 text-primary-500" />
          </div>
        )}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1.5 text-sm font-medium">
          <span>{countryFlag}</span>
          {route.country || route.countryCode}
        </div>
        {route.rating > 0 && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-medium">
            <Star className="h-3.5 w-3.5 text-primary-500 fill-current" />
            {route.rating.toFixed(1)}
          </div>
        )}
        <div className="absolute bottom-3 left-3 bg-blue-500/90 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
          Editorial
        </div>
      </div>
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
        {route.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {route.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-surface-subtle text-content-muted rounded-full">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Mentor Route Card ─────────────────────────────
function MentorRouteCard({ route }: { route: MentorPublicRoute }) {
  const countryFlag = route.country_code ? getCountryFlag(route.country_code) : '🌍';

  return (
    <Link
      to={`/mentor/routes/${route.id}`}
      className="bg-surface-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="h-48 bg-gradient-to-br from-emerald-500/15 to-teal-500/20 relative overflow-hidden flex items-center justify-center">
        <MapPin className="h-12 w-12 text-emerald-500" />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1.5 text-sm font-medium">
          <span>{countryFlag}</span>
          {route.country_code || ''}
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-medium">
            <Eye className="h-3 w-3 text-gray-500" />{route.view_count}
          </div>
          {route.fork_count > 0 && (
            <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-medium">
              <GitFork className="h-3 w-3 text-gray-500" />{route.fork_count}
            </div>
          )}
        </div>
        <div className="absolute bottom-3 left-3 bg-emerald-500/90 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
          Mentor Route
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">
          {route.title}
        </h3>
        {route.description && (
          <p className="text-content-muted text-sm mb-3 line-clamp-2">{route.description}</p>
        )}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3 text-content-muted">
            {route.duration_days && (
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{route.duration_days} days</span>
            )}
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{route.pin_count} pins</span>
          </div>
          {route.creator_name && (
            <div className="flex items-center gap-1.5 text-content-muted text-xs">
              {route.creator_avatar ? (
                <img src={route.creator_avatar} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <User className="h-3.5 w-3.5" />
              )}
              {route.creator_name}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {route.travel_style && (
            <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full capitalize">{route.travel_style}</span>
          )}
          {route.difficulty && (
            <span className="text-xs px-2 py-0.5 bg-surface-subtle text-content-muted rounded-full capitalize">{route.difficulty}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function getCountryFlag(code: string): string {
  const codePoints = code.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
