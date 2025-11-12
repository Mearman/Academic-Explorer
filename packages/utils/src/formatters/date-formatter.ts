/**
 * Date formatting utilities for bookmark timestamps
 * Provides both relative ("2 hours ago") and absolute ("Mar 15, 2024 at 2:30 PM") formats
 */

/**
 * Time units in milliseconds
 */
const TIME_UNITS = {
	SECOND: 1000,
	MINUTE: 60 * 1000,
	HOUR: 60 * 60 * 1000,
	DAY: 24 * 60 * 60 * 1000,
	WEEK: 7 * 24 * 60 * 60 * 1000,
	MONTH: 30 * 24 * 60 * 60 * 1000,
	YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Default threshold for switching from relative to absolute time (7 days)
 */
const DEFAULT_THRESHOLD_MS = 7 * TIME_UNITS.DAY;

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 *
 * @param date - The date to format
 * @returns Formatted relative time string
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000)) // "2 hours ago"
 * formatRelativeTime(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) // "3 days ago"
 */
export function formatRelativeTime(date: Date): string {
	// Handle invalid dates
	if (!date || isNaN(date.getTime())) {
		return 'Invalid date';
	}

	const now = Date.now();
	const timestamp = date.getTime();
	const diffMs = now - timestamp;

	// Handle future dates
	if (diffMs < 0) {
		return 'in the future';
	}

	// Just now (< 10 seconds)
	if (diffMs < 10 * TIME_UNITS.SECOND) {
		return 'just now';
	}

	// Seconds (< 1 minute)
	if (diffMs < TIME_UNITS.MINUTE) {
		const seconds = Math.floor(diffMs / TIME_UNITS.SECOND);
		return `${seconds} ${seconds === 1 ? 'second' : 'seconds'} ago`;
	}

	// Minutes (< 1 hour)
	if (diffMs < TIME_UNITS.HOUR) {
		const minutes = Math.floor(diffMs / TIME_UNITS.MINUTE);
		return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
	}

	// Hours (< 1 day)
	if (diffMs < TIME_UNITS.DAY) {
		const hours = Math.floor(diffMs / TIME_UNITS.HOUR);
		return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
	}

	// Days (< 1 week)
	if (diffMs < TIME_UNITS.WEEK) {
		const days = Math.floor(diffMs / TIME_UNITS.DAY);
		return `${days} ${days === 1 ? 'day' : 'days'} ago`;
	}

	// Weeks (< 1 month)
	if (diffMs < TIME_UNITS.MONTH) {
		const weeks = Math.floor(diffMs / TIME_UNITS.WEEK);
		return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
	}

	// Months (< 1 year)
	if (diffMs < TIME_UNITS.YEAR) {
		const months = Math.floor(diffMs / TIME_UNITS.MONTH);
		return `${months} ${months === 1 ? 'month' : 'months'} ago`;
	}

	// Years
	const years = Math.floor(diffMs / TIME_UNITS.YEAR);
	return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

/**
 * Format a date as absolute time (e.g., "Mar 15, 2024 at 2:30 PM")
 *
 * @param date - The date to format
 * @returns Formatted absolute time string
 *
 * @example
 * formatAbsoluteTime(new Date('2024-03-15T14:30:00')) // "Mar 15, 2024 at 2:30 PM"
 */
export function formatAbsoluteTime(date: Date): string {
	// Handle invalid dates
	if (!date || isNaN(date.getTime())) {
		return 'Invalid date';
	}

	try {
		// Format date part (e.g., "Mar 15, 2024")
		const dateFormatter = new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});

		// Format time part (e.g., "2:30 PM")
		const timeFormatter = new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});

		return `${dateFormatter.format(date)} at ${timeFormatter.format(date)}`;
	} catch (error) {
		// Fallback to ISO string if Intl fails
		return date.toISOString();
	}
}

/**
 * Format a date with smart choice between relative and absolute formats
 * Recent dates (within threshold) use relative time, older dates use absolute time
 *
 * @param date - The date to format
 * @param threshold - Threshold in milliseconds for switching from relative to absolute (default: 7 days)
 * @returns Formatted timestamp string
 *
 * @example
 * formatTimestamp(new Date(Date.now() - 2 * 60 * 60 * 1000)) // "2 hours ago"
 * formatTimestamp(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)) // "Mar 5, 2024 at 2:30 PM"
 * formatTimestamp(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), 14 * 24 * 60 * 60 * 1000) // "10 days ago"
 */
export function formatTimestamp(date: Date, threshold = DEFAULT_THRESHOLD_MS): string {
	// Handle invalid dates
	if (!date || isNaN(date.getTime())) {
		return 'Invalid date';
	}

	const now = Date.now();
	const timestamp = date.getTime();
	const diffMs = now - timestamp;

	// Use relative time for recent dates
	if (diffMs >= 0 && diffMs < threshold) {
		return formatRelativeTime(date);
	}

	// Use absolute time for older dates or future dates
	return formatAbsoluteTime(date);
}
