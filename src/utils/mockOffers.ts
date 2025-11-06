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
    userLocation: { latitude: number; longitude: number }
): VendorOffer {
    const randomName = vendorNames[Math.floor(Math.random() * vendorNames.length)];
    const randomDistance = Math.random() * 10 + 0.5;
    const randomEta = Math.floor(randomDistance * 3 + Math.random() * 5);
    const randomPrice = Math.floor(Math.random() * 150) + 50;
    const randomRating = (Math.random() * 1.5 + 3.5).toFixed(1);

    const offsetLat = (Math.random() - 0.5) * 0.05;
    const offsetLng = (Math.random() - 0.5) * 0.05;

    return {
        id: `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: randomName,
        distance: parseFloat(randomDistance.toFixed(1)),
        eta: randomEta,
        price: randomPrice,
        coordinates: {
            latitude: userLocation.latitude + offsetLat,
            longitude: userLocation.longitude + offsetLng,
        },
        rating: parseFloat(randomRating),
    };
}

export function simulateVendorMovement(
    currentLocation: { latitude: number; longitude: number },
    targetLocation: { latitude: number; longitude: number },
    speed: number = 0.0001
): { latitude: number; longitude: number } {
    const latDiff = targetLocation.latitude - currentLocation.latitude;
    const lngDiff = targetLocation.longitude - currentLocation.longitude;

    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    if (distance < speed) {
        return targetLocation;
    }

    const ratio = speed / distance;

    return {
        latitude: currentLocation.latitude + latDiff * ratio,
        longitude: currentLocation.longitude + lngDiff * ratio,
    };
}
