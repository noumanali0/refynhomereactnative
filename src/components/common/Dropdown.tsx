/**
 * Custom Dropdown Component
 *
 * Uses Modal + FlatList instead of native picker to avoid crashes
 * on Android 14 with Fabric (New Architecture).
 *
 * The native @react-native-picker/picker has memory alignment issues
 * with Fabric that cause SIGABRT during component unmount.
 */

import React, { useState, useCallback, memo } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    Pressable
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import { COLORS } from "@/constants/colors";
import Text from "@/components/common/Text";

interface DropdownItem {
    label: string;
    value: string | number;
}

interface Props {
    label: string;
    items: DropdownItem[];
    value?: string;
    onValueChange: (val: string) => void;
    placeholder?: string;
    error?: string | boolean;
    disable?: boolean;
}

const Dropdown: React.FC<Props> = ({
    label,
    items,
    value,
    onValueChange,
    placeholder = "Select...",
    error,
    disable = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const selectedItem = items.find(item => item.value.toString() === value);
    const displayText = selectedItem?.label || placeholder;

    const handleSelect = useCallback((itemValue: string) => {
        onValueChange(itemValue);
        setIsOpen(false);
    }, [onValueChange]);

    const renderItem = useCallback(({ item }: { item: DropdownItem }) => (
        <TouchableOpacity
            style={[
                styles.optionItem,
                item.value.toString() === value && styles.optionItemSelected
            ]}
            onPress={() => handleSelect(item.value.toString())}
        >
            <Text
                type="body"
                style={[
                    styles.optionText,
                    item.value.toString() === value && styles.optionTextSelected
                ]}
            >
                {item.label}
            </Text>
            {item.value.toString() === value && (
                <Ionicons name="checkmark" size={20} color={COLORS.primary} />
            )}
        </TouchableOpacity>
    ), [value, handleSelect]);

    const keyExtractor = useCallback((item: DropdownItem) => item.value.toString(), []);

    return (
        <View style={styles.container}>
            <Text type="bodySemiBold" style={styles.label}>{label}</Text>

            <TouchableOpacity
                style={[
                    styles.dropdownButton,
                    error ? styles.dropdownError : styles.dropdownNormal,
                    disable && styles.dropdownDisabled,
                ]}
                onPress={() => !disable && setIsOpen(true)}
                activeOpacity={0.7}
                disabled={disable}
            >
                <Text
                    type="body"
                    style={[
                        styles.dropdownText,
                        !selectedItem && styles.placeholderText
                    ]}
                    numberOfLines={1}
                >
                    {displayText}
                </Text>
                <Ionicons
                    name="chevron-down-outline"
                    size={moderateScale(18)}
                    color={COLORS.gray500}
                />
            </TouchableOpacity>

            {!!error && typeof error === 'string' && (
                <Text type="body2" style={styles.errorText}>{error}</Text>
            )}

            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setIsOpen(false)}
                >
                    <Pressable
                        style={styles.modalContent}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.modalHeader}>
                            <Text type="bodySemiBold" style={styles.modalTitle}>
                                {label}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setIsOpen(false)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={24} color={COLORS.gray600} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={items}
                            keyExtractor={keyExtractor}
                            renderItem={renderItem}
                            style={styles.optionsList}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: verticalScale(16),
    },
    label: {
        fontSize: moderateScale(14),
        color: COLORS.gray900,
        marginBottom: verticalScale(8),
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderRadius: moderateScale(12),
        backgroundColor: COLORS.white,
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(16),
    },
    dropdownNormal: {
        borderColor: COLORS.gray300,
    },
    dropdownError: {
        borderColor: COLORS.error,
    },
    dropdownDisabled: {
        opacity: 0.5,
    },
    dropdownText: {
        flex: 1,
        fontSize: moderateScale(14),
        color: COLORS.gray900,
    },
    placeholderText: {
        color: COLORS.gray400,
    },
    errorText: {
        fontSize: moderateScale(12),
        color: COLORS.error,
        marginTop: verticalScale(4),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: scale(20),
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        width: '100%',
        maxHeight: '70%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: scale(16),
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
    },
    modalTitle: {
        fontSize: moderateScale(16),
        color: COLORS.gray900,
    },
    optionsList: {
        maxHeight: verticalScale(300),
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(16),
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray100,
    },
    optionItemSelected: {
        backgroundColor: COLORS.primary + '10',
    },
    optionText: {
        fontSize: moderateScale(14),
        color: COLORS.gray800,
    },
    optionTextSelected: {
        color: COLORS.primary,
        fontWeight: '600',
    },
});

export default memo(Dropdown);
