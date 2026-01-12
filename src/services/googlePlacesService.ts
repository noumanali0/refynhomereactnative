// src/services/googlePlacesService.ts
/**
 * Google Places API Service
 * Uses Places Autocomplete for address search
 * Requires EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in .env
 */

import type { Address, MapboxError } from '@/types/mapbox';

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

// API endpoints
const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

// Request timeout (30 seconds - increased for emulator compatibility)
const TIMEOUT = 30000;

// Google Places API response types
interface GooglePrediction {
    place_id: string;
    description: string;
    structured_formatting: {
        main_text: string;
        secondary_text: string;
    };
    terms: Array<{
        offset: number;
        value: string;
    }>;
    types: string[];
}

interface GoogleAutocompleteResponse {
    predictions: GooglePrediction[];
    status: string;
    error_message?: string;
}

interface GooglePlaceDetails {
    place_id: string;
    formatted_address: string;
    name: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    address_components: Array<{
        long_name: string;
        short_name: string;
        types: string[];
    }>;
}

interface GoogleDetailsResponse {
    result: GooglePlaceDetails;
    status: string;
    error_message?: string;
}

class GooglePlacesService {
    private apiKey: string;

    constructor() {
        this.apiKey = GOOGLE_PLACES_API_KEY;
    }

    /**
     * Check if API key is configured
     */
    isConfigured(): boolean {
        return !!this.apiKey && this.apiKey.length > 0;
    }

    /**
     * Fetch with timeout and retry logic for emulator resilience
     */
    private async fetchWithTimeout(url: string, timeout: number = TIMEOUT, retries: number = 2): Promise<Response> {
        for (let attempt = 0; attempt <= retries; attempt++) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(id);
                return response;
            } catch (error) {
                clearTimeout(id);
                if (attempt === retries) {
                    throw error;
                }
                // Wait 1 second before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw new Error('Max retries exceeded');
    }

