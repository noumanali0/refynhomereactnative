import React, { useCallback, memo } from "react";
import { View, StyleSheet } from "react-native";
import RNPickerSelect from "react-native-picker-select";
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

const ChevronIcon = memo(function ChevronIcon() {
    return (
        <Ionicons
            name="chevron-down-outline"
            size={moderateScale(18)}
            color={COLORS.gray500}
        />
    );
});

const Dropdown: React.FC<Props> = ({
    label,
    items,
    value,
    onValueChange,
    placeholder = "Select...",
    error,
    disable = false,
}) => {
    const handleValueChange = useCallback((val: string) => {
        if (val !== null && val !== undefined) {
            onValueChange(val);
        }
    }, [onValueChange]);

    const pickerStyle = {
        inputIOS: {
            fontSize: moderateScale(14),
            color: value ? COLORS.gray900 : COLORS.gray400,
            paddingVertical: verticalScale(14),
            paddingHorizontal: scale(16),
            paddingRight: scale(40),
            width: '100%' as const,
        },
        inputAndroid: {
            fontSize: moderateScale(14),
            color: value ? COLORS.gray900 : COLORS.gray400,
            paddingVertical: verticalScale(14),
            paddingHorizontal: scale(16),
            paddingRight: scale(40),
            width: '100%' as const,
        },
        viewContainer: {
            width: '100%' as const,
        },
        iconContainer: {
            top: verticalScale(14),
            right: scale(16),
        },
        placeholder: {
            color: COLORS.gray400,
        },
    };

    return (
        <View style={styles.container}>
            {/* Label */}
            <Text type="bodySemiBold" style={styles.label}>{label}</Text>

            {/* Dropdown */}
            <View
                style={[
                    styles.dropdownContainer,
                    error ? styles.dropdownError : styles.dropdownNormal,
                    disable && styles.dropdownDisabled,
                ]}
            >
                <RNPickerSelect
                    onValueChange={handleValueChange}
                    items={items}
                    value={value}
                    disabled={disable}
                    useNativeAndroidPickerStyle={false}
                    placeholder={{ label: placeholder, value: "" }}
                    style={pickerStyle}
                    Icon={ChevronIcon}
                />
            </View>

            {/* Error Message */}
            {!!error && typeof error === 'string' && (
                <Text type="body2" style={styles.errorText}>{error}</Text>
            )}
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
    dropdownContainer: {
        borderWidth: 1.5,
        borderRadius: moderateScale(12),
        backgroundColor: COLORS.white,
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
    errorText: {
        fontSize: moderateScale(12),
        color: COLORS.error,
        marginTop: verticalScale(4),
    },
});

export default memo(Dropdown);
