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
import {
    VendorCancelReasonCode,
    VENDOR_CANCEL_REASONS,
} from '@/services/serviceRequestApi';

interface CancelJobModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (reasonCode: VendorCancelReasonCode, customReason?: string) => void;
    isLoading?: boolean;
    /** Current job status */
    status?: 'accepted' | 'en_route';
}

export default function CancelJobModal({
    visible,
    onClose,
    onConfirm,
    isLoading = false,
    status = 'accepted',
}: CancelJobModalProps) {
    const [selectedReason, setSelectedReason] = useState<VendorCancelReasonCode | null>(null);
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

        // Reason is optional but recommended
        onConfirm(
            selectedReason || 'other',
            selectedReason === 'other' ? customReason : undefined
        );
    };

    const reasonOptions = Object.entries(VENDOR_CANCEL_REASONS) as [VendorCancelReasonCode, string][];

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="warning" size={28} color={COLORS.error} />
                        </View>
                        <Text style={styles.title}>Cancel Job?</Text>
                    </View>

                    {/* Warning Message */}
                    <Text style={styles.subtitle}>
                        Are you sure you want to cancel this job? The customer will be notified.
                    </Text>

                    {/* En Route Warning */}
                    {status === 'en_route' && (
                        <View style={styles.cautionBox}>
                            <Ionicons name="car" size={18} color={COLORS.warning} />
                            <Text style={styles.cautionText}>
                                You are currently en route. Only cancel in case of emergency.
                            </Text>
                        </View>
                    )}

                    {/* Reason Selection (Optional but helps customer) */}
                    <Text style={styles.reasonLabel}>
                        Select a reason <Text style={styles.optional}>(optional)</Text>
                    </Text>
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
                            <Text style={styles.keepButtonText}>Keep Job</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.cancelButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={handleConfirm}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={COLORS.white} size="small" />
                            ) : (
                                <Text style={styles.cancelButtonText}>Cancel Job</Text>
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
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        paddingVertical: 24,
        paddingHorizontal: 20,
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
    cautionBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    cautionText: {
        flex: 1,
        fontSize: 13,
        color: '#92400E',
    },
    reasonLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.gray700,
        marginBottom: 8,
    },
    optional: {
        color: COLORS.gray400,
        fontWeight: '400',
    },
    reasonList: {
        maxHeight: 200,
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
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: COLORS.error,
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
        borderColor: COLORS.error,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.error,
    },
    reasonText: {
        fontSize: 14,
        color: COLORS.gray600,
    },
    reasonTextSelected: {
        color: COLORS.error,
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
        gap: 12,
        marginTop: 4,
    },
    keepButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: COLORS.gray100,
    },
    keepButtonText: {
        color: COLORS.gray700,
        fontWeight: '600',
        fontSize: 14,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: COLORS.error,
    },
    cancelButtonText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});
