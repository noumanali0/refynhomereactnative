// src/services/mockRequestApiService.ts
/**
 * Mock Request API Service
 *
 * Generates random service requests for development and testing.
 * Implements the IRequestApiService interface for seamless backend swapping.
 *
 * Features:
 * - Random request generation every 3-5 seconds
 * - Varied TTL (15-25 seconds) to prevent synchronized expiry
 * - Realistic customer data and locations
 * - Service category filtering
 * - Distance-based filtering
 */

import {
    BaseRequestApiService,
    ConnectionStatus,
    type RequestServiceConfig,
} from './requestApiService';
import type { LiveRequest, Coordinates } from './types';
import { getDistance } from '@/utils/distanceCache';

// UUID v4 generator (simple implementation)
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// Random number in range [min, max]
function randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

// Random element from array
function randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Mock Request API Service
 */
export class MockRequestApiService extends BaseRequestApiService {
    private intervalId: NodeJS.Timeout | null = null;
    private readonly MIN_INTERVAL_MS = 3000; // 3 seconds
    private readonly MAX_INTERVAL_MS = 5000; // 5 seconds
    private readonly MIN_TTL_MS = 300000; // 5 minutes (300 seconds)
    private readonly MAX_TTL_MS = 300000; // 5 minutes (300 seconds)

    // Sample data for realistic requests
    private readonly SERVICE_TYPES = [
        'plumber',
        'electrician',
        'ac_repair',
        'washing_machine',
        'tv_repair',
        'refrigerator',
        'microwave',
        'dishwasher',
    ];

    private readonly ISSUES = [
        'Not turning on',
        'Leaking water',
        'Not cooling',
        'Strange noise',
        'Not heating',
        'Sparking',
        'Tripping circuit breaker',
        'Poor performance',
        'Error code displayed',
        'Burning smell',
    ];

    private readonly CUSTOMER_NAMES = [
        'Ahmed Khan',
        'Fatima Ali',
        'Hassan Raza',
        'Ayesha Malik',
        'Ali Hassan',
        'Sara Ahmed',
        'Muhammad Usman',
        'Zainab Hussain',
        'Omar Farooq',
        'Maryam Siddiqui',
        'Bilal Sheikh',
        'Hina Naveed',
        'Imran Qureshi',
        'Khadija Iqbal',
        'Faisal Mahmood',
    ];

    private readonly KARACHI_AREAS = [
        'Clifton',
        'DHA Phase 5',
        'DHA Phase 6',
        'Gulshan-e-Iqbal',
        'North Nazimabad',
        'Malir',
        'Korangi',
        'Saddar',
        'Tariq Road',
        'PECHS',
        'Bahadurabad',
        'Gulistan-e-Johar',
        'Shahrah-e-Faisal',
        'Defence',
        'Bahria Town',
    ];

    // Karachi center coordinates
    private readonly KARACHI_CENTER: Coordinates = {
        latitude: 24.8607,
        longitude: 67.0011,
    };

    constructor(config: RequestServiceConfig = {}) {
        super(config);
    }

    async connect(): Promise<void> {
        if (this.status === ConnectionStatus.CONNECTED) {
            console.log('⚠️ MockRequestApi: Already connected');
            return;
        }

        this.setStatus(ConnectionStatus.CONNECTING);

        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 500));

        this.setStatus(ConnectionStatus.CONNECTED);
        this.startGenerating();

        console.log('✅ MockRequestApi: Connected');
    }

    disconnect(): void {
        if (this.status === ConnectionStatus.DISCONNECTED) {
            return;
        }

        this.stopGenerating();
        this.setStatus(ConnectionStatus.DISCONNECTED);

        console.log('🛑 MockRequestApi: Disconnected');
    }

    /**
     * Start generating random requests
     */
    private startGenerating(): void {
        if (this.intervalId) return;

        const scheduleNext = () => {
            const delay = randomInRange(this.MIN_INTERVAL_MS, this.MAX_INTERVAL_MS);
            this.intervalId = setTimeout(() => {
                this.generateAndNotifyRequest();
                scheduleNext(); // Schedule next generation
            }, delay);
        };

        scheduleNext();
    }

    /**
     * Stop generating requests
     */
    private stopGenerating(): void {
        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Generate a random request and notify listeners
     */
    private generateAndNotifyRequest(): void {
        if (this.status !== ConnectionStatus.CONNECTED) return;
        if (this.requestListeners.size === 0) return; // No listeners, skip

        const request = this.generateRandomRequest();

        // Apply filters
        if (!this.shouldIncludeRequest(request)) {
            return; // Skip this request
        }

        this.notifyRequestListeners(request);
    }

    /**
     * Check if request should be included based on filters
     */
    private shouldIncludeRequest(request: LiveRequest): boolean {
        // Service category filter
        if (this.config.serviceCategories && this.config.serviceCategories.length > 0) {
            if (!this.config.serviceCategories.includes(request.serviceType)) {
                return false;
            }
        }

        // Distance filter
        if (this.config.location && this.config.maxRadiusKm) {
            const distance = getDistance(this.config.location, request.coordinates);
            if (distance > this.config.maxRadiusKm) {
                return false;
            }
        }

        return true;
    }

    /**
     * Generate a random service request
     */
    private generateRandomRequest(): LiveRequest {
        const now = Date.now();
        const ttl = randomInRange(this.MIN_TTL_MS, this.MAX_TTL_MS);

        // Generate random coordinates around Karachi
        const maxRadiusKm = this.config.maxRadiusKm || 20;
        const randomCoords = this.generateRandomCoordinatesNear(
            this.config.location || this.KARACHI_CENTER,
            maxRadiusKm
        );

        const visitCharges = Math.floor(randomInRange(300, 500));

        // 20% chance of having photos
        const photos = Math.random() > 0.8
            ? [`https://picsum.photos/400/300?random=${Math.random()}`]
            : [];

        return {
            id: generateUUID(),
            serviceType: randomElement(this.SERVICE_TYPES),
            issue: randomElement(this.ISSUES),
            customerName: randomElement(this.CUSTOMER_NAMES),
            locationLabel: randomElement(this.KARACHI_AREAS),
            coordinates: randomCoords,
            createdAt: now,
            expiresAt: now + ttl,
            visitCharges,
            photos,
        };
    }

    /**
     * Generate random coordinates within a radius
     */
    private generateRandomCoordinatesNear(
        center: Coordinates,
        radiusKm: number
    ): Coordinates {
        // Simple random point generation (not perfectly uniform distribution, but good enough for mock)
        const radiusDegrees = radiusKm / 111; // 1 degree ≈ 111 km
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * radiusDegrees;

        return {
            latitude: center.latitude + distance * Math.cos(angle),
            longitude: center.longitude + distance * Math.sin(angle),
        };
    }
}

// Singleton instance for easy import
export const mockRequestApi = new MockRequestApiService();
