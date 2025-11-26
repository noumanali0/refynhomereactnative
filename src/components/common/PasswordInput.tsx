/**
 * PasswordInput Component
 *
 * Reusable password input with show/hide toggle and optional strength indicator
 * Matches the design system of the RefynHome app
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from 'react-native-size-matters';

// ============================================================================
// TYPES
// ============================================================================

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  showStrengthIndicator?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

// ============================================================================
// PASSWORD STRENGTH CALCULATOR
// ============================================================================

function calculatePasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  color: string;
  text: string;
} {
  if (!password) {
    return { strength: 'weak', score: 0, color: '#EF4444', text: '' };
  }

  let score = 0;

  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1; // lowercase
  if (/[A-Z]/.test(password)) score += 1; // uppercase
  if (/[0-9]/.test(password)) score += 1; // numbers
  if (/[^a-zA-Z0-9]/.test(password)) score += 1; // special chars

  // Determine strength level
  if (score <= 2) {
    return { strength: 'weak', score, color: '#EF4444', text: 'Weak' };
  } else if (score <= 4) {
    return { strength: 'medium', score, color: '#F59E0B', text: 'Medium' };
  } else {
    return { strength: 'strong', score, color: '#10B981', text: 'Strong' };
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PasswordInput({
  value,
  onChangeText,
  placeholder = 'Enter password',
  label,
  error,
  showStrengthIndicator = false,
  icon = 'lock-closed-outline',
  ...props
}: PasswordInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const passwordStrength = showStrengthIndicator
    ? calculatePasswordStrength(value)
    : null;

  return (
    <View style={styles.container}>
      {/* Label */}
      {label && <Text style={styles.label}>{label}</Text>}

      {/* Input Wrapper */}
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        {/* Icon */}
        <Ionicons
          name={icon}
          size={moderateScale(20)}
          color={error ? '#EF4444' : '#2563EB'}
          style={styles.icon}
        />

        {/* Text Input */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!isPasswordVisible}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          {...props}
        />

        {/* Show/Hide Toggle */}
        <TouchableOpacity
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          style={styles.toggleButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
            size={moderateScale(20)}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>

      {/* Password Strength Indicator */}
      {showStrengthIndicator && value.length > 0 && passwordStrength && (
        <View style={styles.strengthContainer}>
          {/* Strength Bars */}
          <View style={styles.strengthBars}>
            {[1, 2, 3, 4].map((bar) => (
              <View
                key={bar}
                style={[
                  styles.strengthBar,
                  {
                    backgroundColor:
                      bar <= passwordStrength.score / 1.5
                        ? passwordStrength.color
                        : '#E5E7EB',
                  },
                ]}
              />
            ))}
          </View>

          {/* Strength Text */}
          <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
            {passwordStrength.text}
          </Text>
        </View>
      )}

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: moderateScale(16),
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: moderateScale(8),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: moderateScale(16),
    height: moderateScale(56),
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  icon: {
    marginRight: moderateScale(12),
  },
  input: {
    flex: 1,
    fontSize: moderateScale(16),
    color: '#1F2937',
    fontFamily: 'System',
  },
  toggleButton: {
    padding: moderateScale(4),
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateScale(8),
  },
  strengthBars: {
    flexDirection: 'row',
    gap: moderateScale(4),
    flex: 1,
    marginRight: moderateScale(12),
  },
  strengthBar: {
    flex: 1,
    height: moderateScale(4),
    borderRadius: moderateScale(2),
  },
  strengthText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  errorText: {
    fontSize: moderateScale(12),
    color: '#EF4444',
    marginTop: moderateScale(6),
    marginLeft: moderateScale(4),
  },
});
