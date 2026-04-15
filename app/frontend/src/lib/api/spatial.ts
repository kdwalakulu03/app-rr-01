// Spatial transport network API methods
import { api } from './client';
import type { TransportNode, TransportConnection, TransportEdge, ReachableNode } from './types';

export async function getSpatialNodes(params?: {
  country?: string;
  hierarchy?: string;
  type?: string;
  search?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  return api.request<{ nodes: TransportNode[] }>(`/api/spatial/nodes?${searchParams}`);
}

export async function getSpatialNode(nodeId: number) {
  return api.request<{
    node: TransportNode;
    connections: TransportConnection[];
  }>(`/api/spatial/nodes/${nodeId}`);
}

export async function getSpatialNetwork(countryCode: string) {
  return api.request<{
    country: string;
    nodes: GeoJSON.FeatureCollection;
    edges: GeoJSON.FeatureCollection;
  }>(`/api/spatial/network/${countryCode}`);
}

export async function getSpatialEdges(params?: {
  country?: string;
  type?: string;
  from?: number;
  to?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  return api.request<{ edges: TransportEdge[] }>(`/api/spatial/edges?${searchParams}`);
}

export async function getReachableNodes(nodeId: number, maxMinutes?: number) {
  const searchParams = new URLSearchParams();
  if (maxMinutes !== undefined) searchParams.append('maxMinutes', String(maxMinutes));
  return api.request<{
    fromNodeId: number;
    maxMinutes: number;
    maxHops: number;
    reachable: ReachableNode[];
    count: number;
  }>(`/api/spatial/reachable/${nodeId}?${searchParams}`);
}
