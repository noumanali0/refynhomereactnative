import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wrench } from 'lucide-react-native';
import { moderateScale, verticalScale } from 'react-native-size-matters';
import Text from '@/components/common/Text';
import { COLORS } from '@/constants/colors';

export default function Index() {
  return (
    <LinearGradient
      colors={['#2563EB', '#1E40AF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <View style={styles.iconWrapper}>
          <LinearGradient
            colors={['#FFFFFF', '#F3F4F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBackground}
          >
            <Wrench color={COLORS.primary} size={moderateScale(40)} strokeWidth={2.5} />
          </LinearGradient>
        </View>

        {/* App Name with Gradient Badge */}
        <View style={styles.brandContainer}>
          <LinearGradient
            colors={['#2563EB', '#F97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandBadge}
          >
            <Text type="title" style={styles.brandText}>REFYNHOME</Text>
          </LinearGradient>
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>Connecting you with verified technicians</Text>
      </View>

      {/* Loading Indicator */}
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: verticalScale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconBackground: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandContainer: {
    marginBottom: verticalScale(12),
  },
  brandBadge: {
    paddingHorizontal: moderateScale(24),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(30),
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: moderateScale(24),
    letterSpacing: 2,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: moderateScale(14),
    textAlign: 'center',
    marginTop: verticalScale(8),
  },
  loadingContainer: {
    position: 'absolute',
    bottom: verticalScale(60),
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: moderateScale(13),
  },
});
