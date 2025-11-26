import React from "react";
import { View, Text, StyleSheet } from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import { COLORS } from "@/constants/colors";

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
    return (
        <View style={styles.container}>
            {/* Label */}
            <Text style={styles.label}>{label}</Text>

            {/* Dropdown */}
            <View
                style={[
                    styles.dropdownContainer,
                    error ? styles.dropdownError : styles.dropdownNormal,
                    disable && styles.dropdownDisabled,
                ]}
            >
                <RNPickerSelect
                    onValueChange={onValueChange}
                    items={items}
                    value={value}
                    disabled={disable}
                    useNativeAndroidPickerStyle={false}
                    placeholder={{ label: placeholder, value: "" }}
                    style={{
                        inputIOS: {
                            fontSize: moderateScale(14),
                            color: value ? COLORS.gray900 : COLORS.gray400,
                            paddingVertical: verticalScale(14),
                            paddingHorizontal: scale(16),
                            paddingRight: scale(40), // Space for icon
                            width: '100%',
                        },
                        inputAndroid: {
                            fontSize: moderateScale(14),
                            color: value ? COLORS.gray900 : COLORS.gray400,
                            paddingVertical: verticalScale(14),
                            paddingHorizontal: scale(16),
                            paddingRight: scale(40), // Space for icon
                            width: '100%',
                        },
                        viewContainer: {
                            width: '100%',
                        },
                        iconContainer: {
                            top: verticalScale(14),
                            right: scale(16),
                        },
                        placeholder: {
                            color: COLORS.gray400,
                        },
                    }}
                    Icon={() => (
                        <Ionicons
                            name="chevron-down-outline"
                            size={moderateScale(18)}
                            color={COLORS.gray500}
                        />
                    )}
                />
            </View>

            {/* Error Message */}
            {!!error && typeof error === 'string' && (
                <Text style={styles.errorText}>{error}</Text>
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
        fontWeight: '600',
        color: COLORS.gray900,
        marginBottom: verticalScale(8),
        fontFamily: 'Poppins-SemiBold',
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
        fontFamily: 'Poppins-Regular',
    },
});

export default Dropdown;
