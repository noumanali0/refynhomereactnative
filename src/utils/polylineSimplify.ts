/**
 * Polyline Simplification Utility
 *
 * Uses Douglas-Peucker algorithm to reduce route coordinate count
 * for efficient Polyline rendering on low-end devices.
 *
 * OSRM can return 500-2000+ coordinates for city routes, which causes
 * crashes on low-end Android devices when rendering Polyline components.
 * This utility reduces to ~80 points while preserving visual accuracy.
 */

import type { Coordinates } from '@/types/socket';

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum points for smooth rendering on low-end devices.
 * 80 points provides good visual fidelity while being fast to render.
 */
const MAX_POINTS = 80;

// ============================================================================
// Douglas-Peucker Algorithm
// ============================================================================

/**
 * Calculate perpendicular distance from a point to a line segment.
 * Used by Douglas-Peucker to find the point furthest from the baseline.
 */
function perpendicularDistance(
  point: Coordinates,
  lineStart: Coordinates,
  lineEnd: Coordinates
): number {
  const dx = lineEnd.longitude - lineStart.longitude;
  const dy = lineEnd.latitude - lineStart.latitude;

  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return 0;

  // Project point onto line segment
  const u =
    ((point.longitude - lineStart.longitude) * dx +
      (point.latitude - lineStart.latitude) * dy) /
    (mag * mag);

  let closestX: number, closestY: number;

  if (u < 0) {
    // Point projects before line start
    closestX = lineStart.longitude;
    closestY = lineStart.latitude;
  } else if (u > 1) {
    // Point projects after line end
    closestX = lineEnd.longitude;
    closestY = lineEnd.latitude;
  } else {
    // Point projects onto line segment
    closestX = lineStart.longitude + u * dx;
    closestY = lineStart.latitude + u * dy;
  }

  const distX = point.longitude - closestX;
  const distY = point.latitude - closestY;

  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Douglas-Peucker recursive simplification algorithm.
 *
 * Recursively finds the point furthest from the line between first and last,
 * and keeps it if the distance exceeds epsilon. This preserves the "shape"
 * of the curve while removing unnecessary intermediate points.
 *
 * @param points - Array of coordinates to simplify
 * @param epsilon - Distance threshold (points closer than this are removed)
 * @returns Simplified array of coordinates
 */
function douglasPeucker(points: Coordinates[], epsilon: number): Coordinates[] {
  if (points.length <= 2) return points;

  // Find point with maximum distance from line
  let maxDist = 0;
  let maxIndex = 0;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], firstPoint, lastPoint);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  // If max distance exceeds epsilon, recursively simplify
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIndex), epsilon);
    // Remove duplicate point at junction
    return [...left.slice(0, -1), ...right];
  }

  // All intermediate points are within epsilon - keep only endpoints
  return [firstPoint, lastPoint];
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Simplify route coordinates for efficient Polyline rendering.
 *
 * Automatically calculates the optimal epsilon value to reduce
 * coordinates to MAX_POINTS while preserving visual accuracy.
 * Uses binary search to find the right epsilon.
 *
 * @param coordinates - Raw coordinates from OSRM (can be 2000+)
 * @returns Simplified coordinates (max 80 points)
 *
 * @example
 * const rawRoute = await fetchOSRMRoute(start, end);
 * const simplified = simplifyRoute(rawRoute);
 * // Use simplified in Polyline component
 */
export function simplifyRoute(coordinates: Coordinates[]): Coordinates[] {
  // No simplification needed for small arrays
  if (coordinates.length <= MAX_POINTS) {
    return coordinates;
  }

  // Calculate bounding box diagonal for epsilon estimation
  let minLat = Infinity,
    maxLat = -Infinity;
  let minLng = Infinity,
    maxLng = -Infinity;

  for (const coord of coordinates) {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLng = Math.min(minLng, coord.longitude);
    maxLng = Math.max(maxLng, coord.longitude);
  }

  const diagonal = Math.sqrt(
    Math.pow(maxLat - minLat, 2) + Math.pow(maxLng - minLng, 2)
  );

  // Binary search for optimal epsilon
  let epsilon = diagonal * 0.0001; // Start very small
  let simplified = douglasPeucker(coordinates, epsilon);

  let minEps = epsilon;
  let maxEps = diagonal * 0.1;
  let iterations = 0;
  const maxIterations = 20; // Prevent infinite loop

  while (simplified.length > MAX_POINTS && iterations < maxIterations) {
    epsilon = (minEps + maxEps) / 2;
    simplified = douglasPeucker(coordinates, epsilon);

    if (simplified.length > MAX_POINTS) {
      minEps = epsilon;
    } else {
      maxEps = epsilon;
    }

    // Convergence check
    if (maxEps - minEps < diagonal * 0.00001) break;
    iterations++;
  }

  if (__DEV__) {
    console.log(
      `[simplifyRoute] Reduced ${coordinates.length} → ${simplified.length} points (epsilon: ${epsilon.toFixed(6)})`
    );
  }

  return simplified;
}

export default simplifyRoute;
