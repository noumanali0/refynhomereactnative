/**
 * API Retry Utility
 *
 * Provides exponential backoff retry logic for API calls.
 * Useful for handling transient network failures gracefully.
 */

// Retry configuration
export interface RetryConfig {
  maxRetries: number;       // Maximum number of retry attempts
  initialDelay: number;     // Initial delay in ms (default: 1000)
  maxDelay: number;         // Maximum delay in ms (default: 30000)
  backoffFactor: number;    // Multiplier for exponential backoff (default: 2)
  retryCondition?: (error: any) => boolean;  // Custom retry condition
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
};

// HTTP status codes that should trigger a retry
const RETRYABLE_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
];

/**
 * Check if an error is retryable
 * Default behavior: retry on network errors and certain HTTP status codes
 */
export function isRetryableError(error: any): boolean {
  // Network errors (no response)
  if (!error.response) {
    // Check for timeout or network error
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      return true;
    }
  }

  // HTTP errors
  if (error.response?.status) {
    return RETRYABLE_STATUS_CODES.includes(error.response.status);
  }

  return false;
}

/**
 * Calculate delay for current retry attempt using exponential backoff
 * Adds jitter (randomness) to prevent thundering herd problem
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffFactor, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

  // Add jitter: +/- 10% randomness
  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);
  return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 *
 * @param fn - The async function to execute
 * @param config - Optional retry configuration
 * @returns The result of the function
 * @throws The last error if all retries fail
 *
 * @example
 * const response = await withRetry(
 *   () => apiClient.get('/users'),
 *   { maxRetries: 3 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = finalConfig.retryCondition
        ? finalConfig.retryCondition(error)
        : isRetryableError(error);

      // Don't retry if condition not met or last attempt
      if (!shouldRetry || attempt === finalConfig.maxRetries) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, finalConfig);

      if (__DEV__) {
        console.log(`[Retry] Attempt ${attempt + 1}/${finalConfig.maxRetries} failed, retrying in ${delay}ms`);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retryable version of an async function
 *
 * @param fn - The async function to wrap
 * @param config - Optional retry configuration
 * @returns A new function that will retry on failure
 *
 * @example
 * const fetchUserWithRetry = createRetryable(
 *   (id: string) => apiClient.get(`/users/${id}`),
 *   { maxRetries: 2 }
 * );
 * const user = await fetchUserWithRetry('123');
 */
export function createRetryable<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: Partial<RetryConfig> = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), config);
}

export default {
  withRetry,
  createRetryable,
  isRetryableError,
  calculateDelay,
};
