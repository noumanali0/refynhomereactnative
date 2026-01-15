import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import {
    CustomerCancelReasonCode,
    CUSTOMER_CANCEL_REASONS,
} from '@/services/serviceRequestApi';

interface CancelRequestModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (reasonCode?: CustomerCancelReasonCode, customReason?: string) => void;
    isLoading?: boolean;
    proposalCount?: number;
    status?: 'pending' | 'accepted';
}

export default function CancelRequestModal({
    visible,
    onClose,
    onConfirm,
    isLoading = false,
    proposalCount = 0,
    status = 'pending',
}: CancelRequestModalProps) {
    const [selectedReason, setSelectedReason] = useState<CustomerCancelReasonCode | null>(null);
    const [customReason, setCustomReason] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setSelectedReason(null);
            setCustomReason('');
        }
    }, [visible]);

    const handleConfirm = () => {
        if (isLoading) return;
        onConfirm(
            selectedReason || undefined,
            selectedReason === 'other' ? customReason : undefined
        );
    };

    const reasonOptions = Object.entries(CUSTOMER_CANCEL_REASONS) as [CustomerCancelReasonCode, string][];

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="alert-circle" size={28} color={COLORS.error} />
                        </View>
                        <Text style={styles.title}>Cancel Request?</Text>
                    </View>

                    {/* Warning Message */}
                    <Text style={styles.subtitle}>
                        Are you sure you want to cancel this service request?
                    </Text>

                    {/* Proposal Warning */}
                    {proposalCount > 0 && (
                        <View style={styles.warningBox}>
                            <Ionicons name="information-circle" size={18} color={COLORS.warning} />
                            <Text style={styles.warningText}>
                                {proposalCount} vendor{proposalCount > 1 ? 's have' : ' has'} already sent proposals
                            </Text>
                        </View>
                    )}

                    {/* Cooldown Notice */}
                    <View style={styles.noticeBox}>
                        <Ionicons name="time-outline" size={16} color={COLORS.gray500} />
                        <Text style={styles.noticeText}>
                            After cancelling, you'll need to wait 5 minutes before creating a new request
                        </Text>
                    </View>

                    {/* Reason Selection (Optional) */}
                    <Text style={styles.reasonLabel}>Reason (optional)</Text>
                    <ScrollView style={styles.reasonList} showsVerticalScrollIndicator={false}>
                        {reasonOptions.map(([code, label]) => (
                            <TouchableOpacity
                                key={code}
                                style={[
                                    styles.reasonItem,
                                    selectedReason === code && styles.reasonItemSelected,
                                ]}
                                onPress={() => setSelectedReason(code)}
                                disabled={isLoading}
                            >
                                <View style={[
                                    styles.radioOuter,
                                    selectedReason === code && styles.radioOuterSelected,
                                ]}>
                                    {selectedReason === code && <View style={styles.radioInner} />}
                                </View>
                                <Text style={[
                                    styles.reasonText,
                                    selectedReason === code && styles.reasonTextSelected,
                                ]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Custom Reason Input */}
                    {selectedReason === 'other' && (
                        <TextInput
                            style={styles.input}
                            placeholder="Please specify your reason..."
                            placeholderTextColor={COLORS.gray400}
                            value={customReason}
                            onChangeText={setCustomReason}
                            multiline
                            editable={!isLoading}
                            maxLength={200}
                        />
                    )}

                    {/* Action Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.keepButton}
                            onPress={onClose}
                            disabled={isLoading}
                        >
                            <Text style={styles.keepButtonText}>Keep Request</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
                            onPress={handleConfirm}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={COLORS.white} size="small" />
                            ) : (
                                <Text style={styles.cancelButtonText}>Cancel Request</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: scale(20),
    },
    modalContainer: {
        width: '100%',
        maxWidth: scale(340),
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        paddingVertical: verticalScale(24),
        paddingHorizontal: scale(20),
    },
    header: {
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.gray800,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.gray500,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 12,
        gap: 8,
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#92400E',
    },
    noticeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.gray50,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    noticeText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.gray500,
        lineHeight: 16,
    },
    reasonLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.gray700,
        marginBottom: 8,
    },
    reasonList: {
        maxHeight: 180,
        marginBottom: 12,
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 4,
        backgroundColor: COLORS.gray50,
    },
    reasonItemSelected: {
        backgroundColor: COLORS.primary50,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    radioOuter: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: COLORS.gray300,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    radioOuterSelected: {
        borderColor: COLORS.primary,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
    },
    reasonText: {
        fontSize: 14,
        color: COLORS.gray600,
    },
    reasonTextSelected: {
        color: COLORS.primary,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.gray200,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: COLORS.gray800,
        minHeight: 60,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: scale(12),
        marginTop: verticalScale(4),
    },
    keepButton: {
        flex: 1,
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(8),
        borderRadius: moderateScale(10),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.gray100,
        minHeight: verticalScale(44),
    },
    keepButtonText: {
        color: COLORS.gray700,
        fontWeight: '600',
        fontSize: moderateScale(13),
        textAlign: 'center',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(8),
        borderRadius: moderateScale(10),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.error,
        minHeight: verticalScale(44),
    },
    cancelButtonText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: moderateScale(13),
        textAlign: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
});
