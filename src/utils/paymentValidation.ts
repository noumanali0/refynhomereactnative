// src/utils/paymentValidation.ts
/**
 * Payment Validation Utilities
 *
 * Utilities for validating payment information like card numbers,
 * expiry dates, and CVCs. Uses Luhn algorithm for card validation.
 */

// ============================================================================
// Card Number Validation
// ============================================================================

/**
 * Validates credit card number using Luhn algorithm
 * @param cardNumber - The card number to validate (can include spaces)
 * @returns true if valid, false otherwise
 */
export function isValidCardNumber(cardNumber: string): boolean {
    // Remove spaces and non-digits
    const cleaned = cardNumber.replace(/\D/g, '');

    // Check length (13-19 digits for most cards)
    if (cleaned.length < 13 || cleaned.length > 19) {
        return false;
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    // Loop through values from right to left
    for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
}

/**
 * Formats card number with spaces (e.g., "1234 5678 9012 3456")
 * @param cardNumber - The card number to format
 * @returns Formatted card number
 */
export function formatCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ').substring(0, 19); // Max 16 digits + 3 spaces
}

/**
 * Gets card type from card number
 * @param cardNumber - The card number
 * @returns Card type (visa, mastercard, amex, discover, unknown)
 */
export function getCardType(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');

    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';

    return 'unknown';
}

// ============================================================================
// Expiry Validation
// ============================================================================

/**
 * Validates card expiry date
 * @param month - Month (1-12)
 * @param year - Full year (e.g., 2024) or 2-digit year (e.g., 24)
 * @returns true if valid and not expired, false otherwise
 */
export function isValidExpiration(month: number, year: number): boolean {
    // Validate month
    if (month < 1 || month > 12) {
        return false;
    }

    // Convert 2-digit year to 4-digit if needed
    const fullYear = year < 100 ? 2000 + year : year;

    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11

    // Check if expired
    if (fullYear < currentYear) {
        return false;
    }

    if (fullYear === currentYear && month < currentMonth) {
        return false;
    }

    return true;
}

/**
 * Formats expiry date as MM/YY
 * @param month - Month string (e.g., "1", "01", "12")
 * @param year - Year string (e.g., "24", "2024")
 * @returns Formatted expiry (e.g., "01/24")
 */
export function formatExpiry(month: string, year: string): string {
    const paddedMonth = month.padStart(2, '0');
    const shortYear = year.length === 4 ? year.substring(2) : year;
    return `${paddedMonth}/${shortYear}`;
}

// ============================================================================
// CVC Validation
// ============================================================================

/**
 * Validates CVC/CVV code
 * @param cvc - The CVC code
 * @param cardType - Optional card type (amex requires 4 digits)
 * @returns true if valid, false otherwise
 */
export function isValidCVC(cvc: string, cardType?: string): boolean {
    const cleaned = cvc.replace(/\D/g, '');

    // American Express uses 4 digits, others use 3
    if (cardType === 'amex') {
        return cleaned.length === 4;
    }

    return cleaned.length === 3;
}

// ============================================================================
// Cardholder Name Validation
// ============================================================================

/**
 * Validates cardholder name
 * @param name - The cardholder name
 * @returns true if valid, false otherwise
 */
export function isValidCardholderName(name: string): boolean {
    const trimmed = name.trim();

    // Must be at least 2 characters
    if (trimmed.length < 2) {
        return false;
    }

    // Must contain at least one space (first and last name)
    if (!trimmed.includes(' ')) {
        return false;
    }

    // Must only contain letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(trimmed)) {
        return false;
    }

    return true;
}

// ============================================================================
// Complete Form Validation
// ============================================================================

export interface PaymentFormData {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvc: string;
    cardholderName: string;
}

export interface PaymentFormErrors {
    cardNumber?: string;
    expiry?: string;
    cvc?: string;
    cardholderName?: string;
}

/**
 * Validates complete payment form
 * @param formData - The form data to validate
 * @returns Object with validation errors (empty if all valid)
 */
export function validatePaymentForm(
    formData: PaymentFormData
): PaymentFormErrors {
    const errors: PaymentFormErrors = {};

    // Validate card number
    const cleanedCard = formData.cardNumber.replace(/\s+/g, '');
    if (!cleanedCard) {
        errors.cardNumber = 'Card number is required';
    } else if (!isValidCardNumber(cleanedCard)) {
        errors.cardNumber = 'Invalid card number';
    }

    // Validate expiry
    if (!formData.expiryMonth || !formData.expiryYear) {
        errors.expiry = 'Expiry date is required';
    } else {
        const month = parseInt(formData.expiryMonth, 10);
        const year = parseInt(
            formData.expiryYear.length === 2
                ? '20' + formData.expiryYear
                : formData.expiryYear,
            10
        );
        if (!isValidExpiration(month, year)) {
            errors.expiry = 'Invalid or expired date';
        }
    }

    // Validate CVC
    const cardType = getCardType(formData.cardNumber);
    if (!formData.cvc) {
        errors.cvc = 'CVC is required';
    } else if (!isValidCVC(formData.cvc, cardType)) {
        errors.cvc = cardType === 'amex' ? 'CVC must be 4 digits' : 'CVC must be 3 digits';
    }

    // Validate cardholder name
    if (!formData.cardholderName.trim()) {
        errors.cardholderName = 'Cardholder name is required';
    } else if (!isValidCardholderName(formData.cardholderName)) {
        errors.cardholderName = 'Please enter full name (first and last)';
    }

    return errors;
}

// ============================================================================
// Test Card Numbers (for development/testing)
// ============================================================================

export const TEST_CARDS = {
    VISA_SUCCESS: '4242424242424242',
    VISA_DECLINE: '4000000000000002',
    VISA_INSUFFICIENT: '4000000000009995',
    MASTERCARD_SUCCESS: '5555555555554444',
    AMEX_SUCCESS: '378282246310005',
    DISCOVER_SUCCESS: '6011111111111117',
};
