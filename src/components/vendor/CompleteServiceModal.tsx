import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';

interface CompleteServiceModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

export default function CompleteServiceModal({
    visible,
    onClose,
    onConfirm,
    isLoading = false,
}: CompleteServiceModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
                        </View>
                        <Text style={styles.title}>Complete Service?</Text>
                    </View>

                    {/* Message */}
                    <Text style={styles.subtitle}>
                        Are you sure you want to mark this service as completed? Make sure you have finished all the work before confirming.
                    </Text>

                    {/* Info Box */}
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={18} color={COLORS.primary} />
                        <Text style={styles.infoText}>
                            The customer will be notified and may leave a review for your service.
                        </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                            disabled={isLoading}
                        >
                            <Text style={styles.cancelButtonText}>Not Yet</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={onConfirm}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={COLORS.white} size="small" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark" size={18} color={COLORS.white} />
                                    <Text style={styles.confirmButtonText}>Complete</Text>
                                </>
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
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#D1FAE5',
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
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 20,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.primary,
        lineHeight: 18,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: COLORS.gray100,
    },
    cancelButtonText: {
        color: COLORS.gray700,
        fontWeight: '600',
        fontSize: 14,
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: COLORS.success,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    confirmButtonText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});
