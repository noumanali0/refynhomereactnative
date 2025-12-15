import { View, StyleSheet } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { moderateScale, scale, verticalScale } from 'react-native-size-matters'
import Text from '@/components/common/Text'
import { COLORS } from '@/constants/colors'

const SubscriptionsScreen = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text type="title" style={styles.headerTitle}>Subscriptions</Text>
        <Text type="body2" style={styles.headerSubtitle}>Manage your subscription plans</Text>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {/* Coming Soon Card */}
        <View style={styles.card}>
          {/* Icon Circle */}
          <View style={styles.iconCircle}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="rocket-outline" size={48} color={COLORS.white} />
            </LinearGradient>
          </View>

          {/* Text Content */}
          <Text type="title" style={styles.title}>Coming Soon!</Text>
          <Text type="body" style={styles.description}>
            We're working hard to bring you amazing subscription plans with exclusive features and benefits.
          </Text>

          {/* Features Preview */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="flash" size={20} color={COLORS.primary} />
              </View>
              <Text type="body2" style={styles.featureText}>Priority Requests</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="star" size={20} color={COLORS.warning} />
              </View>
              <Text type="body2" style={styles.featureText}>Premium Badge</Text>
            </View>
            {/* <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="analytics" size={20} color={COLORS.success} />
              </View>
              <Text type="body2" style={styles.featureText}>Advanced Analytics</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="headset" size={20} color={COLORS.accent} />
              </View>
              <Text type="body2" style={styles.featureText}>24/7 Support</Text>
            </View> */}
          </View>

          {/* Stay Tuned Badge */}
          <View style={styles.badge}>
            <Ionicons name="notifications-outline" size={16} color={COLORS.primary} />
            <Text type="caption" style={styles.badgeText}>Stay tuned for updates!</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  header: {
    paddingTop: verticalScale(30),
    paddingBottom: verticalScale(30),
    paddingHorizontal: scale(20),
    borderBottomLeftRadius: moderateScale(24),
    borderBottomRightRadius: moderateScale(24),
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
    padding: scale(20),
    justifyContent: 'center',
    marginTop: verticalScale(-20),
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(24),
    padding: scale(32),
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    marginBottom: verticalScale(24),
  },
  iconGradient: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: moderateScale(28),
    fontWeight: '800',
    color: COLORS.gray900,
    marginBottom: verticalScale(12),
    textAlign: 'center',
  },
  description: {
    fontSize: moderateScale(15),
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: moderateScale(24),
    marginBottom: verticalScale(28),
    paddingHorizontal: scale(8),
  },
  featuresContainer: {
    width: '100%',
    marginBottom: verticalScale(24),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    backgroundColor: COLORS.gray50,
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(10),
  },
  featureIcon: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureText: {
    fontSize: moderateScale(14),
    color: COLORS.gray700,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    borderRadius: moderateScale(20),
    gap: scale(8),
  },
  badgeText: {
    fontSize: moderateScale(13),
    color: COLORS.primary,
    fontWeight: '600',
  },
})

export default SubscriptionsScreen

// // app/(vendor)/(subscriptions)/index.tsx
// /**
//  * Vendor Subscriptions Screen
//  *
//  * Main screen for viewing and managing subscription plans.
//  * Displays current subscription status and available plans.
//  */

// import React, { useEffect } from 'react';
// import {
//     View,
//     ScrollView,
//     TouchableOpacity,
//     StyleSheet,
//     RefreshControl,
//     ActivityIndicator,
// } from 'react-native';
// import Text from '@/components/common/Text';
// import { useRouter } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
// import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
// import { useSelector } from 'react-redux';
// import type { RootState } from '@/store';
// import { useSubscription } from '@/hooks/useSubscription';
// import { SubscriptionCard } from '@/components/vendor/SubscriptionCard';
// import { SubscriptionStatusBadge } from '@/components/vendor/SubscriptionStatusBadge';
// import { COLORS } from '@/constants/colors';

// // ============================================================================
// // Component
// // ============================================================================

// export default function SubscriptionsScreen() {
//     const router = useRouter();
//     const {
//         subscription,
//         currentTier,
//         plans,
//         isLoading,
//         error,
//         usagePercentage,
//         remainingDisplay,
//         daysUntilBilling,
//         healthStatus,
//         needsAttention,
//         statusMessage,
//         initialize,
//         refresh,
//         selectPlan,
//     } = useSubscription();

