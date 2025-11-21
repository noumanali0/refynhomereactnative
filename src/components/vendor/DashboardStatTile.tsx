import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DashboardStatTileProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtitle?: string;
    color?: string;
}

export const DashboardStatTile: React.FC<DashboardStatTileProps> = ({
    icon,
    label,
    value,
    subtitle,
    color = '#2563EB',
}) => {
    return (
        <View style={styles.container}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                {icon}
            </View>
            <View style={styles.content}>
                <Text style={styles.value}>{value}</Text>
                <Text style={styles.label}>{label}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        minWidth: 140,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    content: {
        gap: 2,
    },
    value: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6B7280',
    },
    subtitle: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
});