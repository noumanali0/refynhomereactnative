// app/(vendor)/(profile)/service-radius.tsx
/**
 * Service Radius Screen
 *
 * Dedicated screen for vendors to set their service radius
 * with a visual slider interface.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Slider } from '@miblanchard/react-native-slider';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { updateUserProfile } from '@/store/slices/authSlice';
import { useToast } from '@/contexts/ToastContext';
import Text from '@/components/common/Text';
import { COLORS } from '@/constants/colors';

// ============================================================================
// Constants
// ============================================================================

const MIN_RADIUS = 1;
const MAX_RADIUS = 15;
const DEFAULT_RADIUS = 10;

// ============================================================================
// Component
// ============================================================================

export default function ServiceRadiusScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { showToast } = useToast();

    // Get current user from auth state
    const { user, isLoading: authLoading } = useSelector((state: RootState) => state.auth);

    // Extract current radius from vendor profile
    const currentRadius = useMemo(() => {
        const profile = (user as any)?.vendorProfile || (user as any)?.vendor_profile;
        const radius = profile?.service_radius_km || profile?.serviceRadiusKm;
        return radius ? parseFloat(radius) : DEFAULT_RADIUS;
    }, [user]);

    // Local state for slider
    const [radius, setRadius] = useState<number>(currentRadius);
    const [isSaving, setIsSaving] = useState(false);

    // Check if value has changed
    const hasChanged = radius !== currentRadius;

    // Handle slider change
    const handleSliderChange = useCallback((value: number[]) => {
        setRadius(Math.round(value[0]));
    }, []);

    // Handle save
    const handleSave = async () => {
        if (!hasChanged) {
            router.back();
            return;
        }

        setIsSaving(true);
        try {
            await dispatch(updateUserProfile({
                service_radius_km: radius,
            })).unwrap();

            showToast({
                type: 'success',
                title: 'Success',
                message: 'Service radius updated successfully',
            });
            router.back();
        } catch (error: any) {
            showToast({
                type: 'error',
                title: 'Error',
                message: error.message || 'Failed to update radius',
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Handle back navigation
    const handleBack = () => {
        router.back();
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text type="headerTitle" style={styles.headerTitle}>Service Radius</Text>
                    <Text type="body2" style={styles.headerSubtitle}>
                        Set your coverage area
                    </Text>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Radius Display Card */}
                <View style={styles.radiusCard}>
                    <View style={styles.radiusCircle}>
                        <Text type="title" style={styles.radiusValue}>{radius}</Text>
                        <Text type="bodySemiBold" style={styles.radiusUnit}>km</Text>
                    </View>
                    <Text type="body2" style={styles.radiusLabel}>
                        Maximum travel distance
                    </Text>
                </View>

                {/* Slider Section */}
                <View style={styles.sliderSection}>
                    <View style={styles.sliderContainer}>
                        <Slider
                            value={radius}
                            onValueChange={handleSliderChange}
                            minimumValue={MIN_RADIUS}
                            maximumValue={MAX_RADIUS}
                            step={1}
                            minimumTrackTintColor={COLORS.primary}
                            maximumTrackTintColor={COLORS.gray200}
                            thumbTintColor={COLORS.primary}
                            trackStyle={styles.sliderTrack}
                            thumbStyle={styles.sliderThumb}
                        />
                    </View>
                    <View style={styles.sliderLabels}>
                        <Text type="caption" style={styles.sliderMinLabel}>{MIN_RADIUS} km</Text>
                        <Text type="caption" style={styles.sliderMaxLabel}>{MAX_RADIUS} km</Text>
                    </View>
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <View style={styles.infoHeader}>
                        <Ionicons name="information-circle" size={24} color={COLORS.primary} />
                        <Text type="bodySemiBold" style={styles.infoTitle}>
                            About Service Radius
                        </Text>
                    </View>
                    <Text type="body2" style={styles.infoText}>
                        This is the maximum distance you're willing to travel for service requests.
                        Customers within this range will see your profile when searching for services.
                    </Text>
                    <View style={styles.tipContainer}>
                        <Ionicons name="bulb-outline" size={18} color={COLORS.warning} />
                        <Text type="caption" style={styles.tipText}>
                            Tip: A larger radius means more potential customers, but longer travel times.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Save Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        !hasChanged && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={isSaving}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={hasChanged ? [COLORS.primary, COLORS.accent] : [COLORS.gray300, COLORS.gray400]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.saveButtonGradient}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                                <Text type="button" style={styles.saveButtonText}>
                                    {hasChanged ? 'Save Changes' : 'No Changes'}
                                </Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.gray50,
    },
    header: {
        paddingTop: verticalScale(50),
        paddingBottom: verticalScale(24),
        paddingHorizontal: scale(20),
        borderBottomLeftRadius: moderateScale(24),
        borderBottomRightRadius: moderateScale(24),
    },
    backButton: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    headerContent: {
        marginLeft: scale(4),
    },
    headerTitle: {
        fontSize: moderateScale(28),
        fontWeight: '800',
        color: COLORS.white,
        marginBottom: verticalScale(4),
    },
    headerSubtitle: {
        fontSize: moderateScale(14),
        color: 'rgba(255,255,255,0.9)',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: scale(20),
        paddingBottom: verticalScale(100),
    },
    radiusCard: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(20),
        padding: scale(32),
        alignItems: 'center',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: verticalScale(24),
    },
    radiusCircle: {
        width: moderateScale(140),
        height: moderateScale(140),
        borderRadius: moderateScale(70),
        backgroundColor: COLORS.primary + '10',
        borderWidth: 4,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    radiusValue: {
        fontSize: moderateScale(48),
        fontWeight: '800',
        color: COLORS.primary,
        lineHeight: moderateScale(56),
    },
    radiusUnit: {
        fontSize: moderateScale(18),
        color: COLORS.primary,
        marginTop: verticalScale(-8),
    },
    radiusLabel: {
        fontSize: moderateScale(14),
        color: COLORS.gray600,
    },
    sliderSection: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        padding: scale(20),
        marginBottom: verticalScale(24),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sliderContainer: {
        paddingHorizontal: scale(8),
    },
    sliderTrack: {
        height: moderateScale(8),
        borderRadius: moderateScale(4),
    },
    sliderThumb: {
        width: moderateScale(28),
        height: moderateScale(28),
        borderRadius: moderateScale(14),
        backgroundColor: COLORS.white,
        borderWidth: 3,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: verticalScale(12),
        paddingHorizontal: scale(4),
    },
    sliderMinLabel: {
        color: COLORS.gray500,
        fontSize: moderateScale(12),
    },
    sliderMaxLabel: {
        color: COLORS.gray500,
        fontSize: moderateScale(12),
    },
    infoSection: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        padding: scale(20),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(12),
    },
    infoTitle: {
        fontSize: moderateScale(16),
        color: COLORS.gray900,
        marginLeft: scale(8),
    },
    infoText: {
        fontSize: moderateScale(14),
        color: COLORS.gray600,
        lineHeight: moderateScale(22),
        marginBottom: verticalScale(16),
    },
    tipContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.warning + '10',
        borderRadius: moderateScale(12),
        padding: scale(12),
    },
    tipText: {
        flex: 1,
        fontSize: moderateScale(12),
        color: COLORS.gray700,
        marginLeft: scale(8),
        lineHeight: moderateScale(18),
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(16),
        paddingBottom: verticalScale(32),
        borderTopWidth: 1,
        borderTopColor: COLORS.gray100,
    },
    saveButton: {
        borderRadius: moderateScale(16),
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonDisabled: {
        shadowOpacity: 0,
        elevation: 0,
    },
    saveButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(16),
        gap: scale(8),
    },
    saveButtonText: {
        color: COLORS.white,
        fontSize: moderateScale(16),
        fontWeight: '600',
    },
});
