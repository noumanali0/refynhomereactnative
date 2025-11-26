// src/services/openStreetMapService.ts
/**
 * Geocoding Service using OpenStreetMap Nominatim API
 * Free, no API key required, good coverage for Pakistan
 * Can be swapped with Mapbox when public token is available
 */

import axios, { AxiosError } from 'axios';
import type { Address, MapboxError } from '@/types/mapbox';

const BASE_URL = 'https://nominatim.openstreetmap.org';

// Request timeout (10 seconds)
const TIMEOUT = 10000;

// Nominatim API response types
interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  address: {
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
    road?: string;
    house_number?: string;
  };
}

class OpenStreetMapService {
  private axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    headers: {
      'User-Agent': 'RefynHome/1.0', // Required by Nominatim
    },
  });

  /**
   * Forward Geocoding - Search for addresses by query string
   * @param query - Search query (e.g., "Paragon City Lahore")
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
      const params: any = {
        q: query.trim(),
        format: 'json',
        addressdetails: 1,
        limit: options?.limit || 7,
        'accept-language': 'en', // Force English results
      };

      // Restrict to specific country
      if (options?.country) {
        params.countrycodes = options.country;
      }

      // Add viewbox for proximity bias (creates a bounding box around the point)
      if (options?.proximity) {
        const { latitude, longitude } = options.proximity;
        // Create a ~50km bounding box around the point
        const delta = 0.5;
        params.viewbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
        params.bounded = 0; // Allow results outside viewbox but prioritize inside
      }

      const response = await this.axiosInstance.get<NominatimResult[]>('/search', {
        params,
      });

      return this.parseNominatimResults(response.data);
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
      const params = {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
        'accept-language': 'en', // Force English results
      };

      const response = await this.axiosInstance.get<NominatimResult>('/reverse', {
        params,
      });

      if (!response.data || !response.data.display_name) {
        return null;
      }

      const addresses = this.parseNominatimResults([response.data]);
      return addresses[0] || null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Clean city name by removing "District", "Division", etc.
   */
  private cleanCityName(rawCity: string): string {
    if (!rawCity) return '';

    // Remove common suffixes like "District", "Division", "Tehsil", etc.
    return rawCity
      .replace(/\s*(District|Division|Tehsil|Taluka|City|Metropolitan|Corporation)$/i, '')
      .trim();
  }

  /**
   * Parse Nominatim results to simplified Address objects
   */
  private parseNominatimResults(results: NominatimResult[]): Address[] {
    return results.map((result) => {
      const addr = result.address || {};

      // Get the city from various possible fields and clean it
      const rawCity = addr.city || addr.town || addr.village || addr.county || '';
      const city = this.cleanCityName(rawCity);

      // Get neighborhood/area for display
      const area = addr.neighbourhood || addr.suburb || '';

      // Build a cleaner formatted address
      const parts = [];
      if (area) parts.push(area);
      if (addr.road) parts.push(addr.road);
      if (city) parts.push(city);
      if (addr.state && addr.state !== city) parts.push(addr.state);

      const formatted = parts.length > 0 ? parts.join(', ') : result.display_name;

      return {
        formatted,
        street: addr.road,
        city,
        region: addr.state,
        country: addr.country || 'Pakistan',
        postalCode: addr.postcode,
        coordinates: {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
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

      if (status === 429) {
        return {
          message: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT',
          statusCode: status,
        };
      }

      return {
        message: data?.error || 'Failed to fetch location data',
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

export const openStreetMapService = new OpenStreetMapService();
