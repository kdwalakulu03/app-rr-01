// API barrel — re-exports everything for backward compatibility
// Existing code can continue: import { api, Trip, Place } from '../../lib/api'
// New code should prefer: import { api } from '../../lib/api/client'
//                          import type { Trip } from '../../lib/api/types'

// Client singleton
export { api } from './client';

// All types
export type {
  Country,
  Place,
  PlaceCategory,
  CityInfo,
  RouteTemplate,
  RouteDay,
  RouteActivity,
  Trip,
  TripDay,
  TripActivity,
  CreateTripInput,
  AutopilotSuggestion,
  TransportNode,
  TransportConnection,
  TransportEdge,
  ReachableNode,
} from './types';

// Domain modules (for targeted imports)
export * as countriesApi from './routes';
export * as routeTemplatesApi from './routeTemplates';
export * as tripsApi from './trips';
export * as itineraryApi from './itinerary';
export * as autopilotApi from './autopilot';
export * as spatialApi from './spatial';
export * as usersApi from './users';
