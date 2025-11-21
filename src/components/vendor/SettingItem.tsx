// src/components/vendor/SettingItem.tsx
/**
 * Setting Item Component
 *
 * Reusable setting row component for account settings screens.
 * Supports toggle switches, navigation, and info display.
 */

import React, { memo } from 'react';
import { View, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { COLORS } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

export type SettingItemType = 'toggle' | 'navigation' | 'info';

export interface SettingItemProps {
    icon: string; // Ionicon name
    label: string;
    subtitle?: string; // Optional description text
    type?: SettingItemType; // Default: 'navigation'
    value?: boolean | string; // For toggle (boolean) or info (string)
    onPress?: () => void; // For navigation or toggle
    onValueChange?: (value: boolean) => void; // For toggle
    badge?: string; // Optional badge text (e.g., "NEW", "PREMIUM")
    badgeColor?: string; // Badge background color
    disabled?: boolean; // Disabled state
    gradient?: boolean; // Use gradient background (for premium features)
    danger?: boolean; // Red styling for dangerous actions
    showDivider?: boolean; // Show bottom divider (default: true)
}

// ============================================================================
// Component
// ============================================================================

const SettingItemComponent = ({
    icon,
    label,
    subtitle,
    type = 'navigation',
    value,
    onPress,
    onValueChange,
    badge,
    badgeColor = COLORS.primary,
    disabled = false,
    gradient = false,
    danger = false,
    showDivider = true,
}: SettingItemProps) => {
    // Handle toggle change
    const handleToggleChange = (newValue: boolean) => {
        if (onValueChange && !disabled) {
            onValueChange(newValue);
        }
    };

    // Determine colors
    const iconColor = disabled
        ? COLORS.gray400
        : danger
        ? COLORS.error
        : gradient
        ? COLORS.primary
        : COLORS.gray700;

    const labelColor = disabled
        ? COLORS.gray400
        : danger
        ? COLORS.error
        : COLORS.gray900;

    // Render content
    const renderContent = () => (
        <View style={[styles.container, !showDivider && styles.noDivider]}>
            {/* Icon */}
            <View style={[styles.iconContainer, gradient && styles.iconContainerGradient]}>
                {gradient ? (
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientIcon}
                    >
                        <Ionicons name={icon as any} size={20} color={COLORS.white} />
                    </LinearGradient>
                ) : (
                    <Ionicons name={icon as any} size={20} color={iconColor} />
                )}
            </View>

            {/* Text Content */}
            <View style={styles.textContainer}>
                <View style={styles.labelRow}>
                    <Text type="bodySemiBold" style={[styles.label, { color: labelColor }]} numberOfLines={1}>
                        {label}
                    </Text>
                    {badge && (
                        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                            <Text type="caption" style={styles.badgeText}>{badge}</Text>
                        </View>
                    )}
                </View>
                {subtitle && (
                    <Text type="body2" style={styles.subtitle} numberOfLines={2}>
                        {subtitle}
                    </Text>
                )}
            </View>

            {/* Right Side Action */}
            <View style={styles.actionContainer}>
                {type === 'toggle' && (
                    <Switch
                        value={value as boolean}
                        onValueChange={handleToggleChange}
                        disabled={disabled}
                        trackColor={{
                            false: COLORS.gray300,
                            true: COLORS.primary + '80',
                        }}
                        thumbColor={value ? COLORS.primary : COLORS.gray100}
                        ios_backgroundColor={COLORS.gray300}
                    />
                )}
                {type === 'navigation' && (
                    <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={disabled ? COLORS.gray300 : COLORS.gray400}
                    />
                )}
                {type === 'info' && value && (
                    <Text type="body2" style={styles.infoValue} numberOfLines={1}>
                        {value as string}
                    </Text>
                )}
            </View>
        </View>
    );

    // If navigation or pressable toggle, wrap in TouchableOpacity
    if ((type === 'navigation' || type === 'toggle') && onPress && !disabled) {
        return (
            <TouchableOpacity
                onPress={type === 'toggle' ? () => handleToggleChange(!(value as boolean)) : onPress}
                activeOpacity={0.7}
                disabled={disabled}
            >
                {renderContent()}
            </TouchableOpacity>
        );
    }

    // Otherwise, just render content
    return renderContent();
};

// ============================================================================
// Memoization
// ============================================================================

export const SettingItem = memo(SettingItemComponent);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(16),
        backgroundColor: COLORS.white,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.gray200,
        gap: scale(12),
    },
    noDivider: {
        borderBottomWidth: 0,
    },
    iconContainer: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        backgroundColor: COLORS.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainerGradient: {
        backgroundColor: 'transparent',
    },
    gradientIcon: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        gap: verticalScale(2),
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    label: {
        fontSize: moderateScale(15),
        flex: 1,
    },
    subtitle: {
        color: COLORS.gray500,
        lineHeight: moderateScale(18),
    },
    badge: {
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(2),
        borderRadius: moderateScale(10),
    },
    badgeText: {
        fontSize: moderateScale(10),
        color: COLORS.white,
        letterSpacing: 0.5,
    },
    actionContainer: {
        marginLeft: scale(8),
    },
    infoValue: {
        color: COLORS.gray600,
        maxWidth: scale(120),
        textAlign: 'right',
    },
});
