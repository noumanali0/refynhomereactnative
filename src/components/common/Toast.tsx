/**
 * Toast Component
 *
 * Global toast notification system with beautiful animations
 * Supports: success, error, info, warning types
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale } from 'react-native-size-matters';
import Text from './Text';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onDismiss: () => void;
  visible: boolean;
}

const TOAST_CONFIG = {
  success: {
    colors: ['#10B981', '#059669'],
    icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
    iconColor: '#fff',
  },
  error: {
    colors: ['#EF4444', '#DC2626'],
    icon: 'close-circle' as keyof typeof Ionicons.glyphMap,
    iconColor: '#fff',
  },
  info: {
    colors: ['#3B82F6', '#2563EB'],
    icon: 'information-circle' as keyof typeof Ionicons.glyphMap,
    iconColor: '#fff',
  },
  warning: {
    colors: ['#F59E0B', '#D97706'],
    icon: 'warning' as keyof typeof Ionicons.glyphMap,
    iconColor: '#fff',
  },
};

export default function Toast({
  type,
  title,
  message,
  duration = 4000,
  onDismiss,
  visible,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const config = TOAST_CONFIG[type];

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after duration
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Reset position
      translateY.setValue(-200);
      opacity.setValue(0);
    }
  }, [visible, duration]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <LinearGradient
        colors={config.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={config.icon} size={28} color={config.iconColor} />
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text type="bodySemiBold" style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {message && (
              <Text type="body2" style={styles.message} numberOfLines={2}>
                {message}
              </Text>
            )}
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: moderateScale(50),
    left: moderateScale(16),
    right: moderateScale(16),
    zIndex: 9999,
    elevation: 10,
  },
  gradient: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(16),
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: moderateScale(15),
    marginBottom: 2,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: moderateScale(13),
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
});
