// src/components/common/RequestToast.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { COLORS } from '@/constants/colors';
import type { LiveRequest } from '@/services/types';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface RequestToastProps {
    request: LiveRequest;
    distance?: string;
    onPress: () => void;
    onDismiss: () => void;
}

export const RequestToast: React.FC<RequestToastProps> = ({
    request,
    distance,
    onPress,
    onDismiss
}) => {
    const translateY = useRef(new Animated.Value(-200)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto dismiss after 5 seconds
        const timer = setTimeout(() => {
            dismissToast();
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const dismissToast = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -200,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss();
        });
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity,
                    transform: [{ translateY }, { scale }],
                },
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={onPress}
                style={styles.touchable}
            >
                <LinearGradient
                    colors={[COLORS.primary, COLORS.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                >
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="flash" size={24} color={COLORS.white} />
                            </View>
                            <View style={styles.headerText}>
                                <Text style={styles.title}>New Service Request!</Text>
                                <Text style={styles.subtitle}>Tap to view details</Text>
                            </View>
                            <TouchableOpacity
                                onPress={dismissToast}
                                style={styles.closeButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={20} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>

                        {/* Divider */}
                        <View style={styles.divider} />

                        {/* Details */}
                        <View style={styles.details}>
                            <View style={styles.detailRow}>
                                <Ionicons name="construct" size={16} color={COLORS.white} />
                                <Text style={styles.detailText}>{request.serviceType}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Ionicons name="person" size={16} color={COLORS.white} />
                                <Text style={styles.detailText}>{request.customerName}</Text>
                            </View>
                            {distance && (
                                <View style={styles.detailRow}>
                                    <Ionicons name="location" size={16} color={COLORS.white} />
                                    <Text style={styles.detailText}>
                                        {request.locationLabel} • {distance}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* CTA */}
                        <View style={styles.ctaContainer}>
                            <View style={styles.priceTag}>
                                <Text style={styles.priceLabel}>Visit Charges</Text>
                                <Text style={styles.priceValue}>PKR {request.visitCharges}</Text>
                            </View>
                            <View style={styles.arrow}>
                                <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
                            </View>
                        </View>
                    </View>

                    {/* Animated pulsing indicator */}
                    <View style={styles.pulseContainer}>
                        <View style={styles.pulse} />
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: verticalScale(50),
        left: scale(16),
        right: scale(16),
        zIndex: 9999,
    },
    touchable: {
        borderRadius: moderateScale(16),
        overflow: 'hidden',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
    },
    gradient: {
        borderRadius: moderateScale(16),
        overflow: 'hidden',
    },
    content: {
        padding: scale(16),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        flex: 1,
        marginLeft: scale(12),
    },
    title: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: COLORS.white,
        marginBottom: verticalScale(2),
    },
    subtitle: {
        fontSize: moderateScale(12),
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    closeButton: {
        width: moderateScale(32),
        height: moderateScale(32),
        borderRadius: moderateScale(16),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginVertical: verticalScale(12),
    },
    details: {
        gap: verticalScale(8),
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    detailText: {
        fontSize: moderateScale(14),
        color: COLORS.white,
        fontWeight: '500',
    },
    ctaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: verticalScale(12),
        paddingTop: verticalScale(12),
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
    },
    priceTag: {
        flex: 1,
    },
    priceLabel: {
        fontSize: moderateScale(11),
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    priceValue: {
        fontSize: moderateScale(18),
        fontWeight: '700',
        color: COLORS.white,
        marginTop: verticalScale(2),
    },
    arrow: {
        width: moderateScale(32),
        height: moderateScale(32),
        borderRadius: moderateScale(16),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseContainer: {
        position: 'absolute',
        top: scale(12),
        right: scale(12),
    },
    pulse: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 4,
    },
});
