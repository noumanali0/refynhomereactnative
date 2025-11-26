// src/services/mapboxService.ts
/**
 * Mapbox Geocoding Service
 * Provides forward geocoding (address search) and reverse geocoding (coordinates to address)
 * Uses Mapbox Geocoding API v6
 */

import axios, { AxiosError } from 'axios';
import type { MapboxResponse, Address, MapboxError } from '@/types/mapbox';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
const BASE_URL = 'https://api.mapbox.com/search/geocode/v6';

// Request timeout (10 seconds)
const TIMEOUT = 10000;

class MapboxService {
  private axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
  });

  /**
   * Forward Geocoding - Search for addresses by query string
   * @param query - Search query (e.g., "Clifton Karachi")
   * @param options - Optional parameters
   * @returns Array of address suggestions
   */
  async forwardGeocode(
    query: string,
    options?: {
      proximity?: { longitude: number; latitude: number };
      limit?: number;
      country?: string; // ISO 3166-1 alpha-2 country code (e.g., "pk" for Pakistan)
    }
  ): Promise<Address[]> {
    try {
      if (!MAPBOX_TOKEN) {
        throw new Error('Mapbox access token is not configured');
      }

      const params: any = {
        q: query.trim(),
        access_token: MAPBOX_TOKEN,
        limit: options?.limit || 5,
        language: 'en',
        types: 'poi,neighborhood,locality,place,address',
      };

      // Add proximity for better local results
      if (options?.proximity) {
        params.proximity = `${options.proximity.longitude},${options.proximity.latitude}`;
      }

      // Restrict to specific country
      if (options?.country) {
        params.country = options.country;
      }

      const response = await this.axiosInstance.get<MapboxResponse>('/forward', {
        params,
      });

      return this.parseFeaturesToAddresses(response.data.features);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Reverse Geocoding - Convert coordinates to address
   * @param longitude - Longitude coordinate
   * @param latitude - Latitude coordinate
   * @returns Address object
   */
  async reverseGeocode(
    longitude: number,
    latitude: number
  ): Promise<Address | null> {
    try {
      if (!MAPBOX_TOKEN) {
        throw new Error('Mapbox access token is not configured');
      }

      const params = {
        longitude,
        latitude,
        access_token: MAPBOX_TOKEN,
        language: 'en',
      };

      const response = await this.axiosInstance.get<MapboxResponse>('/reverse', {
        params,
      });

      if (response.data.features.length === 0) {
        return null;
      }

      const addresses = this.parseFeaturesToAddresses(response.data.features);
      return addresses[0] || null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Parse Mapbox features to simplified Address objects
   */
  private parseFeaturesToAddresses(features: MapboxResponse['features']): Address[] {
    return features.map((feature) => {
      const props = feature.properties;
      const context = props.context || {};

      return {
        formatted: props.full_address || props.place_formatted || props.name,
        street: context.address?.street_name,
        city: context.place?.name || context.locality?.name || '',
        region: context.region?.name,
        country: context.country?.name || '',
        postalCode: context.postcode?.name,
        coordinates: {
          latitude: props.coordinates.latitude,
          longitude: props.coordinates.longitude,
        },
      };
    });
  }

  /**
   * Handle and normalize errors
   */
  private handleError(error: unknown): MapboxError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network error
      if (!axiosError.response) {
        return {
          message: 'Network error. Please check your internet connection.',
          code: 'NETWORK_ERROR',
        };
      }

      // API error
      const status = axiosError.response.status;
      const data: any = axiosError.response.data;

      if (status === 401) {
        return {
          message: 'Invalid Mapbox access token',
          code: 'INVALID_TOKEN',
          statusCode: status,
        };
      }

      if (status === 429) {
        return {
          message: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT',
          statusCode: status,
        };
      }

      return {
        message: data?.message || 'Failed to fetch location data',
        code: 'API_ERROR',
        statusCode: status,
      };
    }

    // Generic error
    return {
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }
}

export const mapboxService = new MapboxService();
