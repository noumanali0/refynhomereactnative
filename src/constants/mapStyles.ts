/**
 * Custom Google Maps styling for inDrive-like UI
 * These styles create a cleaner, more modern map appearance
 */

// Light mode - clean, minimal style (like inDrive)
export const lightMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#f5f5f5' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#f5f5f5' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }], // Hide POIs for cleaner look
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e0e0e0' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#dadada' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c0c0c0' }],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }], // Hide transit for cleaner look
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c9e4f5' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
];

// Dark mode style
export const darkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#212121' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#212121' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2c2c2c' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3c3c3c' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#1a3a4a' }],
  },
];

// Route line colors (for gradient effect)
export const routeColors = {
  shadow: 'rgba(29, 78, 216, 0.15)',   // Outer glow
  middle: 'rgba(29, 78, 216, 0.4)',    // Middle layer
  main: '#1D4ED8',                      // Primary blue
  accent: '#3B82F6',                    // Lighter accent
};

// Route line widths
export const routeWidths = {
  shadow: 10,
  middle: 6,
  main: 4,
};

// Marker colors
export const markerColors = {
  vendor: '#1D4ED8',       // Blue for vendor/car
  customer: '#F97316',     // Orange for destination
  pulse: 'rgba(249, 115, 22, 0.3)', // Pulsing ring color
};

// Destination marker styles
export const destinationMarkerStyle = {
  outerSize: 48,
  innerSize: 20,
  pulseMaxScale: 1.5,
  pulseDuration: 1500,
};

// Car marker size
export const carMarkerSize = {
  width: 44,
  height: 44,
};

/**
 * Calculate bearing (direction) between two coordinates
 * Returns angle in degrees (0-360) where 0 is North
 */
export const calculateBearing = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
): number => {
  const startLat = (start.latitude * Math.PI) / 180;
  const startLng = (start.longitude * Math.PI) / 180;
  const endLat = (end.latitude * Math.PI) / 180;
  const endLng = (end.longitude * Math.PI) / 180;

  const dLng = endLng - startLng;
  const x = Math.sin(dLng) * Math.cos(endLat);
  const y =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  const bearing = (Math.atan2(x, y) * 180) / Math.PI;
  return (bearing + 360) % 360;
};
