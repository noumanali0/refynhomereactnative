import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, MapPin, DollarSign } from 'lucide-react-native';

interface RequestCardProps {
    request: {
        id: string;
        title: string;
        serviceType: string;
        status: string;
        preferredDate: string;
        address: {
            city: string;
        };
        estimatedBudget?: number;
        proposalCount?: number;
    };
    onPress: () => void;
}

export const RequestCard: React.FC<RequestCardProps> = ({ request, onPress }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'awaiting_proposals':
                return '#F59E0B';
            case 'proposals_received':
                return '#2563EB';
            case 'in_progress':
                return '#8B5CF6';
            case 'completed':
                return '#10B981';
            default:
                return '#6B7280';
        }
    };

    const getStatusText = (status: string) => {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>
                        {request.title}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(request.status)}20` }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(request.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                            {getStatusText(request.status)}
                        </Text>
                    </View>
                </View>
                <Text style={styles.serviceType}>{request.serviceType}</Text>
            </View>

            <View style={styles.details}>
                <View style={styles.detailRow}>
                    <Clock size={14} color="#6B7280" />
                    <Text style={styles.detailText}>
                        {new Date(request.preferredDate).toLocaleDateString()}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.detailText}>{request.address.city}</Text>
                </View>
                {request.estimatedBudget && (
                    <View style={styles.detailRow}>
                        <DollarSign size={14} color="#6B7280" />
                        <Text style={styles.detailText}>${request.estimatedBudget}</Text>
                    </View>
                )}
            </View>

            {request.proposalCount !== undefined && request.proposalCount > 0 && (
                <View style={styles.footer}>
                    <Text style={styles.proposalCount}>
                        {request.proposalCount} proposal{request.proposalCount !== 1 ? 's' : ''} received
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        marginBottom: 12,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginRight: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    serviceType: {
        fontSize: 13,
        color: '#6B7280',
    },
    details: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 13,
        color: '#6B7280',
    },
    footer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    proposalCount: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2563EB',
    },
});