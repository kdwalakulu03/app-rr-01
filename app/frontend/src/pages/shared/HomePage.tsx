import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Compass, Map, Sparkles, ArrowRight, Globe, Clock, Users, MapPin, Star, Search } from 'lucide-react';
import { api, Country, RouteTemplate } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import HeroMap from '../../components/HeroMap';

export default function HomePage() {
  const { user } = useAuth();

  const { data: countriesData } = useQuery({
    queryKey: ['countries-with-places'],
    queryFn: () => api.getCountriesWithPlaces(),
  });

  const { data: routesData } = useQuery({
    queryKey: ['featured-routes'],
    queryFn: () => api.getRoutes({ limit: 6 }),
  });

  const countries = countriesData?.countries || [];
  const routes = routesData?.routes || [];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="max-w-7xl mx-auto px-4 py-20 sm:py-28 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary-500/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-primary-500 mb-6">
              <Globe className="h-4 w-4" />
              Spatial Intelligence · 186,000+ verified places
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Travel Routes,
              <span className="block text-primary-500">Precision-Mapped</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/80 mb-8">
              186,000 verified places. Optimal distances calculated. Real-time navigation
              based on where you are — not where a blog told you to be.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/routes"
                className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors shadow-lg"
              >
                <Compass className="h-5 w-5" />
                Explore Routes
              </Link>
              <Link
                to="/explore"
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition-colors"
              >
                <Search className="h-5 w-5" />
                Discover Places
              </Link>
              {user ? (
                <Link
                  to="/trips/new"
                  className="inline-flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-colors"
                >
                  <Sparkles className="h-5 w-5" />
                  Plan My Trip
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-colors"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-surface-card border-y border-line">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-3">How It Works</h2>
          <p className="text-content-muted text-center mb-10 max-w-2xl mx-auto">
            Every route is engineered from spatial data — real distances, real timing, real places.
          </p>
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Live map animation */}
            <div className="bg-surface rounded-2xl border border-line-light overflow-hidden h-[300px] lg:h-[380px] order-2 lg:order-1">
              <HeroMap />
            </div>
            {/* Steps */}
            <div className="space-y-8 order-1 lg:order-2">
              {[
                { icon: Compass, step: '01', title: 'Explore Routes', desc: 'Browse destination-mapped routes built from 186,000+ verified places. Every distance measured. Every path calculated.' },
                { icon: Map, step: '02', title: 'We Optimize', desc: 'Distances, timing, proximity — all calculated automatically. Your perfect day, sequenced for you.' },
                { icon: Sparkles, step: '03', title: 'Navigate Live', desc: 'Real-time guidance that adapts to your pace and location. Just follow — we handle the rest.' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-500/15 rounded-xl flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-1">Step {item.step}</div>
                    <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                    <p className="text-content-muted text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Routes */}
      {routes.length > 0 && (
        <section className="py-16 bg-surface">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold">Featured Routes</h2>
                <p className="text-content-muted mt-1">Hand-crafted itineraries with real places</p>
              </div>
              <Link
                to="/routes"
                className="text-primary-600 hover:text-primary-600 font-medium flex items-center gap-1"
              >
                View all {routesData?.total || ''} routes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {routes.map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Destinations */}
      <section className="py-16 bg-surface-card">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold">Popular Destinations</h2>
              <p className="text-content-muted mt-1">Real places, real data from 26 countries</p>
            </div>
            <Link
              to="/explore"
              className="text-primary-600 hover:text-primary-600 font-medium flex items-center gap-1"
            >
              Explore all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {countries.slice(0, 8).map((country) => (
              <CountryCard key={country.code} country={country} />
            ))}
          </div>

          {/* More countries strip */}
          {countries.length > 8 && (
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              {countries.slice(8, 20).map((country) => (
                <Link
                  key={country.code}
                  to={`/explore?country=${country.code}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-surface-subtle hover:bg-surface-hover rounded-full text-sm font-medium transition-colors"
                >
                  <span>{country.flag || getCountryFlag(country.code)}</span>
                  {country.name}
                </Link>
              ))}
              <Link
                to="/explore"
                className="inline-flex items-center gap-1 px-4 py-2 bg-primary-500/10 text-primary-600 hover:bg-primary-500/15 rounded-full text-sm font-medium transition-colors"
              >
                +{countries.length - 20} more
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid sm:grid-cols-4 gap-8 text-center">
            <div>
              <Globe className="h-8 w-8 mx-auto mb-3 text-white/70" />
              <div className="text-4xl font-bold mb-1">{countries.length || '26'}</div>
              <div className="text-white/70">Countries</div>
            </div>
            <div>
              <MapPin className="h-8 w-8 mx-auto mb-3 text-white/70" />
              <div className="text-4xl font-bold mb-1">186K+</div>
              <div className="text-white/70">Real Places</div>
            </div>
            <div>
              <Compass className="h-8 w-8 mx-auto mb-3 text-white/70" />
              <div className="text-4xl font-bold mb-1">{routesData?.total || '73'}+</div>
              <div className="text-white/70">Curated Routes</div>
            </div>
            <div>
              <Users className="h-8 w-8 mx-auto mb-3 text-white/70" />
              <div className="text-4xl font-bold mb-1">1,000+</div>
              <div className="text-white/70">Happy Travelers</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-surface-card">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Clock className="h-12 w-12 text-primary-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">
            Your Journey, Intelligently Routed
          </h2>
          <p className="text-content-muted text-lg mb-8">
            Routes built from real-world spatial data. Distances calculated. Paths optimized.
            All you do is follow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/routes"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold transition-colors"
            >
              Find Your Route
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 bg-surface-subtle hover:bg-surface-hover text-content px-8 py-4 rounded-xl font-semibold transition-colors"
            >
              Browse Places
              <MapPin className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Country card with real data
function CountryCard({ country }: { country: Country }) {
  const flag = country.flag || getCountryFlag(country.code);
  
  return (
    <Link
      to={`/explore?country=${country.code}`}
      className="bg-surface-card rounded-xl p-6 shadow-sm hover:shadow-lg transition-all group border border-line-light"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{flag}</span>
        <div>
          <h3 className="font-semibold text-lg group-hover:text-primary-600 transition-colors">
            {country.name}
          </h3>
          <p className="text-sm text-content-muted">
            {formatNumber(country.placeCount)} places
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-content-muted pt-3 border-t border-line-light">
        <span>{country.routeCount} routes</span>
        {country.dailyBudgetUsd && (
          <span>~${country.dailyBudgetUsd}/day</span>
        )}
      </div>
    </Link>
  );
}

// Route card
function RouteCard({ route }: { route: RouteTemplate }) {
  const countryFlag = getCountryFlag(route.countryCode);

  return (
    <Link
      to={`/routes/${route.slug}`}
      className="bg-surface-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all group border border-line-light"
    >
      <div className="h-44 relative overflow-hidden">
        {/* Background image: cover image or Unsplash route photo */}
        {(route.coverImage || getRouteImage(route.countryCode, route.id)) ? (
          <img
            src={route.coverImage || getRouteImage(route.countryCode, route.id)}
            alt={route.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-500/15 to-primary-500/30" />
        )}
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        {/* Route cities overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="flex items-center gap-2 text-white">
            <span className="text-2xl drop-shadow-lg">{countryFlag}</span>
            <span className="text-sm font-semibold drop-shadow-lg truncate">
              {route.cities?.slice(0, 3).join(' → ')}
            </span>
          </div>
        </div>
        {/* Country badge — top left */}
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1.5 text-sm font-medium text-white">
          <span>{countryFlag}</span>
          {route.countryCode}
        </div>
        {route.rating > 0 && (
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-medium text-white">
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" />
            {route.rating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary-600 transition-colors line-clamp-1">
          {route.name}
        </h3>
        <p className="text-content-muted text-sm mb-3 line-clamp-2">{route.shortDescription || route.description}</p>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3 text-content-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {route.durationDays} days
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {route.cities?.length || 0} cities
            </span>
          </div>
        </div>
        {route.tags?.length > 0 && (
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

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// Multiple Unsplash photos per country — routes cycle through for unique images
const COUNTRY_IMAGES: Record<string, string[]> = {
  TH: ['photo-1528181304800-259b08848526','photo-1563492065599-3520f775eeed','photo-1552465011-b4e21bf6e79a','photo-1504214208698-ea1916a2195a'],
  JP: ['photo-1493976040374-85c8e12f0c0e','photo-1545569341-9eb8b30979d9','photo-1540959733332-eab4deabeeaf','photo-1528360983277-13d401cdc186'],
  VN: ['photo-1528127269322-539152f5ae16','photo-1583417319070-4a69db38a482','photo-1555921015-5532091f6026','photo-1557750255-c76072a7aee1'],
  ID: ['photo-1537996194471-e657df975ab4','photo-1573790387438-4da905039392','photo-1518548419970-58e3b4079ab2'],
  IN: ['photo-1524492412937-b28074a5d7da','photo-1477587458883-47145ed94245','photo-1602216056096-3b40cc0c9944','photo-1561361513-2d000a50f0dc'],
  FR: ['photo-1502602898657-3e91760cbb34','photo-1537799943037-f5da89a65689','photo-1559128010-7c1ad6e1b6a7'],
  IT: ['photo-1523906834658-6e24ef2386f9','photo-1515542622106-78bda8ba0e5b','photo-1543429258-c5ca3eb3bae0','photo-1552832230-c0197dd311b5'],
  ES: ['photo-1539037116277-4db20889f2d7','photo-1558642452-9d2a7deb7f62','photo-1519046904884-53103b34b206'],
  GR: ['photo-1533105079780-92b9be482077','photo-1555993539-1732b0258235','photo-1516483638261-f4dbaf036963','photo-1570077188670-e3a8d69ac5ff'],
  PT: ['photo-1555881400-74d7acaacd6b','photo-1548707309-dcebeab36382','photo-1507525428034-b723cf961d3e'],
  TR: ['photo-1541432901042-2d8bd64b4a9b','photo-1565862828346-2be4e76856af','photo-1568781803078-37c1d51d4d79'],
  DE: ['photo-1467269204594-9661b134dd2b','photo-1595867818082-083862f3d630'],
  AU: ['photo-1506973035872-a4ec16b8e8d9','photo-1529108190281-9a4f620bc2d8'],
  NZ: ['photo-1469521669194-babb45599def','photo-1507699622108-4be3abd695ad','photo-1589196297857-6f86ad651009'],
  MY: ['photo-1596422846543-75c6fc197f07','photo-1595435934249-5df7ed86e1c0','photo-1580587771525-78b9dba3b914'],
  SG: ['photo-1525625293386-3f8f99389edd','photo-1565967511849-76a60a516170'],
  PH: ['photo-1518509562904-e7ef99cdcc86','photo-1573455235605-30c1f7daffc8'],
  LK: ['photo-1546708973-b339540b5162','photo-1580674285054-bed31e145f59','photo-1590001155093-a3c66ab0c3ff'],
  NP: ['photo-1544735716-ea9ef790f501','photo-1558799401-1dcba79834c2'],
  MM: ['photo-1540611025311-01df3cde54b5','photo-1558862107-d49ef2ed4f88'],
  EG: ['photo-1539768942893-daf53e736b68','photo-1553913861-c0fddf2619ee'],
  MA: ['photo-1489749798305-4fea3ae63d43','photo-1545042746-ec9e5ed59a38','photo-1569383746724-6f1b882b8f46'],
  CH: ['photo-1530122037265-a5f1f91d3b99','photo-1527668752968-14dc70a27c95'],
  AT: ['photo-1516550893923-42d28e5677af','photo-1609788063095-d71bf3c1a01e'],
  BD: ['photo-1583422409516-2895a77efded','photo-1596587743488-99f22d57b334'],
  TW: ['photo-1470004914212-05527e49370b','photo-1553649033-3fbc8d0fa3cb'],
};

function getRouteImage(code: string, routeId: number): string {
  const images = COUNTRY_IMAGES[code.toUpperCase()];
  if (!images || images.length === 0) return '';
  return `https://images.unsplash.com/${images[routeId % images.length]}?auto=format&fit=crop&w=600&q=80`;
}

function getCountryFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
