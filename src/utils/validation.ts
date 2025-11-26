/**
 * Form Validation Schemas
 *
 * Yup validation schemas for all authentication forms.
 * Aligned with Django backend validation requirements.
 */

import * as yup from 'yup';

// ============================================================================
// PHONE NUMBER VALIDATION
// ============================================================================

/**
 * Phone number regex
 * Supports formats:
 * - +923001234567 (with country code)
 * - 03001234567 (without country code)
 * - 923001234567 (without +)
 */
const phoneRegex = /^(\+92|92|0)?3\d{9}$/;

export const phoneNumberSchema = yup
  .string()
  .required('Phone number is required')
  .matches(phoneRegex, 'Please enter a valid Pakistani phone number')
  .trim();

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

/**
 * Password validation
 * Requirements match Django's default password validators:
 * - Minimum 8 characters
 * - Not too common
 * - Not entirely numeric
 * - Not too similar to user attributes
 */
export const passwordSchema = yup
  .string()
  .required('Password is required')
  .min(8, 'Password must be at least 8 characters')
  .matches(/[a-zA-Z]/, 'Password must contain at least one letter')
  .matches(/\d/, 'Password must contain at least one number');

export const confirmPasswordSchema = (passwordField: string = 'password') =>
  yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref(passwordField)], 'Passwords must match');

// ============================================================================
// NAME VALIDATION
// ============================================================================

export const nameSchema = yup
  .string()
  .required('Name is required')
  .min(2, 'Name must be at least 2 characters')
  .max(120, 'Name is too long')
  .trim();

export const firstNameSchema = yup
  .string()
  .min(2, 'First name must be at least 2 characters')
  .max(60, 'First name is too long')
  .trim();

export const lastNameSchema = yup
  .string()
  .min(2, 'Last name must be at least 2 characters')
  .max(60, 'Last name is too long')
  .trim();

// ============================================================================
// ADDRESS VALIDATION
// ============================================================================

export const addressSchema = yup
  .string()
  .required('Address is required')
  .min(10, 'Please enter a complete address')
  .max(500, 'Address is too long')
  .trim();

export const citySchema = yup
  .string()
  .required('City is required')
  .min(2, 'City name is too short')
  .max(120, 'City name is too long')
  .trim();

// ============================================================================
// CNIC VALIDATION (Pakistan National ID)
// ============================================================================

/**
 * CNIC format: 12345-1234567-1 (13 digits with dashes)
 */
const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;

export const cnicSchema = yup
  .string()
  .required('CNIC is required')
  .matches(cnicRegex, 'CNIC must be in format: 12345-1234567-1')
  .trim();

// ============================================================================
// OTP VALIDATION
// ============================================================================

export const otpSchema = yup
  .string()
  .required('OTP code is required')
  .matches(/^\d{6}$/, 'OTP must be 6 digits')
  .length(6, 'OTP must be 6 digits');

// ============================================================================
// AUTH FORM SCHEMAS
// ============================================================================

/**
 * Login Form Schema
 * Fields: phone, password
 */
export const loginSchema = yup.object().shape({
  phone: phoneNumberSchema,
  password: yup.string().required('Password is required'),
});

/**
 * Customer Signup Form Schema
 * Fields: phone, password, confirmPassword, firstName, lastName, address, city
 */
export const customerSignupSchema = yup.object().shape({
  phone: phoneNumberSchema,
  password: passwordSchema,
  confirmPassword: confirmPasswordSchema(),
  firstName: firstNameSchema.required('First name is required'),
  lastName: lastNameSchema.required('Last name is required'),
  address: addressSchema,
  city: citySchema,
});

/**
 * Vendor Signup Form Schema (Initial)
 * Fields: phone, password, confirmPassword, firstName, lastName
 * Note: address and city are optional for vendors
 */
export const vendorSignupSchema = yup.object().shape({
  phone: phoneNumberSchema,
  password: passwordSchema,
  confirmPassword: confirmPasswordSchema(),
  firstName: firstNameSchema.required('First name is required'),
  lastName: lastNameSchema.required('Last name is required'),
  address: yup.string().trim(),
  city: yup.string().trim(),
});

/**
 * OTP Verification Form Schema
 * Fields: otp
 */
export const otpVerificationSchema = yup.object().shape({
  otp: otpSchema,
});

/**
 * Vendor Onboarding Form Schema
 * Fields: cnic, bio, address, city, profilePhoto, idVerificationPhoto, serviceCategories
 */
