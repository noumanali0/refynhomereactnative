// src/types/mapbox.ts
/**
 * TypeScript types for Mapbox Geocoding API v6
 * Documentation: https://docs.mapbox.com/api/search/geocoding/
 */

export interface MapboxCoordinates {
  latitude: number;
  longitude: number;
}

export interface MapboxContext {
  country?: {
    name: string;
    country_code: string;
    country_code_alpha_3: string;
  };
  region?: {
    name: string;
    region_code: string;
    region_code_full: string;
  };
  postcode?: {
    name: string;
  };
  place?: {
    name: string;
  };
  locality?: {
    name: string;
  };
  neighborhood?: {
    name: string;
  };
  address?: {
    name: string;
    address_number: string;
    street_name: string;
  };
}

export interface MapboxProperties {
  mapbox_id: string;
  name: string;
  name_preferred?: string;
  place_formatted: string;
  full_address?: string;
  coordinates: MapboxCoordinates;
  context?: MapboxContext;
  place_type?: string[];
}

export interface MapboxGeometry {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface MapboxFeature {
  type: 'Feature';
  id: string;
  geometry: MapboxGeometry;
  properties: MapboxProperties;
}

export interface MapboxResponse {
  type: 'FeatureCollection';
  features: MapboxFeature[];
  attribution: string;
}

// Simplified Address type for app usage
export interface Address {
  formatted: string;
  street?: string;
  city: string;
  region?: string;
  country: string;
  postalCode?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Error types
export interface MapboxError {
  message: string;
  code?: string;
  statusCode?: number;
}
