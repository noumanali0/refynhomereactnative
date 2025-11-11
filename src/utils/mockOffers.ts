// import { VendorOffer } from '@/redux/offersSlice';

import { VendorOffer } from "../store/slices/offersSlice";

const vendorNames = [
    'John Smith',
    'Ahmed Hassan',
    'Raj Patel',
    'Carlos Rodriguez',
    'Michael Chen',
    'David Johnson',
    'Ali Mohammad',
    'Robert Brown',
    'James Wilson',
    'Mohammed Khan',
];


export function generateRandomOffer(
    userLocation: { latitude: number; longitude: number },
    radiusKm: number = 5 // default 5km radius
): VendorOffer {
    const randomName = vendorNames[Math.floor(Math.random() * vendorNames.length)];
    const randomDistance = parseFloat((Math.random() * radiusKm).toFixed(1)); // distance within radius
    const randomEta = Math.floor(randomDistance * 3 + Math.random() * 5);
    const randomPrice = Math.floor(Math.random() * 150) + 50;
    const randomRating = parseFloat((Math.random() * 1.5 + 3.5).toFixed(1));

    // Generate a random point within a circle of radiusKm
    const radiusInDegrees = radiusKm / 111; // ~111 km per degree latitude
    const u = Math.random();
    const v = Math.random();
    const w = radiusInDegrees * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const dx = w * Math.cos(t);
    const dy = w * Math.sin(t);

    const latitude = userLocation.latitude + dy;
    const longitude = userLocation.longitude + dx;

    return {
        id: `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: randomName,
        distance: randomDistance,
        eta: randomEta,
        price: randomPrice,
        coordinates: { latitude, longitude },
        rating: randomRating,
    };
}



// export function generateRandomOffer(
//     userLocation: { latitude: number; longitude: number }
// ): VendorOffer {
//     const randomName = vendorNames[Math.floor(Math.random() * vendorNames.length)];
//     const randomDistance = Math.random() * 10 + 0.5;
//     const randomEta = Math.floor(randomDistance * 3 + Math.random() * 5);
//     const randomPrice = Math.floor(Math.random() * 150) + 50;
//     const randomRating = (Math.random() * 1.5 + 3.5).toFixed(1);

//     const offsetLat = (Math.random() - 0.5) * 0.05;
//     const offsetLng = (Math.random() - 0.5) * 0.05;

//     return {
//         id: `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//         name: randomName,
//         distance: parseFloat(randomDistance.toFixed(1)),
//         eta: randomEta,
//         price: randomPrice,
//         coordinates: {
//             latitude: userLocation.latitude + offsetLat,
//             longitude: userLocation.longitude + offsetLng,
//         },
//         rating: parseFloat(randomRating),
//     };
// }

// export function simulateVendorMovement(
//     currentLocation: { latitude: number; longitude: number },
//     targetLocation: { latitude: number; longitude: number },
//     speed: number = 0.0001
// ): { latitude: number; longitude: number } {
//     const latDiff = targetLocation.latitude - currentLocation.latitude;
//     const lngDiff = targetLocation.longitude - currentLocation.longitude;

//     const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

//     if (distance < speed) {
//         return targetLocation;
//     }

//     const ratio = speed / distance;

//     return {
//         latitude: currentLocation.latitude + latDiff * ratio,
//         longitude: currentLocation.longitude + lngDiff * ratio,
//     };
// }
export function simulateVendorMovement(
    currentLocation: { latitude: number; longitude: number },
    targetLocation: { latitude: number; longitude: number },
    speed: number = 0.0002 // bigger step for testing
): { latitude: number; longitude: number } {
    const latDiff = targetLocation.latitude - currentLocation.latitude;
    const lngDiff = targetLocation.longitude - currentLocation.longitude;

    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    if (distance === 0) {
        // add tiny random jitter to force movement in mock
        return {
            latitude: currentLocation.latitude + (Math.random() - 0.5) * 0.00005,
            longitude: currentLocation.longitude + (Math.random() - 0.5) * 0.00005,
        };
    }

    if (distance < speed) return targetLocation;

    const ratio = speed / distance;
    return {
        latitude: currentLocation.latitude + latDiff * ratio,
        longitude: currentLocation.longitude + lngDiff * ratio,
    };
}