export const vendorOnboardingSchema = yup.object().shape({
  cnic: cnicSchema,
  bio: yup
    .string()
    .min(20, 'Bio must be at least 20 characters')
    .max(500, 'Bio is too long')
    .trim(),
  address: yup.string().trim(),
  city: yup.string().trim(),
  profilePhoto: yup.mixed().nullable(),
  idVerificationPhoto: yup.mixed().nullable(),
  serviceCategories: yup
    .array()
    .of(yup.number().positive().integer())
    .min(1, 'Please select at least one service category')
    .required('Please select service categories'),
});

/**
 * Password Reset Request Schema
 * Fields: phone
 */
export const passwordResetRequestSchema = yup.object().shape({
  phone: phoneNumberSchema,
});

/**
 * Password Reset Confirm Schema
 * Fields: otp, newPassword, confirmPassword
 */
export const passwordResetConfirmSchema = yup.object().shape({
  otp: otpSchema,
  newPassword: passwordSchema,
  confirmPassword: confirmPasswordSchema('newPassword'),
});

// ============================================================================
// PROFILE UPDATE SCHEMAS
// ============================================================================

/**
 * Update Profile Schema
 * Fields: firstName, lastName, address, city
 */
export const updateProfileSchema = yup.object().shape({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  address: yup.string().trim(),
  city: yup.string().trim(),
});

/**
 * Change Password Schema
 * Fields: currentPassword, newPassword, confirmPassword
 */
export const changePasswordSchema = yup.object().shape({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: confirmPasswordSchema('newPassword'),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format phone number for display
 * Converts: 923001234567 or 03001234567 to +92 300 1234567
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle different formats
  if (digits.startsWith('92')) {
    // Already has country code (92...)
    const countryCode = digits.slice(0, 2);
    const part1 = digits.slice(2, 5);
    const part2 = digits.slice(5);
    return `+${countryCode} ${part1} ${part2}`;
  } else if (digits.startsWith('0')) {
    // Starts with 0 (0300...)
    const part1 = digits.slice(1, 4);
    const part2 = digits.slice(4);
    return `+92 ${part1} ${part2}`;
  } else {
    // Unknown format, return as is
    return phone;
  }
}

/**
 * Normalize phone number for API
 * Converts all formats to: +923001234567
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle different formats
  if (digits.startsWith('92')) {
    // Already has country code
    return `+${digits}`;
  } else if (digits.startsWith('0')) {
    // Remove leading 0 and add country code
    return `+92${digits.slice(1)}`;
  } else {
    // Assume it's a local number without 0
    return `+92${digits}`;
  }
}

/**
 * Format CNIC for display
 * Converts: 1234512345671 to 12345-1234567-1
 */
export function formatCNIC(cnic: string): string {
  // Remove all non-digit characters
  const digits = cnic.replace(/\D/g, '');

  if (digits.length !== 13) {
    return cnic; // Return as is if not 13 digits
  }

  const part1 = digits.slice(0, 5);
  const part2 = digits.slice(5, 12);
  const part3 = digits.slice(12);

  return `${part1}-${part2}-${part3}`;
}

/**
 * Validate field and return error message
 * Used for real-time validation
 */
export async function validateField(
  schema: yup.StringSchema | yup.NumberSchema | yup.ObjectSchema<any>,
  value: any
): Promise<string | null> {
  try {
    await schema.validate(value);
    return null;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return error.message;
    }
    return 'Validation error';
  }
}

/**
 * Validate entire form
 * Returns object with field errors or null if valid
 */
export async function validateForm<T extends Record<string, any>>(
  schema: yup.ObjectSchema<any>,
  values: T
): Promise<Record<string, string> | null> {
  try {
    await schema.validate(values, { abortEarly: false });
    return null;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors: Record<string, string> = {};
      error.inner.forEach((err) => {
        if (err.path) {
          errors[err.path] = err.message;
        }
      });
      return errors;
    }
    return null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Schemas
  loginSchema,
  customerSignupSchema,
  vendorSignupSchema,
  otpVerificationSchema,
  vendorOnboardingSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  updateProfileSchema,
  changePasswordSchema,

  // Field schemas
  phoneNumberSchema,
  passwordSchema,
  confirmPasswordSchema,
  nameSchema,
  firstNameSchema,
  lastNameSchema,
  addressSchema,
  citySchema,
  cnicSchema,
  otpSchema,

  // Helpers
  formatPhoneNumber,
  normalizePhoneNumber,
  formatCNIC,
  validateField,
  validateForm,
};