    /**
     * Forward Geocoding - Search for addresses using Google Places Autocomplete
     * @param query - Search query (e.g., "Paragon City Lahore")
     * @param options - Optional parameters
     * @returns Array of address suggestions
     */
    async forwardGeocode(
        query: string,
        options?: {
            proximity?: { longitude: number; latitude: number };
            limit?: number;
            country?: string;
        }
    ): Promise<Address[]> {
        if (!this.isConfigured()) {
            throw this.createError('Google Places API key not configured', 'CONFIG_ERROR');
        }

        try {
            const params = new URLSearchParams({
                input: query.trim(),
                key: this.apiKey,
                language: 'en',
            });

            // Restrict to specific country (Pakistan)
            if (options?.country) {
                params.append('components', `country:${options.country}`);
            }

            // Add location bias for proximity
            if (options?.proximity) {
                const { latitude, longitude } = options.proximity;
                params.append('location', `${latitude},${longitude}`);
                params.append('radius', '50000'); // 50km radius
            }

            // Add session token for billing optimization (optional)
            params.append('sessiontoken', this.generateSessionToken());

            const response = await this.fetchWithTimeout(
                `${AUTOCOMPLETE_URL}?${params.toString()}`
            );

            if (!response.ok) {
                throw this.createError(
                    `HTTP error: ${response.status}`,
                    'HTTP_ERROR',
                    response.status
                );
            }

            const data: GoogleAutocompleteResponse = await response.json();

            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                throw this.createError(
                    data.error_message || `API error: ${data.status}`,
                    data.status
                );
            }

            // Limit results to max 5 to reduce parallel API calls
            const predictions = data.predictions.slice(0, Math.min(options?.limit || 5, 5));

            // Get details for each prediction sequentially to avoid timeout issues
            // on slower networks (parallel calls can overwhelm the connection)
            const addresses: Address[] = [];
            for (const prediction of predictions) {
                const address = await this.getPlaceDetails(prediction);
                if (address) {
                    addresses.push(address);
                }
            }

            return addresses;
        } catch (error) {
            console.log("🚀 ~ GooglePlacesService ~ forwardGeocode ~ error:", error)
            throw this.handleError(error);
        }
    }

    /**
     * Get place details including coordinates
     */
    private async getPlaceDetails(prediction: GooglePrediction): Promise<Address | null> {
        try {
            const params = new URLSearchParams({
                place_id: prediction.place_id,
                key: this.apiKey,
                fields: 'formatted_address,geometry,address_components,name',
                language: 'en',
            });

            const response = await this.fetchWithTimeout(
                `${DETAILS_URL}?${params.toString()}`
            );

            if (!response.ok) {
                console.warn('Failed to get place details:', prediction.place_id);
                return null;
            }

            const data: GoogleDetailsResponse = await response.json();

            if (data.status !== 'OK') {
                console.warn('Place details error:', data.status);
                return null;
            }

            return this.parseGoogleResult(data.result, prediction);
        } catch (error) {
            console.warn('Error fetching place details:', error);
            return null;
        }
    }

    /**
     * Parse Google Place details to Address object
     */
    private parseGoogleResult(
        result: GooglePlaceDetails,
        prediction: GooglePrediction
    ): Address {
        const components = result.address_components || [];

        // Extract address components
        const getComponent = (types: string[]): string => {
            const component = components.find(c =>
                types.some(t => c.types.includes(t))
            );
            return component?.long_name || '';
        };

        const city = getComponent(['locality', 'administrative_area_level_2']);
        const region = getComponent(['administrative_area_level_1']);
        const country = getComponent(['country']) || 'Pakistan';
        const postalCode = getComponent(['postal_code']);
        const street = getComponent(['route', 'street_address']);

        // Use main text from prediction as city if not found
        const displayCity = city || prediction.structured_formatting?.main_text || '';

        return {
            formatted: result.formatted_address || prediction.description,
            street,
            city: this.cleanCityName(displayCity),
            region,
            country,
            postalCode,
            coordinates: {
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng,
            },
        };
    }

    /**
     * Reverse Geocoding - Convert coordinates to address
     */
    async reverseGeocode(
        longitude: number,
        latitude: number
    ): Promise<Address | null> {
        if (!this.isConfigured()) {
            throw this.createError('Google Places API key not configured', 'CONFIG_ERROR');
        }

        try {
            const params = new URLSearchParams({
                latlng: `${latitude},${longitude}`,
                key: this.apiKey,
                language: 'en',
            });

            const response = await this.fetchWithTimeout(
                `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
            );

            if (!response.ok) {
                return null;
            }

            const data = await response.json();

            if (data.status !== 'OK' || !data.results?.length) {
                return null;
            }

            const result = data.results[0];
            const components = result.address_components || [];

            const getComponent = (types: string[]): string => {
                const component = components.find((c: any) =>
                    types.some((t: string) => c.types.includes(t))
                );
                return component?.long_name || '';
            };

            return {
                formatted: result.formatted_address,
                street: getComponent(['route', 'street_address']),
                city: this.cleanCityName(getComponent(['locality', 'administrative_area_level_2'])),
                region: getComponent(['administrative_area_level_1']),
                country: getComponent(['country']) || 'Pakistan',
                postalCode: getComponent(['postal_code']),
                coordinates: {
                    latitude: result.geometry.location.lat,
                    longitude: result.geometry.location.lng,
                },
            };
        } catch (error) {
            console.warn('Reverse geocode error:', error);
            return null;
        }
    }

    /**
     * Clean city name by removing common suffixes
     */
    private cleanCityName(rawCity: string): string {
        if (!rawCity) return '';

        return rawCity
            .replace(/\s*(District|Division|Tehsil|Taluka|City|Metropolitan|Corporation)$/i, '')
            .trim();
    }

    /**
     * Generate a session token for billing optimization
     */
    private generateSessionToken(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Create a standardized error object
     */
    private createError(message: string, code: string, statusCode?: number): MapboxError {
        return { message, code, statusCode };
    }

    /**
     * Handle and normalize errors
     */
    private handleError(error: unknown): MapboxError {
        if (error && typeof error === 'object' && 'code' in error) {
            return error as MapboxError;
        }

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                return {
                    message: 'Request timeout. Please try again.',
                    code: 'TIMEOUT_ERROR',
                };
            }

            if (error.message.includes('Network') || error.message.includes('fetch')) {
                return {
                    message: 'Network error. Please check your internet connection.',
                    code: 'NETWORK_ERROR',
                };
            }

            return {
                message: error.message,
                code: 'UNKNOWN_ERROR',
            };
        }

        return {
            message: 'Unknown error occurred',
            code: 'UNKNOWN_ERROR',
        };
    }
}

export const googlePlacesService = new GooglePlacesService();
