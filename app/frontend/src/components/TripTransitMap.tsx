import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import NetworkMap from './NetworkMap';
import type { FeatureCollection } from 'geojson';

interface TripTransitMapProps {
  /** Two or more city names to show the transit between */
  cities: string[];
  /** Country code for the network data */
  countryCode: string;
  /** CSS class for the container */
  className?: string;
}

/**
 * Embedded mini network map showing transport connections between
 * cities in a trip itinerary. Automatically filters to show only
 * the relevant nodes and edges.
 */
export default function TripTransitMap({ cities, countryCode, className = '' }: TripTransitMapProps) {
  const { data: networkData } = useQuery({
    queryKey: ['spatial-network', countryCode],
    queryFn: () => api.getSpatialNetwork(countryCode),
    enabled: !!countryCode && cities.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  // Filter nodes to only the cities in this trip
  const { filteredNodes, filteredEdges, edgeIds } = useMemo(() => {
    if (!networkData) {
      const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
      return { filteredNodes: empty, filteredEdges: empty, edgeIds: [] as number[] };
    }

    const citySet = new Set(cities.map((c) => c.toLowerCase()));

    // Find matching nodes
    const matchedNodes = networkData.nodes.features.filter((f) => {
      const name = (f.properties?.name ?? '').toLowerCase();
      const city = (f.properties?.city ?? '').toLowerCase();
      return citySet.has(name) || citySet.has(city);
    });

    const matchedNodeNames = new Set(matchedNodes.map((f) => f.properties?.name));

    // Find edges that connect any two of these matched nodes
    const matchedEdges = networkData.edges.features.filter((f) => {
      const src = f.properties?.sourceName;
      const tgt = f.properties?.targetName;
      return matchedNodeNames.has(src) && matchedNodeNames.has(tgt);
    });

    const ids = matchedEdges.map((f) => f.properties?.id).filter(Boolean) as number[];

    return {
      filteredNodes: { type: 'FeatureCollection' as const, features: matchedNodes },
      filteredEdges: { type: 'FeatureCollection' as const, features: matchedEdges },
      edgeIds: ids,
    };
  }, [networkData, cities]);

  // Don't render if we don't have at least 2 matching nodes
  if (filteredNodes.features.length < 2) return null;

  return (
    <div className={`rounded-xl overflow-hidden border border-line ${className}`}>
      <NetworkMap
        nodes={filteredNodes}
        edges={filteredEdges}
        highlightEdgeIds={edgeIds}
        mini
        className="h-full"
      />
    </div>
  );
}
