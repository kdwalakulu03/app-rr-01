import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './providers/AuthProvider';
import Layout from './components/Layout';

// Shared (public) pages
import { HomePage, RoutesPage, RouteDetailPage, ExplorePage, MapPage } from './pages/shared';
import { LoginPage } from './pages/shared';

// Traveler pages
import { TripsPage, CreateTripPage, TripDetailPage, TripMapPage, SharedTripPage, LiveRecord } from './pages/traveler';

// Provider pages
import { ProviderDashboard, ProviderRoutes, ProviderBookings, CreateRoute } from './pages/provider';

// Mentor pages
import { MentorCanvas, MentorDashboard, MentorRouteView } from './pages/mentor';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="routes/:slug" element={<RouteDetailPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="map" element={<MapPage />} />
        <Route
          path="trips"
          element={
            <ProtectedRoute>
              <TripsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="trips/new"
          element={
            <ProtectedRoute>
              <CreateTripPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="trips/:id"
          element={
            <ProtectedRoute>
              <TripDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="trips/:id/map"
          element={
            <ProtectedRoute>
              <TripMapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="trips/record"
          element={
            <ProtectedRoute>
              <LiveRecord />
            </ProtectedRoute>
          }
        />
        {/* Provider routes */}
        <Route path="provider" element={<ProtectedRoute><ProviderDashboard /></ProtectedRoute>} />
        <Route path="provider/routes" element={<ProtectedRoute><ProviderRoutes /></ProtectedRoute>} />
        <Route path="provider/routes/new" element={<ProtectedRoute><CreateRoute /></ProtectedRoute>} />
        <Route path="provider/bookings" element={<ProtectedRoute><ProviderBookings /></ProtectedRoute>} />

        {/* Mentor routes */}
        <Route path="mentor" element={<ProtectedRoute><MentorDashboard /></ProtectedRoute>} />
        <Route path="mentor/canvas" element={<ProtectedRoute><MentorCanvas /></ProtectedRoute>} />
        <Route path="mentor/canvas/:id" element={<ProtectedRoute><MentorCanvas /></ProtectedRoute>} />
        <Route path="mentor/routes/:id" element={<MentorRouteView />} />
      </Route>
      {/* Public shared trip page */}
      <Route path="/share/:token" element={<SharedTripPage />} />
    </Routes>
  );
}


