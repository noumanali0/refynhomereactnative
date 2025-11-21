// src/utils/dateFormatters.ts
/**
 * Date Formatting Utilities
 *
 * Centralized date formatting functions for consistent date/time display
 * across the application. Supports relative and absolute formats.
 */

// ============================================================================
// Relative Date Formatting
// ============================================================================

/**
 * Format date to relative time (e.g., "2 days ago", "Today")
 * @param dateString - ISO date string or Date object
 * @returns Formatted relative date string
 */
export function formatRelativeDate(dateString: string | Date): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInWeeks < 4) return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
    if (diffInMonths < 12) return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
    return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

// ============================================================================
// Absolute Date Formatting
// ============================================================================

/**
 * Format date to full date string (e.g., "January 15, 2024")
 * @param dateString - ISO date string or Date object
 * @returns Formatted full date string
 */
export function formatFullDate(dateString: string | Date): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format date to short date string (e.g., "Jan 15, 2024")
 * @param dateString - ISO date string or Date object
 * @returns Formatted short date string
 */
export function formatShortDate(dateString: string | Date): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format date to numeric date string (e.g., "01/15/2024")
 * @param dateString - ISO date string or Date object
 * @returns Formatted numeric date string
 */
export function formatNumericDate(dateString: string | Date): string {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

// ============================================================================
// Time Formatting
// ============================================================================

/**
 * Format time only (e.g., "2:30 PM")
 * @param dateString - ISO date string or Date object
 * @returns Formatted time string
 */
export function formatTimeOnly(dateString: string | Date): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    };
    return date.toLocaleTimeString('en-US', options);
}

/**
 * Format time in 24-hour format (e.g., "14:30")
 * @param dateString - ISO date string or Date object
 * @returns Formatted 24-hour time string
 */
export function format24HourTime(dateString: string | Date): string {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// ============================================================================
// Combined Date & Time Formatting
// ============================================================================

/**
 * Format date and time (e.g., "Jan 15, 2024 at 2:30 PM")
 * @param dateString - ISO date string or Date object
 * @returns Formatted date and time string
 */
export function formatDateTime(dateString: string | Date): string {
    const shortDate = formatShortDate(dateString);
    const time = formatTimeOnly(dateString);
    return `${shortDate} at ${time}`;
}

/**
 * Format date and time for short display (e.g., "Jan 15 • 2:30 PM")
 * @param dateString - ISO date string or Date object
 * @returns Formatted compact date and time string
 */
export function formatCompactDateTime(dateString: string | Date): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
    };
    const dateStr = date.toLocaleDateString('en-US', options);
    const time = formatTimeOnly(dateString);
    return `${dateStr} • ${time}`;
}

// ============================================================================
// Date Range Formatting
// ============================================================================

/**
 * Format date range (e.g., "Jan 1 - Jan 31, 2024")
 * @param startDate - Start date (ISO string or Date)
 * @param endDate - End date (ISO string or Date)
 * @returns Formatted date range string
 */
export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const endDay = end.getDate();
    const year = end.getFullYear();

    // Same month
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }

    // Different months, same year
    if (start.getFullYear() === end.getFullYear()) {
        return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }

    // Different years
    return `${startMonth} ${startDay}, ${start.getFullYear()} - ${endMonth} ${endDay}, ${year}`;
}

// ============================================================================
// Smart Date Formatting (Adaptive)
// ============================================================================

/**
 * Format date smartly based on how recent it is
 * - Within 24 hours: relative time ("2 hours ago")
 * - Within week: day name ("Monday at 2:30 PM")
 * - Within year: short date ("Jan 15 at 2:30 PM")
 * - Older: full date ("Jan 15, 2023 at 2:30 PM")
 *
 * @param dateString - ISO date string or Date object
 * @returns Smartly formatted date string
 */
export function formatSmartDate(dateString: string | Date): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    // Within 24 hours - use relative time
    if (diffInHours < 24) {
        return formatRelativeDate(dateString);
    }

    // Within 7 days - use day name
    if (diffInDays < 7) {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const time = formatTimeOnly(dateString);
        return `${dayName} at ${time}`;
    }

    // Within same year - use short date without year
    if (date.getFullYear() === now.getFullYear()) {
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        const time = formatTimeOnly(dateString);
        return `${month} ${day} at ${time}`;
    }

    // Older - use full date with year
    return formatDateTime(dateString);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if date is today
 * @param dateString - ISO date string or Date object
 * @returns true if date is today
 */
export function isToday(dateString: string | Date): boolean {
    const date = new Date(dateString);
    const now = new Date();
    return (
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    );
}

/**
 * Check if date is yesterday
 * @param dateString - ISO date string or Date object
 * @returns true if date is yesterday
 */
export function isYesterday(dateString: string | Date): boolean {
    const date = new Date(dateString);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()
    );
}

/**
 * Get month name from date
 * @param dateString - ISO date string or Date object
 * @param short - If true, returns short month name (e.g., "Jan" instead of "January")
 * @returns Month name
 */
export function getMonthName(dateString: string | Date, short: boolean = false): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
        month: short ? 'short' : 'long',
    };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format duration in human-readable format
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted duration (e.g., "2h 30m", "45m", "30s")
 */
export function formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
        return `${minutes}m`;
    }
    return `${seconds}s`;
}