//     // Get vendor ID from auth state
//     const vendorId = useSelector((state: RootState) => state.auth.user?.uid || state.auth.user?.id);

//     // Initialize on mount - use actual vendor ID from auth state
//     useEffect(() => {
//         if (vendorId) {
//             initialize(vendorId.toString());
//         }
//     }, [vendorId]);

//     // Handle plan selection
//     const handleSelectPlan = (planId: string) => {
//         selectPlan(planId);
//         router.push('/(vendor)/(subscriptions)/checkout');
//     };

//     // Handle refresh
//     const [refreshing, setRefreshing] = React.useState(false);
//     const onRefresh = async () => {
//         setRefreshing(true);
//         await refresh();
//         setRefreshing(false);
//     };

//     if (isLoading && !subscription) {
//         return (
//             <View style={styles.loadingContainer}>
//                 <ActivityIndicator size="large" color={COLORS.primary} />
//                 <Text type="body2" style={styles.loadingText}>Loading subscriptions...</Text>
//             </View>
//         );
//     }

//     return (
//         <ScrollView
//             style={styles.container}
//             contentContainerStyle={styles.content}
//             refreshControl={
//                 <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//             }
//         >
//             {/* Current Subscription Status */}
//             {subscription && (
//                 <View style={styles.statusCard}>
//                     <View style={styles.statusHeader}>
//                         <Text type="subtitle2" style={styles.statusTitle}>Current Plan</Text>
//                         <SubscriptionStatusBadge
//                             status={subscription.status}
//                             size="medium"
//                         />
//                     </View>

//                     <View style={styles.statusBody}>
//                         <Text type="title" style={styles.planName}>{subscription.plan.name}</Text>
//                         <Text type="body2" style={styles.statusMessage}>{statusMessage}</Text>
//                     </View>

//                     {/* Usage Stats */}
//                     {subscription.requestsRemaining !== null && (
//                         <View style={styles.usageSection}>
//                             <View style={styles.usageHeader}>
//                                 <Text type="body" style={styles.usageLabel}>Requests This Month</Text>
//                                 <Text type="bodySemiBold" style={styles.usageValue}>{remainingDisplay}</Text>
//                             </View>
//                             <View style={styles.progressBar}>
//                                 <View
//                                     style={[
//                                         styles.progressFill,
//                                         {
//                                             width: `${usagePercentage}%`,
//                                             backgroundColor:
//                                                 usagePercentage >= 80
//                                                     ? COLORS.error
//                                                     : COLORS.success,
//                                         },
//                                     ]}
//                                 />
//                             </View>
//                         </View>
//                     )}

//                     {/* Billing Info */}
//                     {subscription.tier !== 'free' && (
//                         <View style={styles.billingInfo}>
//                             <Ionicons name="calendar" size={16} color={COLORS.gray600} />
//                             <Text type="body" style={styles.billingText}>
//                                 {subscription.cancelAtPeriodEnd
//                                     ? `Cancels in ${daysUntilBilling} days`
//                                     : `Renews in ${daysUntilBilling} days`}
//                             </Text>
//                         </View>
//                     )}

//                     {/* Attention Banner */}
//                     {needsAttention && (
//                         <View style={styles.attentionBanner}>
//                             <Ionicons name="warning" size={16} color={COLORS.warning} />
//                             <Text type="body" style={styles.attentionText}>
//                                 Action required: {statusMessage}
//                             </Text>
//                         </View>
//                     )}
//                 </View>
//             )}

//             {/* Error Display */}
//             {error && (
//                 <View style={styles.errorCard}>
//                     <Ionicons name="alert-circle" size={20} color={COLORS.error} />
//                     <Text type="body2" style={styles.errorText}>{error}</Text>
//                 </View>
//             )}

//             {/* Available Plans */}
//             <View style={styles.plansSection}>
//                 <Text type="title" style={styles.sectionTitle}>Choose Your Plan</Text>
//                 <Text type="body2" style={styles.sectionSubtitle}>
//                     Select the plan that best fits your business needs
//                 </Text>

//                 {plans.map(plan => (
//                     <SubscriptionCard
//                         key={plan.id}
//                         plan={plan}
//                         currentTier={currentTier}
//                         isActive={plan.tier === currentTier}
//                         onSelect={handleSelectPlan}
//                     />
//                 ))}
//             </View>

