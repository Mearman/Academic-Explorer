import { format, parseISO, isValid, startOfYear, endOfYear, isAfter, isBefore } from "date-fns";

/**
 * Format a date string for display in academic contexts
 */
export function formatPublicationDate(dateString: string | null | undefined): string {
	if (!dateString) return "Unknown";

	try {
		const date = parseISO(dateString);
		if (!isValid(date)) return "Invalid date";

		return format(date, "yyyy-MM-dd");
	} catch {
		return "Invalid date";
	}
}

/**
 * Format a year for display
 */
export function formatPublicationYear(year: number | null | undefined): string {
	if (!year || year < 1000 || year > new Date().getFullYear() + 10) {
		return "Unknown";
	}

	return year.toString();
}

/**
 * Get the date range for filtering publications by year
 */
export function getYearDateRange(year: number): { start: Date; end: Date } {
	const startDate = startOfYear(new Date(year, 0, 1));
	const endDate = endOfYear(new Date(year, 0, 1));

	return { start: startDate, end: endDate };
}

/**
 * Check if a publication date falls within a date range
 */
export function isDateInRange(
	dateString: string | null | undefined,
	startDate: Date | null,
	endDate: Date | null
): boolean {
	if (!dateString) return false;

	try {
		const publicationDate = parseISO(dateString);
		if (!isValid(publicationDate)) return false;

		if (startDate && isBefore(publicationDate, startDate)) return false;
		if (endDate && isAfter(publicationDate, endDate)) return false;

		return true;
	} catch {
		return false;
	}
}

/**
 * Get a human-readable relative date (e.g., "2 years ago")
 */
export function getRelativePublicationDate(dateString: string | null | undefined): string {
	if (!dateString) return "Unknown date";

	try {
		const date = parseISO(dateString);
		if (!isValid(date)) return "Invalid date";

		const now = new Date();
		const yearsDiff = now.getFullYear() - date.getFullYear();

		if (yearsDiff === 0) return "This year";
		if (yearsDiff === 1) return "1 year ago";
		return `${yearsDiff.toString()} years ago`;
	} catch {
		return "Invalid date";
	}
}