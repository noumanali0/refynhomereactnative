import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, MapPin, Clock, Star } from 'lucide-react-native';
import { VendorOffer } from '../../store/slices/offersSlice';
// import { VendorOffer } from '@/redux/offersSlice';

interface VendorOfferCardProps {
    offer: VendorOffer;
    onAccept: (offer: VendorOffer) => void;
}

export function VendorOfferCard({ offer, onAccept }: VendorOfferCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <User size={24} color="#fff" />
                </View>
                <View style={styles.vendorInfo}>
                    <Text style={styles.vendorName}>{offer.name}</Text>
                    <View style={styles.ratingContainer}>
                        <Star size={14} color="#FFA500" fill="#FFA500" />
                        <Text style={styles.ratingText}>{offer.rating}</Text>
                    </View>
                </View>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Quote</Text>
                    <Text style={styles.priceValue}>AED {offer.price}</Text>
                </View>
            </View>

            <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                    <MapPin size={16} color="#666" />
                    <Text style={styles.detailText}>{offer.distance} km away</Text>
                </View>
                <View style={styles.detailItem}>
                    <Clock size={16} color="#666" />
                    <Text style={styles.detailText}>ETA {offer.eta} min</Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => onAccept(offer)}
                activeOpacity={0.8}
            >
                <Text style={styles.acceptButtonText}>Accept Offer</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    vendorInfo: {
        flex: 1,
        marginLeft: 12,
    },
    vendorName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 4,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    priceLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    priceValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#00A86B',
    },
    detailsRow: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 14,
        color: '#666',
    },
    acceptButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    acceptButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
