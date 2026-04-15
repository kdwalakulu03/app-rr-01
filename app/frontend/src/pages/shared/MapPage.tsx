import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Globe, Navigation, Clock, DollarSign, ExternalLink,
  ChevronRight, Loader2, MapPin, ArrowRight, Zap, X, ChevronDown,
} from 'lucide-react';
import NetworkMap from '../../components/NetworkMap';
import { api, TransportConnection, ReachableNode } from '../../lib/api';

// ─── Country data, grouped by region ──────────────────

const COUNTRY_REGIONS = [
  {
    label: 'Southeast Asia',
    countries: [
      { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
      { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
      { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
      { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
      { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
      { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
      { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
    ],
  },
  {
    label: 'East Asia',
    countries: [
      { code: 'JP', name: 'Japan', flag: '🇯🇵' },
      { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
    ],
  },
  {
    label: 'South Asia',
    countries: [
      { code: 'IN', name: 'India', flag: '🇮🇳' },
      { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
      { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
      { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
    ],
  },
  {
    label: 'Europe',
    countries: [
      { code: 'FR', name: 'France', flag: '🇫🇷' },
      { code: 'ES', name: 'Spain', flag: '🇪🇸' },
      { code: 'IT', name: 'Italy', flag: '🇮🇹' },
      { code: 'DE', name: 'Germany', flag: '🇩🇪' },
      { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
      { code: 'GR', name: 'Greece', flag: '🇬🇷' },
      { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
      { code: 'AT', name: 'Austria', flag: '🇦🇹' },
    ],
  },
  {
    label: 'Middle East & Africa',
    countries: [
      { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
      { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
      { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
    ],
  },
  {
    label: 'Oceania',
    countries: [
      { code: 'AU', name: 'Australia', flag: '🇦🇺' },
      { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
    ],
  },
];

const ALL_COUNTRIES = COUNTRY_REGIONS.flatMap((r) => r.countries);

// ─── Transport type icons / colors ────────────────────

const TRANSPORT_BADGE: Record<string, { bg: string; text: string }> = {
  flight: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  train: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  bus: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  minivan: { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  ferry: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  boat: { bg: 'bg-sky-500/20', text: 'text-sky-400' },
  taxi: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  tuktuk: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
  songthaew: { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-400' },
  walking: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

export default function MapPage() {
  const [selectedCountry, setSelectedCountry] = useState('TH');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [reachableMinutes, setReachableMinutes] = useState(360);
  const [showReachable, setShowReachable] = useState(false);
  const [transportFilter, setTransportFilter] = useState<string | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowCountryPicker(false);
      }
    };
    if (showCountryPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCountryPicker]);

  const activeCountry = ALL_COUNTRIES.find((c) => c.code === selectedCountry) ?? ALL_COUNTRIES[0];

  // ─── Fetch network GeoJSON ───────────────────

  const {
    data: networkData,
    isLoading: networkLoading,
    error: networkError,
  } = useQuery({
    queryKey: ['spatial-network', selectedCountry],
    queryFn: () => api.getSpatialNetwork(selectedCountry),
    enabled: !!selectedCountry,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Fetch selected node details ─────────────

  const { data: nodeDetail, isLoading: nodeLoading } = useQuery({
    queryKey: ['spatial-node', selectedNodeId],
    queryFn: () => api.getSpatialNode(selectedNodeId!),
    enabled: !!selectedNodeId,
  });

  // ─── Fetch reachability ──────────────────────

  const { data: reachableData, isLoading: reachableLoading } = useQuery({
    queryKey: ['spatial-reachable', selectedNodeId, reachableMinutes],
    queryFn: () => api.getReachableNodes(selectedNodeId!, reachableMinutes),
    enabled: !!selectedNodeId && showReachable,
  });

  // ─── Derived data ────────────────────────────

  const nodes = networkData?.nodes ?? { type: 'FeatureCollection' as const, features: [] };
  const edges = networkData?.edges ?? { type: 'FeatureCollection' as const, features: [] };

  const connections = useMemo(() => {
    if (!nodeDetail?.connections) return [];
    let filtered = nodeDetail.connections;
    if (transportFilter) {
      filtered = filtered.filter((c) => c.transportType === transportFilter);
    }
    return filtered.sort((a, b) => Number(a.distanceKm) - Number(b.distanceKm));
  }, [nodeDetail, transportFilter]);

  // Unique transport types for this node's connections
  const transportTypes = useMemo(() => {
    if (!nodeDetail?.connections) return [];
    return [...new Set(nodeDetail.connections.map((c) => c.transportType))].sort();
  }, [nodeDetail]);

  // ─── Handlers ────────────────────────────────

  const handleNodeClick = (nodeId: number) => {
    setSelectedNodeId(nodeId);
    setShowReachable(false);
    setTransportFilter(null);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  const formatCost = (cost: string | null, currency: string | null) => {
    if (!cost) return '—';
    return `$${Number(cost).toFixed(0)} ${currency || 'USD'}`;
  };

  // ─── Render ──────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-surface-card border-b border-line shrink-0">
        <Globe className="h-5 w-5 text-primary-500" />
        <h1 className="font-bold text-content-heading text-lg">Transport Network</h1>

        {/* Country toggle */}
        <div className="relative ml-3" ref={pickerRef}>
          <button
            onClick={() => setShowCountryPicker((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-line transition-colors"
          >
            <span className="text-base leading-none">{activeCountry.flag}</span>
            <span className="text-sm font-medium text-content">{activeCountry.name}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-content-muted transition-transform ${showCountryPicker ? 'rotate-180' : ''}`} />
          </button>

          {/* Country picker overlay */}
          {showCountryPicker && (
            <div className="absolute top-full left-0 mt-2 w-[420px] max-h-[70vh] overflow-y-auto rounded-xl bg-surface-card border border-line shadow-2xl shadow-black/40 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="sticky top-0 bg-surface-card border-b border-line px-4 py-3 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-content-heading">Explore the World</h3>
                    <p className="text-xs text-content-muted mt-0.5">
                      {ALL_COUNTRIES.length} countries · Real transport routes · Community-powered
                    </p>
                  </div>
                  <button onClick={() => setShowCountryPicker(false)} className="p-1 hover:bg-surface-hover rounded-lg transition-colors text-content-muted">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Regions */}
              <div className="p-3 space-y-3">
                {COUNTRY_REGIONS.map((region) => (
                  <div key={region.label}>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-content-faint px-1 mb-1.5">
                      {region.label}
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                      {region.countries.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => {
                            setSelectedCountry(c.code);
                            setSelectedNodeId(null);
                            setShowCountryPicker(false);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                            selectedCountry === c.code
                              ? 'bg-primary-500/15 ring-1 ring-primary-500/40 text-primary-400'
                              : 'hover:bg-surface-hover text-content'
                          }`}
                        >
                          <span className="text-base leading-none">{c.flag}</span>
                          <span className="text-sm font-medium truncate">{c.name}</span>
                          {selectedCountry === c.code && (
                            <span className="ml-auto text-[10px] font-bold text-primary-400">●</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-line px-4 py-2.5 bg-surface-subtle/50 rounded-b-xl">
                <p className="text-[10px] text-content-faint text-center">
                  🌏 The world's first collaborative spatial network for tourist movement
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content: map + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          {networkLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-10">
              <div className="flex items-center gap-2 text-content-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading network…
              </div>
            </div>
          )}
          {networkError && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-10">
              <div className="text-center">
                <p className="text-red-400 font-medium">Failed to load network</p>
                <p className="text-content-faint text-sm mt-1">Make sure the backend is running</p>
              </div>
            </div>
          )}
          <NetworkMap
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedNodeId}
            className="h-full"
          />
        </div>

        {/* Sidebar: node detail */}
        {selectedNodeId && (
          <div className="w-96 bg-surface-card border-l border-line overflow-y-auto shrink-0">
            {nodeLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
              </div>
            ) : nodeDetail ? (
              <div>
                {/* Node header */}
                <div className="p-4 border-b border-line">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary-500" />
                      <h2 className="font-bold text-lg text-content-heading">
                        {nodeDetail.node.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`https://www.google.com/maps/search/${encodeURIComponent(nodeDetail.node.name + ', ' + (nodeDetail.node.city || ''))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-content-muted hover:text-primary-400"
                        title="Open in Google Maps"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => setSelectedNodeId(null)}
                        className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-content-muted"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-content-muted">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      nodeDetail.node.hierarchy === 'international_hub'
                        ? 'bg-primary-500/20 text-primary-400'
                        : nodeDetail.node.hierarchy === 'regional_hub'
                        ? 'bg-orange-500/20 text-orange-400'
                        : nodeDetail.node.hierarchy === 'local_hub'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {nodeDetail.node.hierarchy.replace(/_/g, ' ')}
                    </span>
                    <span>{nodeDetail.node.connectionCount} connections</span>
                  </div>
                </div>

                {/* Reachability explorer */}
                <div className="p-4 border-b border-line">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary-500" />
                      <span className="text-sm font-medium text-content-heading">Reachable in</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={reachableMinutes}
                        onChange={(e) => setReachableMinutes(Number(e.target.value))}
                        className="text-xs bg-surface rounded px-2 py-1 border border-line text-content"
                      >
                        {[120, 240, 360, 480, 720, 1440].map((m) => (
                          <option key={m} value={m}>{m / 60} hours</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowReachable(true)}
                        className="text-xs bg-primary-500 hover:bg-primary-600 text-white rounded px-3 py-1 font-medium transition-colors"
                      >
                        Go
                      </button>
                    </div>
                  </div>

                  {reachableLoading && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-content-muted">
                      <Loader2 className="h-3 w-3 animate-spin" /> Computing…
                    </div>
                  )}

                  {showReachable && reachableData && !reachableLoading && (
                    <div className="mt-3 space-y-1.5">
                      {reachableData.reachable.length === 0 ? (
                        <p className="text-xs text-content-faint">No destinations reachable in {reachableMinutes / 60}h</p>
                      ) : (
                        reachableData.reachable.map((r: ReachableNode) => (
                          <button
                            key={r.nodeId}
                            onClick={() => handleNodeClick(r.nodeId)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover transition-colors text-left"
                          >
                            <div>
                              <span className="text-sm font-medium text-content">{r.name}</span>
                              <span className="ml-2 text-xs text-content-faint capitalize">
                                {r.hierarchy.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-content-muted">
                              <Clock className="h-3 w-3" />
                              {formatDuration(r.totalMinutes)}
                              <span className="text-content-faint">({r.hops} hop{r.hops !== 1 ? 's' : ''})</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Connections list */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-content-heading">
                      Connections ({connections.length}{transportFilter ? ` · ${transportFilter}` : ''})
                    </h3>
                  </div>

                  {/* Transport type filter pills */}
                  {transportTypes.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <button
                        onClick={() => setTransportFilter(null)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          !transportFilter
                            ? 'bg-primary-500 text-white'
                            : 'bg-surface-subtle text-content-muted hover:bg-surface-hover'
                        }`}
                      >
                        All
                      </button>
                      {transportTypes.map((t) => {
                        const badge = TRANSPORT_BADGE[t] || TRANSPORT_BADGE.walking;
                        return (
                          <button
                            key={t}
                            onClick={() => setTransportFilter(transportFilter === t ? null : t)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors capitalize ${
                              transportFilter === t
                                ? `${badge.bg} ${badge.text} ring-1 ring-current`
                                : 'bg-surface-subtle text-content-muted hover:bg-surface-hover'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="space-y-2">
                    {connections.map((conn: TransportConnection) => {
                      const badge = TRANSPORT_BADGE[conn.transportType] || TRANSPORT_BADGE.walking;
                      return (
                        <div
                          key={conn.edgeId}
                          className="rounded-lg bg-surface p-3 hover:bg-surface-hover transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                                {conn.transportType}
                              </span>
                              <ArrowRight className="h-3 w-3 text-content-faint" />
                              <button
                                onClick={() => handleNodeClick(conn.targetId)}
                                className="text-sm font-medium text-content hover:text-primary-400 transition-colors"
                              >
                                {conn.targetName}
                              </button>
                            </div>
                            <ChevronRight className="h-4 w-4 text-content-faint" />
                          </div>

                          <div className="mt-2 flex items-center gap-4 text-xs text-content-muted">
                            <span className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {Number(conn.distanceKm).toFixed(0)} km
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(conn.durationMinutes)}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCost(conn.typicalCostUsd, conn.costCurrency)}
                            </span>
                          </div>

                          {/* Google Maps deep-link */}
                          {conn.gmapsDeeplink && (
                            <a
                              href={conn.gmapsDeeplink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open in Google Maps
                            </a>
                          )}

                          {conn.tips && (
                            <p className="mt-1 text-xs text-content-faint italic">
                              💡 {conn.tips}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
