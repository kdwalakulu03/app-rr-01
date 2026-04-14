import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './providers/AuthProvider';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import RoutesPage from './pages/RoutesPage';
import RouteDetailPage from './pages/RouteDetailPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import CreateTripPage from './pages/CreateTripPage';
import LoginPage from './pages/LoginPage';
import SharedTripPage from './pages/SharedTripPage';
import ExplorePage from './pages/ExplorePage';
import TripMapPage from './pages/TripMapPage';
import MapPage from './pages/MapPage';
import { ProviderDashboard, ProviderRoutes, ProviderBookings, CreateRoute } from './pages/provider';

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
        {/* Provider routes */}
        <Route path="provider" element={<ProtectedRoute><ProviderDashboard /></ProtectedRoute>} />
        <Route path="provider/routes" element={<ProtectedRoute><ProviderRoutes /></ProtectedRoute>} />
        <Route path="provider/routes/new" element={<ProtectedRoute><CreateRoute /></ProtectedRoute>} />
        <Route path="provider/bookings" element={<ProtectedRoute><ProviderBookings /></ProtectedRoute>} />
      </Route>
      {/* Public shared trip page */}
      <Route path="/share/:token" element={<SharedTripPage />} />
    </Routes>
  );
}
