// app/(onboarding)/index.tsx
/**
 * Onboarding Screen
 *
 * Beautiful 3-screen onboarding flow with smooth animations,
 * pagination dots, and skip functionality.
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  TouchableOpacity,
  ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '@/components/common/Text';
import { COLORS } from '@/constants/colors';

const { width } = Dimensions.get('window');

// Storage key for onboarding completion (also defined in _layout.tsx)
const ONBOARDING_COMPLETE_KEY = 'hasSeenOnboarding';

// Onboarding slide data
interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  description: string;
  gradientColors: [string, string];
  iconBgColor: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'home-outline',
    title: 'Welcome to RefynHome',
    subtitle: 'Your Home Services Partner',
    description:
      'Get expert help for all your home repair needs. From AC servicing to plumbing, we connect you with trusted professionals in your area.',
    gradientColors: [COLORS.primary, COLORS.primary700],
    iconBgColor: COLORS.primary50,
  },
  {
    id: '2',
    icon: 'flash-outline',
    title: 'Quick & Easy Booking',
    subtitle: 'Service at Your Fingertips',
    description:
      'Describe your issue, get instant quotes from verified vendors, and book the best one for your needs. Track your service in real-time.',
    gradientColors: [COLORS.accent, COLORS.accent600],
    iconBgColor: COLORS.accent50,
  },
  {
    id: '3',
    icon: 'shield-checkmark-outline',
    title: 'Trusted Professionals',
    subtitle: 'Quality Guaranteed',
    description:
      'All our vendors are verified and rated by real customers. Enjoy secure payments and satisfaction guarantee on every service.',
    gradientColors: [COLORS.success, '#059669'],
    iconBgColor: '#D1FAE5',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  // Handle scroll end to update current index
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  // Complete onboarding and navigate to auth
  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('[Onboarding] Error saving onboarding status:', error);
      // Still navigate even if save fails
      router.replace('/(auth)/login');
    }
  }, [router]);

  // Go to next slide or complete
  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  }, [currentIndex, completeOnboarding]);

  // Skip to auth
  const handleSkip = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  // Render a single slide
  const renderSlide = useCallback(
    ({ item, index }: { item: OnboardingSlide; index: number }) => {
      // Animated scale for icon
      const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.8, 1, 0.8],
        extrapolate: 'clamp',
      });

      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.5, 1, 0.5],
        extrapolate: 'clamp',
      });

      return (
        <View style={[styles.slide, { width }]}>
          <LinearGradient
            colors={item.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.slideGradient}
          >
            {/* Icon Container with Animation */}
            <Animated.View
              style={[
                styles.iconContainer,
                { backgroundColor: item.iconBgColor },
                { transform: [{ scale }], opacity },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={moderateScale(80)}
                color={item.gradientColors[0]}
              />
            </Animated.View>

            {/* Decorative circles */}
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />
            <View style={[styles.decorCircle, styles.decorCircle3]} />
          </LinearGradient>

          {/* Content Card */}
          <View style={styles.contentCard}>
            <Text type="title" style={styles.title}>
              {item.title}
            </Text>
            <Text type="bodySemiBold" style={styles.subtitle}>
              {item.subtitle}
            </Text>
            <Text type="body2" style={styles.description}>
              {item.description}
            </Text>
          </View>
        </View>
      );
    },
    [scrollX]
  );

  // Render pagination dots
  const renderPagination = useCallback(() => {
    return (
      <View style={styles.pagination}>
        {SLIDES.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });

          const dotColor = scrollX.interpolate({
            inputRange,
            outputRange: [COLORS.gray300, COLORS.primary, COLORS.gray300],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: dotColor,
                },
              ]}
            />
          );
        })}
      </View>
    );
  }, [scrollX]);

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity
        style={[styles.skipButton, { top: insets.top + verticalScale(16) }]}
        onPress={handleSkip}
        activeOpacity={0.7}
      >
        <Text type="bodySemiBold" style={styles.skipText}>
          Skip
        </Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Bottom Section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + verticalScale(20) }]}>
        {/* Pagination */}
        {renderPagination()}

        {/* Action Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButtonGradient}
          >
            {currentIndex === SLIDES.length - 1 ? (
              <Text type="button" style={styles.nextButtonText}>
                Get Started
              </Text>
            ) : (
              <>
                <Text type="button" style={styles.nextButtonText}>
                  Next
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={moderateScale(20)}
                  color={COLORS.white}
                  style={{ marginLeft: scale(8) }}
                />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  skipButton: {
    position: 'absolute',
    right: scale(20),
    zIndex: 10,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  skipText: {
    color: COLORS.gray600,
    fontSize: moderateScale(14),
  },
  slide: {
    flex: 1,
  },
  slideGradient: {
    flex: 0.45,  // Reduced from 0.55 to give more space for content
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: moderateScale(40),
    borderBottomRightRadius: moderateScale(40),
    overflow: 'hidden',
  },
  iconContainer: {
    width: moderateScale(160),
    height: moderateScale(160),
    borderRadius: moderateScale(80),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle1: {
    width: moderateScale(300),
    height: moderateScale(300),
    top: -moderateScale(100),
    right: -moderateScale(100),
  },
  decorCircle2: {
    width: moderateScale(200),
    height: moderateScale(200),
    bottom: -moderateScale(50),
    left: -moderateScale(80),
  },
  decorCircle3: {
    width: moderateScale(120),
    height: moderateScale(120),
    top: moderateScale(40),
    left: -moderateScale(40),
  },
  contentCard: {
    flex: 0.55,  // Increased from 0.45 for more text space
    paddingHorizontal: scale(32),
    paddingTop: verticalScale(32),
    paddingBottom: verticalScale(120),  // Space for bottomSection overlay
    alignItems: 'center',
  },
  title: {
    fontSize: moderateScale(26),
    color: COLORS.gray900,
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  subtitle: {
    fontSize: moderateScale(16),
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: verticalScale(16),
  },
  description: {
    fontSize: moderateScale(15),
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: moderateScale(24),
    marginBottom: verticalScale(16),  // Reduced from 40
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: scale(32),
    paddingTop: verticalScale(16),
    backgroundColor: COLORS.white,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(28),
  },
  dot: {
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    marginHorizontal: scale(4),
  },
  nextButton: {
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(32),
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: moderateScale(16),
  },
});
