// app/(vendor)/(subscriptions)/checkout.tsx
/**
 * Subscription Checkout Screen
 *
 * Handles payment and subscription activation.
 *
 * STRIPE INTEGRATION NOTES:
 * - Currently uses mock payment for testing
 * - To integrate real Stripe:
 *   1. Install: npm install @stripe/stripe-react-native
 *   2. Replace "Payment Method Section" with <CardField /> component
 *   3. Update purchasePlan() to use real Stripe payment method ID
 *   4. Backend should handle Stripe webhook events
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Text from '@/components/common/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { useSubscription } from '@/hooks/useSubscription';
import { PricingHeader } from '@/components/vendor/PricingHeader';
import { SubscriptionFeature } from '@/components/vendor/SubscriptionFeature';
import { isValidCardNumber, isValidExpiration, isValidCVC } from '@/utils/subscriptionUtils';
import { COLORS } from '@/constants/colors';

// ============================================================================
// Component
// ============================================================================

export default function CheckoutScreen() {
    const router = useRouter();
    const {
        selectedPlan,
        subscription,
        purchasePlan,
        isPaymentLoading,
        paymentError,
    } = useSubscription();

    const vendorId = useSelector((state: RootState) => state.auth.user?.uid);

    // Payment form state
    const [cardNumber, setCardNumber] = useState('');
    const [expiryMonth, setExpiryMonth] = useState('');
    const [expiryYear, setExpiryYear] = useState('');
    const [cvc, setCvc] = useState('');
    const [cardholderName, setCardholderName] = useState('');

    // Validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Success state
    const [showSuccess, setShowSuccess] = useState(false);

    // Redirect if no plan selected
    useEffect(() => {
        if (!selectedPlan) {
            router.back();
        }
    }, [selectedPlan]);

    // Format card number with spaces
    const formatCardNumber = (text: string) => {
        const cleaned = text.replace(/\s+/g, '');
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
        return formatted;
    };

    // Handle card number input
    const handleCardNumberChange = (text: string) => {
        const cleaned = text.replace(/\s+/g, '');
        if (cleaned.length <= 16) {
            setCardNumber(formatCardNumber(cleaned));
            if (errors.cardNumber) {
                setErrors({ ...errors, cardNumber: '' });
            }
        }
    };

    // Handle expiry input
    const handleExpiryChange = (text: string, field: 'month' | 'year') => {
        const cleaned = text.replace(/\D/g, '');
        if (field === 'month') {
            if (cleaned.length <= 2) {
                setExpiryMonth(cleaned);
                if (errors.expiry) {
                    setErrors({ ...errors, expiry: '' });
                }
            }
        } else {
            if (cleaned.length <= 2) {
                setExpiryYear(cleaned);
                if (errors.expiry) {
                    setErrors({ ...errors, expiry: '' });
                }
            }
        }
    };

    // Handle CVC input
    const handleCvcChange = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        if (cleaned.length <= 4) {
            setCvc(cleaned);
            if (errors.cvc) {
                setErrors({ ...errors, cvc: '' });
            }
        }
    };

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Card number validation
        const cleanedCard = cardNumber.replace(/\s+/g, '');
        if (!cleanedCard) {
            newErrors.cardNumber = 'Card number is required';
        } else if (!isValidCardNumber(cleanedCard)) {
            newErrors.cardNumber = 'Invalid card number';
        }

        // Expiry validation
        if (!expiryMonth || !expiryYear) {
            newErrors.expiry = 'Expiry date is required';
        } else {
            const month = parseInt(expiryMonth, 10);
            const year = parseInt('20' + expiryYear, 10);
            if (!isValidExpiration(month, year)) {
                newErrors.expiry = 'Invalid or expired date';
            }
        }

        // CVC validation
        if (!cvc) {
            newErrors.cvc = 'CVC is required';
        } else if (!isValidCVC(cvc)) {
            newErrors.cvc = 'Invalid CVC';
        }

        // Cardholder name validation
        if (!cardholderName.trim()) {
            newErrors.cardholderName = 'Cardholder name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle payment submission
    const handlePayment = async () => {
        // if (!validateForm() || !selectedPlan || !vendorId) {
        if (!validateForm() || !selectedPlan) {
            return;
        }

        try {
            // TODO: STRIPE INTEGRATION
            // When integrating Stripe, replace this with:
            // const { paymentMethod } = await stripe.createPaymentMethod({
            //   type: 'card',
            //   card: cardFieldRef.current,
            // });
            // Then pass paymentMethod.id to purchasePlan

            await purchasePlan(selectedPlan.id, 'mock_pm_test123');

            // Show success
            setShowSuccess(true);

            // Navigate back after delay
            setTimeout(() => {
                router.push('/(vendor)/(subscriptions)');
            }, 2000);
        } catch (error: any) {
            Alert.alert(
                'Payment Failed',
                error?.message || 'Unable to process payment. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

    if (!selectedPlan) {
        return null;
    }

    if (showSuccess) {
        return (
            <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
                </View>
                <Text type="title" style={styles.successTitle}>Payment Successful!</Text>
                <Text type="body2" style={styles.successMessage}>
                    Your {selectedPlan.name} subscription is now active
                </Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.gray900} />
                    </TouchableOpacity>
                    <Text type="title" style={styles.headerTitle}>Complete Payment</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Order Summary */}
                <View style={styles.section}>
                    <Text type="title" style={styles.sectionTitle}>Order Summary</Text>
                    <View style={styles.orderCard}>
                        <View style={styles.orderHeader}>
                            <Text type="title" style={styles.planName}>{selectedPlan.name} Plan</Text>
                            {selectedPlan.popular && (
                                <View style={styles.popularBadge}>
                                    <Text type="caption" style={styles.popularText}>POPULAR</Text>
                                </View>
                            )}
                        </View>

                        <PricingHeader
                            price={selectedPlan.price}
                            currency={selectedPlan.currency}
                            interval={selectedPlan.interval}
                            showSavings={false}
                        />

                        <View style={styles.featuresPreview}>
                            {selectedPlan.features.slice(0, 3).map((feature, index) => (
                                <SubscriptionFeature
                                    key={feature.id || index}
                                    feature={feature}
                                    size="small"
                                />
                            ))}
                            {selectedPlan.features.length > 3 && (
                                <Text type="body" style={styles.moreFeatures}>
                                    +{selectedPlan.features.length - 3} more features
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Payment Method Section */}
                {/* TODO: STRIPE INTEGRATION - Replace this section with:
                    <CardField
                      postalCodeEnabled={false}
                      onCardChange={(cardDetails) => {
                        setCardValid(cardDetails.complete);
                      }}
                      style={{ height: 50 }}
                    />
                */}
                <View style={styles.section}>
                    <Text type="title" style={styles.sectionTitle}>Payment Method</Text>
                    <Text type="body" style={styles.sectionSubtitle}>
                        Mock payment for testing (90% success rate)
                    </Text>

                    <View style={styles.paymentForm}>
                        {/* Card Number */}
                        <View style={styles.inputGroup}>
                            <Text type="subtitle2" style={styles.inputLabel}>Card Number</Text>
                            <View
                                style={[
                                    styles.inputContainer,
                                    errors.cardNumber && styles.inputError,
                                ]}
                            >
                                <Ionicons name="card" size={20} color={COLORS.gray500} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="1234 5678 9012 3456"
                                    value={cardNumber}
                                    onChangeText={handleCardNumberChange}
                                    keyboardType="numeric"
                                    maxLength={19}
                                    placeholderTextColor={COLORS.gray400}
                                />
                            </View>
                            {errors.cardNumber && (
                                <Text type="body" style={styles.errorText}>{errors.cardNumber}</Text>
                            )}
                        </View>

                        {/* Expiry & CVC Row */}
                        <View style={styles.row}>
                            {/* Expiry Date */}
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text type="subtitle2" style={styles.inputLabel}>Expiry Date</Text>
                                <View style={styles.expiryRow}>
                                    <View
                                        style={[
                                            styles.inputContainer,
                                            { flex: 1 },
                                            errors.expiry && styles.inputError,
                                        ]}
                                    >
                                        <TextInput
                                            style={styles.input}
                                            placeholder="MM"
                                            value={expiryMonth}
                                            onChangeText={(text) =>
                                                handleExpiryChange(text, 'month')
                                            }
                                            keyboardType="numeric"
                                            maxLength={2}
                                            placeholderTextColor={COLORS.gray400}
                                        />
                                    </View>
                                    <Text style={styles.expirySlash}>/</Text>
                                    <View
                                        style={[
                                            styles.inputContainer,
                                            { flex: 1 },
                                            errors.expiry && styles.inputError,
                                        ]}
                                    >
                                        <TextInput
                                            style={styles.input}
                                            placeholder="YY"
                                            value={expiryYear}
                                            onChangeText={(text) =>
                                                handleExpiryChange(text, 'year')
                                            }
                                            keyboardType="numeric"
                                            maxLength={2}
                                            placeholderTextColor={COLORS.gray400}
                                        />
                                    </View>
                                </View>
                                {errors.expiry && (
                                    <Text type="body" style={styles.errorText}>{errors.expiry}</Text>
                                )}
                            </View>

                            {/* CVC */}
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: scale(12) }]}>
                                <Text type="subtitle2" style={styles.inputLabel}>CVC</Text>
                                <View
                                    style={[
                                        styles.inputContainer,
                                        errors.cvc && styles.inputError,
                                    ]}
                                >
                                    <TextInput
                                        style={styles.input}
                                        placeholder="123"
                                        value={cvc}
                                        onChangeText={handleCvcChange}
                                        keyboardType="numeric"
                                        maxLength={4}
                                        placeholderTextColor={COLORS.gray400}
                                        secureTextEntry
                                    />
                                </View>
                                {errors.cvc && (
                                    <Text type="body" style={styles.errorText}>{errors.cvc}</Text>
                                )}
                            </View>
                        </View>

                        {/* Cardholder Name */}
                        <View style={styles.inputGroup}>
                            <Text type="subtitle2" style={styles.inputLabel}>Cardholder Name</Text>
                            <View
                                style={[
                                    styles.inputContainer,
                                    errors.cardholderName && styles.inputError,
                                ]}
                            >
                                <Ionicons name="person" size={20} color={COLORS.gray500} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="John Doe"
                                    value={cardholderName}
                                    onChangeText={(text) => {
                                        setCardholderName(text);
                                        if (errors.cardholderName) {
                                            setErrors({ ...errors, cardholderName: '' });
                                        }
                                    }}
                                    autoCapitalize="words"
                                    placeholderTextColor={COLORS.gray400}
                                />
                            </View>
                            {errors.cardholderName && (
                                <Text type="body" style={styles.errorText}>{errors.cardholderName}</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Error Display */}
                {paymentError && (
                    <View style={styles.errorBanner}>
                        <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                        <Text type="body2" style={styles.errorBannerText}>{paymentError}</Text>
                    </View>
                )}

                {/* Total Section */}
                <View style={styles.totalSection}>
                    <View style={styles.totalRow}>
                        <Text type="bodySemiBold" style={styles.totalLabel}>Total Due Today</Text>
                        <Text type="title" style={styles.totalAmount}>
                            ${selectedPlan.price.toFixed(2)}
                        </Text>
                    </View>
                    <Text type="body" style={styles.totalSubtext}>
                        Billed {selectedPlan.interval}ly • Cancel anytime
                    </Text>
                </View>
            </ScrollView>

            {/* Payment Button (Fixed at bottom) */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.payButton}
                    onPress={handlePayment}
                    disabled={isPaymentLoading}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.payButtonGradient}
                    >
                        {isPaymentLoading ? (
                            <>
                                <ActivityIndicator color={COLORS.white} />
                                <Text type="title" style={styles.payButtonText}>Processing...</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="lock-closed" size={20} color={COLORS.white} />
                                <Text type="title" style={styles.payButtonText}>
                                    Pay ${selectedPlan.price.toFixed(2)}
                                </Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
                <Text type="body" style={styles.secureText}>
                    <Ionicons name="shield-checkmark" size={12} color={COLORS.gray500} />{' '}
                    Secure payment
                </Text>
            </View>
        </KeyboardAvoidingView>
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
    scrollView: {
        flex: 1,
    },
    content: {
        padding: scale(16),
        paddingBottom: verticalScale(120),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: verticalScale(20),
    },
    backButton: {
        padding: scale(8),
    },
    headerTitle: {
        color: COLORS.gray900,
    },
    section: {
        marginBottom: verticalScale(24),
    },
    sectionTitle: {
        color: COLORS.gray900,
        marginBottom: verticalScale(8),
    },
    sectionSubtitle: {
        color: COLORS.gray600,
        marginBottom: verticalScale(12),
    },
    orderCard: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        padding: scale(20),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(12),
    },
    planName: {
        fontSize: moderateScale(20),
        color: COLORS.gray900,
    },
    popularBadge: {
        backgroundColor: COLORS.warning,
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(12),
    },
    popularText: {
        color: COLORS.white,
    },
    featuresPreview: {
        marginTop: verticalScale(16),
        paddingTop: verticalScale(16),
        borderTopWidth: 1,
        borderTopColor: COLORS.gray200,
        gap: verticalScale(4),
    },
    moreFeatures: {
        color: COLORS.primary,
        marginTop: verticalScale(8),
    },
    paymentForm: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        padding: scale(20),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    inputGroup: {
        marginBottom: verticalScale(16),
    },
    inputLabel: {
        color: COLORS.gray700,
        marginBottom: verticalScale(8),
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.gray50,
        borderRadius: moderateScale(12),
        borderWidth: 1,
        borderColor: COLORS.gray200,
        paddingHorizontal: scale(12),
        height: verticalScale(50),
        gap: scale(8),
    },
    inputError: {
        borderColor: COLORS.error,
        backgroundColor: COLORS.error + '05',
    },
    input: {
        flex: 1,
        fontSize: moderateScale(15),
        color: COLORS.gray900,
    },
    row: {
        flexDirection: 'row',
    },
    expiryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    expirySlash: {
        fontSize: moderateScale(18),
        color: COLORS.gray500,
    },
    errorText: {
        color: COLORS.error,
        marginTop: verticalScale(4),
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        backgroundColor: COLORS.error + '10',
        padding: scale(16),
        borderRadius: moderateScale(12),
        marginBottom: verticalScale(16),
    },
    errorBannerText: {
        flex: 1,
        color: COLORS.error,
    },
    totalSection: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        padding: scale(20),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(8),
    },
    totalLabel: {
        color: COLORS.gray700,
    },
    totalAmount: {
        fontSize: moderateScale(28),
        color: COLORS.gray900,
    },
    totalSubtext: {
        color: COLORS.gray600,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        padding: scale(16),
        paddingBottom: verticalScale(20),
        borderTopWidth: 1,
        borderTopColor: COLORS.gray200,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
    },
    payButton: {
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        marginBottom: verticalScale(8),
    },
    payButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        paddingVertical: verticalScale(16),
    },
    payButtonText: {
        fontSize: moderateScale(18),
        color: COLORS.white,
    },
    secureText: {
        color: COLORS.gray500,
        textAlign: 'center',
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.gray50,
        padding: scale(32),
    },
    successIcon: {
        marginBottom: verticalScale(24),
    },
    successTitle: {
        fontSize: moderateScale(28),
        color: COLORS.gray900,
        marginBottom: verticalScale(12),
        textAlign: 'center',
    },
    successMessage: {
        color: COLORS.gray600,
        textAlign: 'center',
    },
});
