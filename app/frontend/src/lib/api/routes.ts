// Country & Place API methods
import { api } from './client';
import type { Country, Place, PlaceCategory, CityInfo } from './types';

// ==========================================
// Countries
// ==========================================

export async function getCountries() {
  return api.request<{ countries: Country[] }>('/api/countries');
}

export async function getCountriesWithPlaces() {
  return api.request<{ countries: Country[] }>('/api/countries/with-places');
}

export async function getCountriesWithRoutes() {
  return api.request<{ countries: Country[] }>('/api/countries/with-routes');
}

export async function getCountry(code: string) {
  return api.request<{ country: Country & { topCities: CityInfo[]; categories: PlaceCategory[] } }>(`/api/countries/${code}`);
}

// ==========================================
// Places
// ==========================================

export async function getPlaces(params: {
  country?: string;
  city?: string;
  category?: string;
  subCategory?: string;
  search?: string;
  minRating?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.append(key, String(value));
  });
  return api.request<{ places: Place[]; total?: number }>(`/api/places?${searchParams}`);
}

export async function getPlace(id: number) {
  return api.request<{ place: Place }>(`/api/places/${id}`);
}

export async function getPlaceCategories(country: string) {
  return api.request<{ categories: PlaceCategory[] }>(`/api/places/categories?country=${country}`);
}

export async function getPlaceCities(country: string) {
  return api.request<{ cities: CityInfo[] }>(`/api/places/cities?country=${country}`);
}

export async function getNearbyPlaces(lat: number, lng: number, radius?: number) {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (radius) params.append('radius', String(radius));
  return api.request<{ places: Place[] }>(`/api/places/nearby?${params}`);
}

export async function createUserPlace(data: {
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  city?: string;
  mainCategory: string;
  subCategory?: string;
  description?: string;
  website?: string;
  rating?: number;
  priceLevel?: number;
}) {
  return api.request<{ place: Place }>('/api/places/user', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