//             {/* Help Section */}
//             <View style={styles.helpCard}>
//                 <View style={styles.helpIcon}>
//                     <Ionicons name="help-circle" size={24} color={COLORS.primary} />
//                 </View>
//                 <Text type="title" style={styles.helpTitle}>Need help choosing?</Text>
//                 <Text type="body2" style={styles.helpText}>
//                     Contact our support team for personalized recommendations
//                 </Text>
//                 <TouchableOpacity style={styles.helpButton}>
//                     <Text type="button" style={styles.helpButtonText}>Contact Support</Text>
//                 </TouchableOpacity>
//             </View>
//         </ScrollView>
//     );
// }

// // ============================================================================
// // Styles
// // ============================================================================

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: COLORS.gray50,
//     },
//     content: {
//         padding: scale(16),
//         paddingBottom: verticalScale(32),
//     },
//     loadingContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         backgroundColor: COLORS.gray50,
//         gap: verticalScale(12),
//     },
//     loadingText: {
//         color: COLORS.gray600,
//     },
//     statusCard: {
//         backgroundColor: COLORS.white,
//         borderRadius: moderateScale(16),
//         padding: scale(20),
//         marginBottom: verticalScale(20),
//         shadowColor: COLORS.black,
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.06,
//         shadowRadius: 8,
//         elevation: 2,
//     },
//     statusHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginBottom: verticalScale(16),
//     },
//     statusTitle: {
//         color: COLORS.gray600,
//     },
//     statusBody: {
//         marginBottom: verticalScale(16),
//     },
//     planName: {
//         fontSize: moderateScale(24),
//         color: COLORS.gray900,
//         marginBottom: verticalScale(4),
//     },
//     statusMessage: {
//         color: COLORS.gray600,
//     },
//     usageSection: {
//         marginBottom: verticalScale(16),
//     },
//     usageHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginBottom: verticalScale(8),
//     },
//     usageLabel: {
//         color: COLORS.gray600,
//     },
//     usageValue: {
//         color: COLORS.gray900,
//     },
//     progressBar: {
//         height: verticalScale(8),
//         backgroundColor: COLORS.gray200,
//         borderRadius: moderateScale(4),
//         overflow: 'hidden',
//     },
//     progressFill: {
//         height: '100%',
//         borderRadius: moderateScale(4),
//     },
//     billingInfo: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         gap: scale(8),
//         paddingTop: verticalScale(12),
//         borderTopWidth: 1,
//         borderTopColor: COLORS.gray200,
//     },
//     billingText: {
//         color: COLORS.gray600,
//     },
//     attentionBanner: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         gap: scale(8),
//         backgroundColor: COLORS.warning + '15',
//         padding: scale(12),
//         borderRadius: moderateScale(8),
//         marginTop: verticalScale(12),
//     },
//     attentionText: {
//         flex: 1,
//         color: COLORS.warning,
//     },
//     errorCard: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         gap: scale(12),
//         backgroundColor: COLORS.error + '10',
//         padding: scale(16),
//         borderRadius: moderateScale(12),
//         marginBottom: verticalScale(20),
//     },
//     errorText: {
//         flex: 1,
//         color: COLORS.error,
//     },
//     plansSection: {
//         marginBottom: verticalScale(24),
//     },
//     sectionTitle: {
//         fontSize: moderateScale(22),
//         color: COLORS.gray900,
//         marginBottom: verticalScale(8),
//     },
//     sectionSubtitle: {
//         color: COLORS.gray600,
//         marginBottom: verticalScale(20),
//     },
//     helpCard: {
//         backgroundColor: COLORS.white,
//         borderRadius: moderateScale(16),
//         padding: scale(24),
//         alignItems: 'center',
//         shadowColor: COLORS.black,
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.06,
//         shadowRadius: 8,
//         elevation: 2,
//     },
//     helpIcon: {
//         width: moderateScale(56),
//         height: moderateScale(56),
//         borderRadius: moderateScale(28),
//         backgroundColor: COLORS.primary50,
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginBottom: verticalScale(12),
//     },
//     helpTitle: {
//         color: COLORS.gray900,
//         marginBottom: verticalScale(8),
//     },
//     helpText: {
//         color: COLORS.gray600,
//         textAlign: 'center',
//         marginBottom: verticalScale(16),
//     },
//     helpButton: {
//         backgroundColor: COLORS.primary,
//         paddingHorizontal: scale(24),
//         paddingVertical: verticalScale(10),
//         borderRadius: moderateScale(10),
//     },
//     helpButtonText: {
//         color: COLORS.white,
//     },
// });
