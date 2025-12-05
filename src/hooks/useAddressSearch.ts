// src/hooks/useAddressSearch.ts
/**
 * Hook for searching addresses with geocoding
 * Features: debouncing, loading states, error handling
 *
 * Currently using: Google Places API (requires EXPO_PUBLIC_GOOGLE_PLACES_API_KEY)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import debounce from 'lodash.debounce';
import { googlePlacesService } from '@/services/googlePlacesService';
import type { Address } from '@/types/mapbox';

interface UseAddressSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  limit?: number;
  proximity?: { latitude: number; longitude: number };
  country?: string;
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
    debounceMs = 400,
    minQueryLength = 3,
    limit = 5,
    proximity,
    country = 'pk',
  } = options;

  const [suggestions, setSuggestions] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  // Track the latest request to prevent race conditions
  const latestRequestRef = useRef<number>(0);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Perform the actual search
   */
  const performSearch = useCallback(async (query: string, requestId: number) => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const proximityCoords = proximity
        ? { longitude: proximity.longitude, latitude: proximity.latitude }
        : undefined;

      const results = await googlePlacesService.forwardGeocode(query, {
        limit,
        proximity: proximityCoords,
        country,
      });

      // Only update if still mounted and this is the latest request
      if (mountedRef.current && requestId === latestRequestRef.current) {
        setSuggestions(results);
        setLoading(false);
      }
    } catch (err) {
      // Only update if still mounted and this is the latest request
      if (mountedRef.current && requestId === latestRequestRef.current) {
        const message = err instanceof Error
          ? err.message
          : 'Failed to search addresses';
        setError(message);
        setSuggestions([]);
        setLoading(false);
      }
    }
  }, [limit, proximity, country]);

  /**
   * Debounced search function - created once and stable
   */
  const debouncedSearchRef = useRef<ReturnType<typeof debounce> | null>(null);

  // Initialize debounced function
  useEffect(() => {
    debouncedSearchRef.current = debounce(
      (query: string, requestId: number, searchFn: typeof performSearch) => {
        searchFn(query, requestId);
      },
      debounceMs
    );

    return () => {
      debouncedSearchRef.current?.cancel();
    };
  }, [debounceMs]);

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
        debouncedSearchRef.current?.cancel();
        return;
      }

      // Increment request ID for race condition handling
      const requestId = ++latestRequestRef.current;

      // Show loading immediately
      setLoading(true);
      setError(null);

      // Perform debounced search
      debouncedSearchRef.current?.(trimmedQuery, requestId, performSearch);
    },
    [minQueryLength, performSearch]
  );

  /**
   * Clear all suggestions
   */
  const clearSuggestions = useCallback(() => {
    debouncedSearchRef.current?.cancel();
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
