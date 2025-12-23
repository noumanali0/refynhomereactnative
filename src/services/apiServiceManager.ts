/**
 * API Service Manager
 *
 * Centralized manager for API service instances. Prevents storing
 * non-serializable objects in Redux state while maintaining singleton
 * pattern for service instances.
 *
 * Benefits:
 * - Removes non-serializable objects from Redux state
 * - Enables time-travel debugging
 * - Maintains single source of truth for service instances
 * - Provides controlled access with lifecycle management
 */

import type { IRequestApiService } from './requestApiService';
import type { ISubscriptionApiService } from './subscriptionApiService';

class ApiServiceManager {
  // Singleton instances
  private static requestApi: IRequestApiService | null = null;
  private static subscriptionApi: ISubscriptionApiService | null = null;

  // ============================================================================
  // Request API Service
  // ============================================================================

  /**
   * Get the request API service instance.
   * Returns the existing instance or null if not initialized.
   */
  static getRequestApi(): IRequestApiService | null {
    return this.requestApi;
  }

  /**
   * Set the request API service instance.
   * Should be called once during app initialization.
   */
  static setRequestApi(service: IRequestApiService | null): void {
    // If replacing an existing instance, disconnect it first
    if (this.requestApi && service !== this.requestApi) {
      this.requestApi.disconnect();
    }
    this.requestApi = service;
  }

  /**
   * Clear the request API service instance and disconnect it.
   */
  static clearRequestApi(): void {
    if (this.requestApi) {
      this.requestApi.disconnect();
      this.requestApi = null;
    }
  }

  // ============================================================================
  // Subscription API Service
  // ============================================================================

  /**
   * Get the subscription API service instance.
   * Returns the existing instance or null if not initialized.
   */
  static getSubscriptionApi(): ISubscriptionApiService | null {
    return this.subscriptionApi;
  }

  /**
   * Set the subscription API service instance.
   * Should be called once during app initialization.
   */
  static setSubscriptionApi(service: ISubscriptionApiService | null): void {
    this.subscriptionApi = service;
  }

  /**
   * Clear the subscription API service instance.
   */
  static clearSubscriptionApi(): void {
    this.subscriptionApi = null;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clear all API service instances.
   * Useful for cleanup on logout or app teardown.
   */
  static clearAll(): void {
    this.clearRequestApi();
    this.clearSubscriptionApi();
  }
}

export default ApiServiceManager;
