// ─── Mentor Dashboard — list user's routes ────────
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, MapPin, Route, Eye, Heart, GitFork, Trash2,
  Upload, Edit3, Loader2, Clock,
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';

const API_URL = import.meta.env.VITE_API_URL || '';

interface MentorRoute {
  id: number;
  title: string;
  description: string;
  country_code: string;
  travel_style: string;
  difficulty: string;
  status: 'draft' | 'published' | 'archived';
  pin_count: number;
  segment_count: number;
  view_count: number;
  save_count: number;
  fork_count: number;
  duration_days: number | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export default function MentorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<MentorRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [publishing, setPublishing] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const getToken = useCallback(async () => {
    if (!user) return '';
    return (user as any).getIdToken?.() || '';
  }, [user]);

  const apiRequest = useCallback(async (path: string, options: RequestInit = {}) => {
    const token = await getToken();
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `API error ${res.status}`);
    }
    return res.json();
  }, [getToken]);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/mentor/routes');
      setRoutes(data.routes || []);
    } catch (err) {
      console.error('Failed to load routes:', err);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  const handlePublish = async (routeId: number) => {
    if (!confirm('Publish this route? It will become visible to all travelers.')) return;
    setPublishing(routeId);
    try {
      await apiRequest(`/api/mentor/routes/${routeId}/publish`, { method: 'POST' });
      await loadRoutes();
    } catch (err: any) {
      alert(err.message || 'Publish failed');
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async (routeId: number) => {
    if (!confirm('Delete this draft route? This cannot be undone.')) return;
    setDeleting(routeId);
    try {
      await apiRequest(`/api/mentor/routes/${routeId}`, { method: 'DELETE' });
      setRoutes(prev => prev.filter(r => r.id !== routeId));
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = filter === 'all' ? routes : routes.filter(r => r.status === filter);

  const drafts = routes.filter(r => r.status === 'draft').length;
  const published = routes.filter(r => r.status === 'published').length;
  const totalViews = routes.reduce((s, r) => s + (r.view_count || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-content-heading">My Routes</h1>
          <p className="text-sm text-content-muted mt-1">Draw real travel routes and share them with the world</p>
        </div>
        <button
          onClick={() => navigate('/mentor/canvas')}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl shadow transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Route
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Routes" value={routes.length} icon={Route} />
        <StatCard label="Drafts" value={drafts} icon={Edit3} />
        <StatCard label="Published" value={published} icon={Upload} accent />
        <StatCard label="Total Views" value={totalViews} icon={Eye} />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'draft', 'published'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30'
                : 'text-content-muted hover:bg-surface-hover'
            }`}
          >
            {f === 'all' ? `All (${routes.length})` : f === 'draft' ? `Drafts (${drafts})` : `Published (${published})`}
          </button>
        ))}
      </div>

      {/* Route list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-surface-card border border-line rounded-2xl">
          <Route className="w-12 h-12 text-content-faint mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-content-heading mb-1">
            {routes.length === 0 ? 'No routes yet' : 'No matching routes'}
          </h3>
          <p className="text-sm text-content-muted mb-4">
            {routes.length === 0 ? 'Create your first route to start sharing your travel knowledge' : 'Try a different filter'}
          </p>
          {routes.length === 0 && (
            <button
              onClick={() => navigate('/mentor/canvas')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl shadow transition-colors"
            >
              <Plus className="w-5 h-5" />
              Draw Your First Route
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(route => (
            <div
              key={route.id}
              className="bg-surface-card border border-line rounded-xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-content-heading truncate">
                      {route.title || 'Untitled Route'}
                    </h3>
                    <StatusBadge status={route.status} />
                    {route.country_code && (
                      <span className="text-xs text-content-muted bg-surface-hover px-2 py-0.5 rounded">
                        {route.country_code}
                      </span>
                    )}
                  </div>
                  {route.description && (
                    <p className="text-sm text-content-muted mb-2 line-clamp-2">{route.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-content-faint">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{route.pin_count} pins</span>
                    <span className="flex items-center gap-1"><Route className="w-3 h-3" />{route.segment_count} segments</span>
                    {route.duration_days && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{route.duration_days} days</span>
                    )}
                    {route.status === 'published' && (
                      <>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{route.view_count}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{route.save_count}</span>
                        <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{route.fork_count}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {route.status === 'draft' && (
                    <>
                      <button
                        onClick={() => navigate(`/mentor/canvas/${route.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-content rounded-lg hover:bg-surface-hover transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handlePublish(route.id)}
                        disabled={publishing === route.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        {publishing === route.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Publish
                      </button>
                      <button
                        onClick={() => handleDelete(route.id)}
                        disabled={deleting === route.id}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting === route.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                  {route.status === 'published' && (
                    <button
                      onClick={() => navigate(`/mentor/routes/${route.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────
function StatCard({ label, value, icon: Icon, accent }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>; accent?: boolean;
}) {
  return (
    <div className="bg-surface-card border border-line rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-emerald-500/10' : 'bg-surface-hover'}`}>
          <Icon className={`w-5 h-5 ${accent ? 'text-emerald-500' : 'text-content-muted'}`} />
        </div>
        <div>
          <div className="text-xl font-bold text-content-heading">{value}</div>
          <div className="text-xs text-content-muted">{label}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-amber-500/10 text-amber-600',
    published: 'bg-emerald-500/10 text-emerald-600',
    archived: 'bg-gray-500/10 text-gray-500',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}
