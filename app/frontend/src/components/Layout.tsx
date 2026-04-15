import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import {
  Home, Map, Compass, LogOut, Menu, X, Globe, Briefcase,
  BarChart3, Route, Network, Settings, HelpCircle, MapPinned, PenTool,
  Radio,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { ModeSwitcher, useMode } from './ModeSwitcher';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { isProvider, isMentor } = useMode();

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  // Derive display info from Firebase user
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Traveler';
  const initials = (() => {
    const src = user?.displayName || user?.email?.split('@')[0] || 'T';
    const parts = src.split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    // Single word — use first two characters
    return src.slice(0, 2).toUpperCase();
  })();
  const photoURL = user?.photoURL || null;

  const travelerNav = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Explore', href: '/explore', icon: Globe },
    { name: 'Network', href: '/map', icon: Network },
    { name: 'Routes', href: '/routes', icon: Compass },
    ...(user ? [
      { name: 'My Trips', href: '/trips', icon: Map },
      { name: 'Record', href: '/trips/record', icon: Radio },
    ] : []),
  ];

  const providerNav = [
    { name: 'Dashboard', href: '/provider', icon: BarChart3 },
    { name: 'My Routes', href: '/provider/routes', icon: Route },
    { name: 'Bookings', href: '/provider/bookings', icon: Briefcase },
  ];

  const mentorNav = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'My Routes', href: '/mentor', icon: MapPinned },
    { name: 'Draw Route', href: '/mentor/canvas', icon: PenTool },
    { name: 'Explore', href: '/explore', icon: Globe },
  ];

  const navigation = isMentor && user
    ? mentorNav
    : isProvider && user
    ? providerNav
    : travelerNav;

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Navigation */}
      <nav className="bg-surface-card shadow-sm sticky top-0 z-50 border-b border-line">
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex justify-between h-[86px]">
            {/* Logo — φ spacing: gap-3 (φ×1.85≈3) */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="12" className="fill-primary-600"/>
                    <g transform="translate(3,3) scale(0.75)">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="white"/>
                    </g>
                  </svg>
                </div>
                <span className="font-bold text-2xl text-content-heading tracking-tight">Roam<span className="text-primary-600">Richer</span></span>
              </Link>
            </div>

            {/* Desktop Navigation — φ spacing: gap-1.5 (~φ×0.93) */}
            <div className="hidden md:flex items-center gap-1.5">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-5 py-2.5 rounded-xl text-[15px] font-medium transition-colors flex items-center gap-2.5 ${
                    isActive(item.href)
                      ? 'bg-primary-500/10 text-primary-600'
                      : 'text-content-muted hover:bg-surface-hover'
                  }`}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.name}
                </Link>
              ))}
            </div>

            {/* User Menu — φ spacing: gap-4 (~φ×2.47) */}
            <div className="hidden md:flex items-center gap-4">
              <ThemeToggle />
              {user && <ModeSwitcher />}
              {user ? (
                <>
                  <Link
                    to="/trips/new"
                    className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl text-[15px] font-medium transition-colors flex items-center gap-2.5"
                  >
                    Plan Trip
                  </Link>

                  {/* Profile avatar + dropdown */}
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => setProfileOpen((v) => !v)}
                      className="flex items-center gap-2.5 rounded-full hover:ring-2 hover:ring-primary-500/30 transition-all"
                    >
                      {photoURL ? (
                        <img
                          src={photoURL}
                          alt={displayName}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-line"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center ring-2 ring-line">
                          <span className="text-white text-sm font-bold leading-none">{initials}</span>
                        </div>
                      )}
                    </button>

                    {/* Dropdown */}
                    {profileOpen && (
                      <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-surface-card border border-line shadow-2xl shadow-black/30 z-50 overflow-hidden">
                        {/* User card */}
                        <div className="px-4 py-4 bg-gradient-to-br from-primary-500/10 to-primary-600/5 border-b border-line">
                          <div className="flex items-center gap-3">
                            {photoURL ? (
                              <img
                                src={photoURL}
                                alt={displayName}
                                className="w-11 h-11 rounded-full object-cover ring-2 ring-primary-500/30"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                                <span className="text-white text-sm font-bold">{initials}</span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-content-heading truncate">{displayName}</p>
                              <p className="text-xs text-content-muted truncate">{user.email}</p>
                            </div>
                          </div>
                        </div>

                        {/* Menu items */}
                        <div className="py-1.5">
                          <Link
                            to="/trips"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-content hover:bg-surface-hover transition-colors"
                          >
                            <Map className="h-4 w-4 text-content-muted" />
                            My Trips
                          </Link>
                          <Link
                            to="/map"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-content hover:bg-surface-hover transition-colors"
                          >
                            <Network className="h-4 w-4 text-content-muted" />
                            Transport Network
                          </Link>
                          <button
                            onClick={() => setProfileOpen(false)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-content hover:bg-surface-hover transition-colors text-left"
                          >
                            <Settings className="h-4 w-4 text-content-muted" />
                            Account Settings
                          </button>
                          <button
                            onClick={() => setProfileOpen(false)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-content hover:bg-surface-hover transition-colors text-left"
                          >
                            <HelpCircle className="h-4 w-4 text-content-muted" />
                            Help & Support
                          </button>
                        </div>

                        {/* Sign out */}
                        <div className="border-t border-line p-2">
                          <button
                            onClick={() => { logout(); setProfileOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign out of Roam Richer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 text-content-muted"
              >
                {mobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-line bg-surface-card">
            <div className="px-4 py-3 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium ${
                    isActive(item.href)
                      ? 'bg-primary-500/10 text-primary-600'
                      : 'text-content-muted'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </span>
                </Link>
              ))}
              {user ? (
                <>
                  {/* Mobile user card */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-subtle/50 rounded-lg">
                    {photoURL ? (
                      <img
                        src={photoURL}
                        alt={displayName}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-line"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{initials}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-content-heading truncate">{displayName}</p>
                      <p className="text-xs text-content-muted truncate">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    to="/trips/new"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block bg-primary-500 text-white text-center px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Plan Trip
                  </Link>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-muted text-sm font-medium rounded-lg hover:text-foreground hover:bg-surface-hover transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out of Roam Richer
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block bg-primary-500 text-white text-center px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-surface-card border-t border-line mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2.5">
              <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" className="fill-primary-600"/>
                <g transform="translate(3,3) scale(0.75)">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="white"/>
                </g>
              </svg>
              <span className="text-content-muted text-sm">
                © 2026 Roam Richer. Travel smarter.
              </span>
            </div>
            <div className="flex gap-6 text-sm text-content-muted">
              <a href="#" className="hover:text-content">About</a>
              <a href="#" className="hover:text-content">Privacy</a>
              <a href="#" className="hover:text-content">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
