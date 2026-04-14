import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Search, MapPin, Star, ChevronDown, X, Globe,
  Filter, Grid3X3, List, Coffee, Hotel, Camera, ShoppingBag,
  Utensils, TreePine, Activity, Music,
} from 'lucide-react';
import { api, Place } from '../lib/api';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  food_drink: <Utensils className="h-4 w-4" />,
  accommodation: <Hotel className="h-4 w-4" />,
  attractions: <Camera className="h-4 w-4" />,
  shopping: <ShoppingBag className="h-4 w-4" />,
  nature: <TreePine className="h-4 w-4" />,
  activities: <Activity className="h-4 w-4" />,
  nightlife: <Music className="h-4 w-4" />,
  culture: <Camera className="h-4 w-4" />,
  wellness: <Coffee className="h-4 w-4" />,
};

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

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [page, setPage] = useState(0);
  const LIMIT = 50;

  const selectedCountry = searchParams.get('country') || '';
  const selectedCity = searchParams.get('city') || '';
  const selectedCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('q') || '';

  // Fetch countries
  const { data: countriesData } = useQuery({
    queryKey: ['countries-with-places'],
    queryFn: () => api.getCountriesWithPlaces(),
  });

  // Fetch cities for selected country
  const { data: citiesData } = useQuery({
    queryKey: ['cities', selectedCountry],
    queryFn: () => api.getPlaceCities(selectedCountry),
    enabled: !!selectedCountry,
  });

  // Fetch categories for selected country
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', selectedCountry],
    queryFn: () => api.getPlaceCategories(selectedCountry),
    enabled: !!selectedCountry,
  });

  // Fetch places
  const { data: placesData, isLoading: placesLoading } = useQuery({
    queryKey: ['places', selectedCountry, selectedCity, selectedCategory, searchQuery, page],
    queryFn: () => api.getPlaces({
      country: selectedCountry || undefined,
      city: selectedCity || undefined,
      category: selectedCategory || undefined,
      search: searchQuery || undefined,
      limit: LIMIT,
      offset: page * LIMIT,
    }),
    enabled: !!(selectedCountry || searchQuery),
  });

  const countries = countriesData?.countries || [];
  const cities = citiesData?.cities || [];
  const categories = useMemo(() => {
    const cats = categoriesData?.categories || [];
    // Group by main category
    const grouped: Record<string, number> = {};
    cats.forEach((c) => {
      grouped[c.mainCategory] = (grouped[c.mainCategory] || 0) + Number(c.count);
    });
    return Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, count]) => ({ mainCategory: cat, count }));
  }, [categoriesData]);

  const places = placesData?.places || [];
  const selectedCountryObj = countries.find((c) => c.code === selectedCountry);

  const updateParams = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Reset dependent filters
    if (key === 'country') {
      newParams.delete('city');
      newParams.delete('category');
    }
    setPage(0);
    setSearchParams(newParams);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-card border-b border-line">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Globe className="h-8 w-8 text-primary-500" />
                Explore Places
              </h1>
              <p className="text-content-muted mt-1">
                {selectedCountryObj
                  ? `${selectedCountryObj.flag || getCountryFlag(selectedCountryObj.code)} ${selectedCountryObj.name} — ${formatNumber(selectedCountryObj.placeCount)} places`
                  : 'Discover 186,000+ real places across 26 countries'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary-500/15 text-primary-600' : 'text-content-faint hover:text-content-muted'}`}
              >
                <Grid3X3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-500/15 text-primary-600' : 'text-content-faint hover:text-content-muted'}`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <div className="lg:w-72 flex-shrink-0">
            {/* Search */}
            <div className="bg-surface-card rounded-xl shadow-sm p-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-content-faint" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => updateParams('q', e.target.value)}
                  placeholder="Search places..."
                  className="w-full pl-10 pr-4 py-2.5 border border-line rounded-lg bg-surface-card text-content focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Country Filter */}
            <div className="bg-surface-card rounded-xl shadow-sm p-4 mb-4">
              <h3 className="font-semibold text-content-heading mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Country
              </h3>
              <div className="relative">
                <select
                  value={selectedCountry}
                  onChange={(e) => updateParams('country', e.target.value)}
                  className="appearance-none w-full px-4 py-2.5 pr-10 border border-line rounded-lg bg-surface-card text-content focus:ring-2 focus:ring-primary-500 bg-surface-card text-sm"
                >
                  <option value="">Select a country...</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({formatNumber(c.placeCount)})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-faint pointer-events-none" />
              </div>
            </div>

            {/* City Filter */}
            {selectedCountry && cities.length > 0 && (
              <div className="bg-surface-card rounded-xl shadow-sm p-4 mb-4">
                <h3 className="font-semibold text-content-heading mb-3">City</h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {selectedCity && (
                    <button
                      onClick={() => updateParams('city', '')}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-primary-600 bg-primary-500/10 font-medium flex items-center justify-between"
                    >
                      {selectedCity}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {cities
                    .filter((c) => c.city !== selectedCity)
                    .slice(0, 20)
                    .map((city) => (
                      <button
                        key={city.city}
                        onClick={() => updateParams('city', city.city)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-surface-hover flex items-center justify-between"
                      >
                        <span>{city.city}</span>
                        <span className="text-content-faint text-xs">{city.placeCount}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Category Filter */}
            {selectedCountry && categories.length > 0 && (
              <div className="bg-surface-card rounded-xl shadow-sm p-4 mb-4">
                <h3 className="font-semibold text-content-heading mb-3">Category</h3>
                <div className="space-y-1">
                  {selectedCategory && (
                    <button
                      onClick={() => updateParams('category', '')}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-primary-600 bg-primary-500/10 font-medium flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        {CATEGORY_ICONS[selectedCategory] || <MapPin className="h-4 w-4" />}
                        {selectedCategory.replace(/_/g, ' ')}
                      </span>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {categories
                    .filter((c) => c.mainCategory !== selectedCategory)
                    .map((cat) => (
                      <button
                        key={cat.mainCategory}
                        onClick={() => updateParams('category', cat.mainCategory)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-surface-hover flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          {CATEGORY_ICONS[cat.mainCategory] || <MapPin className="h-4 w-4" />}
                          <span className="capitalize">{cat.mainCategory.replace(/_/g, ' ')}</span>
                        </span>
                        <span className="text-content-faint text-xs">{cat.count}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* No country selected - show country grid */}
            {!selectedCountry && !searchQuery ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">Choose a destination</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {countries.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => updateParams('country', country.code)}
                      className="bg-surface-card rounded-xl p-5 shadow-sm hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{country.flag || getCountryFlag(country.code)}</span>
                        <div>
                          <h3 className="font-semibold group-hover:text-primary-600 transition-colors">
                            {country.name}
                          </h3>
                          <p className="text-sm text-content-muted">
                            {formatNumber(country.placeCount)} places
                          </p>
                        </div>
                      </div>
                      {country.dailyBudgetUsd && (
                        <div className="text-xs text-content-muted mt-1">
                          From ~${country.dailyBudgetUsd}/day
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Active filters */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {selectedCountry && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-500/10 text-primary-600 rounded-full text-sm font-medium">
                      {selectedCountryObj?.flag || getCountryFlag(selectedCountry)} {selectedCountryObj?.name}
                      <button onClick={() => updateParams('country', '')}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                  {selectedCity && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-500/10 text-primary-600 rounded-full text-sm font-medium">
                      <MapPin className="h-3.5 w-3.5" />
                      {selectedCity}
                      <button onClick={() => updateParams('city', '')}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-500/10 text-primary-600 rounded-full text-sm font-medium capitalize">
                      {selectedCategory.replace(/_/g, ' ')}
                      <button onClick={() => updateParams('category', '')}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                  <span className="text-sm text-content-muted ml-auto flex items-center gap-3">
                    {placesLoading ? 'Loading...' : (() => {
                      const total = placesData?.total ?? places.length;
                      const from = page * LIMIT + 1;
                      const to = Math.min(page * LIMIT + places.length, total);
                      return `Showing ${from}–${to} of ${formatNumber(total)} places`;
                    })()}
                    {!placesLoading && (
                      <>
                        <button
                          onClick={() => setPage(p => Math.max(0, p - 1))}
                          disabled={page === 0}
                          className="px-2 py-1 rounded bg-surface-subtle text-content-muted disabled:opacity-30 hover:bg-surface-hover text-xs"
                        >← Prev</button>
                        <button
                          onClick={() => setPage(p => p + 1)}
                          disabled={places.length < LIMIT}
                          className="px-2 py-1 rounded bg-surface-subtle text-content-muted disabled:opacity-30 hover:bg-surface-hover text-xs"
                        >Next →</button>
                      </>
                    )}
                  </span>
                </div>

                {/* Places Grid/List */}
                {placesLoading ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-surface-card rounded-xl p-4 shadow-sm animate-pulse">
                        <div className="h-5 bg-surface-subtle rounded w-3/4 mb-2" />
                        <div className="h-4 bg-surface-subtle rounded w-1/2 mb-2" />
                        <div className="h-4 bg-surface-subtle rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : places.length === 0 ? (
                  <div className="text-center py-16 bg-surface-card rounded-xl">
                    <MapPin className="h-12 w-12 text-content-faint mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-content-muted mb-2">No places found</h3>
                    <p className="text-content-muted">Try adjusting your filters</p>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {places.map((place) => (
                      <PlaceCard key={place.id} place={place} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {places.map((place) => (
                      <PlaceListItem key={place.id} place={place} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceCard({ place }: { place: Place }) {
  const catColor = CATEGORY_COLORS[place.mainCategory || ''] || 'bg-surface-subtle text-content';
  const mapsUrl = `https://www.google.com/maps/search/?q=${encodeURIComponent([place.name, place.city, place.country].filter(Boolean).join(' '))}`;

  return (
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
      className="bg-surface-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-line-light cursor-pointer block group">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-content-heading line-clamp-1 flex-1 group-hover:text-primary-600 transition-colors">{place.name}</h3>
        {Number(place.rating) > 0 && (
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <Star className="h-3.5 w-3.5 text-primary-500 fill-current" />
            <span className="text-sm font-medium">{Number(place.rating).toFixed(1)}</span>
          </div>
        )}
      </div>

      {place.city && (
        <p className="text-sm text-content-muted flex items-center gap-1 mb-2">
          <MapPin className="h-3.5 w-3.5" />
          {place.city}{place.district && `, ${place.district}`}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 mt-2">
        {place.mainCategory && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${catColor}`}>
            {place.mainCategory.replace(/_/g, ' ')}
          </span>
        )}
        {place.subCategory && place.subCategory !== place.mainCategory && (
          <span className="text-xs px-2 py-0.5 bg-surface-subtle text-content-muted rounded-full capitalize">
            {place.subCategory.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-primary-500 group-hover:text-primary-600 flex items-center gap-1">
        <MapPin className="h-3 w-3" /> View on Google Maps
      </p>
    </a>
  );
}

function PlaceListItem({ place }: { place: Place }) {
  const mapsUrl = `https://www.google.com/maps/search/?q=${encodeURIComponent([place.name, place.city, place.country].filter(Boolean).join(' '))}`;

  return (
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
      className="bg-surface-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-line-light flex items-center gap-4 cursor-pointer group">
      <div className="w-10 h-10 bg-primary-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
        {CATEGORY_ICONS[place.mainCategory || ''] || <MapPin className="h-5 w-5 text-primary-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-content-heading truncate group-hover:text-primary-600 transition-colors">{place.name}</h3>
        <p className="text-sm text-content-muted truncate">
          {place.city}{place.mainCategory && ` · ${place.mainCategory.replace(/_/g, ' ')}`}
        </p>
      </div>
      {Number(place.rating) > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Star className="h-3.5 w-3.5 text-primary-500 fill-current" />
          <span className="text-sm font-medium">{Number(place.rating).toFixed(1)}</span>
        </div>
      )}
      <span className="text-xs text-primary-500 flex-shrink-0 flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5" /> Maps
      </span>
    </a>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function getCountryFlag(code: string): string {
  const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
