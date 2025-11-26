// src/hooks/useAddressSearch.ts
/**
 * Hook for searching addresses with geocoding
 * Features: debouncing, loading states, error handling
 *
 * Currently using: OpenStreetMap (free, no API key)
 * To switch to Mapbox: Change import from openStreetMapService to mapboxService
 */

import { useState, useCallback, useRef } from 'react';
import debounce from 'lodash.debounce';
// TODO: Switch to mapboxService when public token is available
// import { mapboxService } from '@/services/mapboxService';
import { openStreetMapService } from '@/services/openStreetMapService';
import type { Address } from '@/types/mapbox';

interface UseAddressSearchOptions {
  debounceMs?: number; // Debounce delay in milliseconds (default: 500)
  minQueryLength?: number; // Minimum query length before searching (default: 3)
  limit?: number; // Max number of results (default: 5)
  proximity?: { latitude: number; longitude: number }; // Bias results near this location
  country?: string; // Restrict to country code (e.g., "pk" for Pakistan)
}

interface UseAddressSearchReturn {
  suggestions: Address[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearSuggestions: () => void;
  selectAddress: (address: Address) => void;
  selectedAddress: Address | null;
}

export function useAddressSearch(
  options: UseAddressSearchOptions = {}
): UseAddressSearchReturn {
  const {
    debounceMs = 500,
    minQueryLength = 3,
    limit = 5,
    proximity,
    country = 'pk', // Default to Pakistan
  } = options;

  const [suggestions, setSuggestions] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  // Keep track of the latest request to prevent race conditions
  const latestRequestRef = useRef<number>(0);

  /**
   * Perform the actual search
   */
  const performSearch = async (query: string, requestId: number) => {
    try {
      setLoading(true);
      setError(null);

      const proximityCoords = proximity
        ? { longitude: proximity.longitude, latitude: proximity.latitude }
        : undefined;

      // Using OpenStreetMap for now (switch to mapboxService when token available)
      const results = await openStreetMapService.forwardGeocode(query, {
        limit,
        proximity: proximityCoords,
        country,
      });

      // Only update if this is still the latest request
      if (requestId === latestRequestRef.current) {
        setSuggestions(results);
        setLoading(false);
      }
    } catch (err) {
      // Only update if this is still the latest request
      if (requestId === latestRequestRef.current) {
        const message =
          err instanceof Error ? err.message : 'Failed to search addresses';
        setError(message);
        setSuggestions([]);
        setLoading(false);
      }
    }
  };

  /**
   * Debounced search function
   */
  const debouncedSearch = useCallback(
    debounce((query: string, requestId: number) => {
      performSearch(query, requestId);
    }, debounceMs),
    [debounceMs, limit, proximity, country]
  );

  /**
   * Main search function exposed to component
   */
  const search = useCallback(
    (query: string) => {
      const trimmedQuery = query.trim();

      // Clear suggestions if query is too short
      if (trimmedQuery.length < minQueryLength) {
        setSuggestions([]);
        setLoading(false);
        setError(null);
        return;
      }

      // Increment request ID for race condition handling
      const requestId = ++latestRequestRef.current;

      // Show loading immediately
      setLoading(true);
      setError(null);

      // Perform debounced search
      debouncedSearch(trimmedQuery, requestId);
    },
    [debouncedSearch, minQueryLength]
  );

  /**
   * Clear all suggestions
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
    setLoading(false);
    latestRequestRef.current++;
  }, []);

  /**
   * Select an address from suggestions
   */
  const selectAddress = useCallback((address: Address) => {
    setSelectedAddress(address);
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    loading,
    error,
    search,
    clearSuggestions,
    selectAddress,
    selectedAddress,
  };
}
