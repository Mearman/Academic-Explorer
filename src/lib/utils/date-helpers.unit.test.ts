/**
 * Unit tests for date-helpers utilities
 * Tests date formatting, year validation, date ranges, and relative dates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	formatPublicationDate,
	formatPublicationYear,
	getYearDateRange,
	isDateInRange,
	getRelativePublicationDate,
} from "./date-helpers";

describe("date-helpers", () => {
	// Mock current date for consistent testing
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("formatPublicationDate", () => {
		it("should format valid ISO date strings", () => {
			expect(formatPublicationDate("2023-05-15T10:30:00Z")).toBe("2023-05-15");
			expect(formatPublicationDate("2020-12-25")).toBe("2020-12-25");
			expect(formatPublicationDate("2019-01-01T00:00:00.000Z")).toBe("2019-01-01");
		});

		it("should handle null and undefined values", () => {
			expect(formatPublicationDate(null)).toBe("Unknown");
			expect(formatPublicationDate(undefined)).toBe("Unknown");
		});

		it("should handle empty and invalid date strings", () => {
			expect(formatPublicationDate("")).toBe("Unknown");
			expect(formatPublicationDate("invalid-date")).toBe("Invalid date");
			expect(formatPublicationDate("not-a-date")).toBe("Invalid date");
			expect(formatPublicationDate("2023-13-45")).toBe("Invalid date");
		});

		it("should handle malformed ISO strings", () => {
			expect(formatPublicationDate("2023/05/15")).toBe("Invalid date");
			expect(formatPublicationDate("May 15, 2023")).toBe("Invalid date");
			expect(formatPublicationDate("15-05-2023")).toBe("Invalid date");
		});
	});

	describe("formatPublicationYear", () => {
		it("should format valid years", () => {
			expect(formatPublicationYear(2023)).toBe("2023");
			expect(formatPublicationYear(2000)).toBe("2000");
			expect(formatPublicationYear(1985)).toBe("1985");
			expect(formatPublicationYear(2024)).toBe("2024");
		});

		it("should handle null and undefined values", () => {
			expect(formatPublicationYear(null)).toBe("Unknown");
			expect(formatPublicationYear(undefined)).toBe("Unknown");
		});

		it("should reject years before 1000", () => {
			expect(formatPublicationYear(999)).toBe("Unknown");
			expect(formatPublicationYear(500)).toBe("Unknown");
			expect(formatPublicationYear(0)).toBe("Unknown");
			expect(formatPublicationYear(-1)).toBe("Unknown");
		});

		it("should reject future years beyond reasonable limit", () => {
			const currentYear = new Date().getFullYear();
			expect(formatPublicationYear(currentYear + 11)).toBe("Unknown");
			expect(formatPublicationYear(currentYear + 20)).toBe("Unknown");
			expect(formatPublicationYear(3000)).toBe("Unknown");
		});

		it("should accept near-future years within limit", () => {
			const currentYear = new Date().getFullYear();
			expect(formatPublicationYear(currentYear + 1)).toBe((currentYear + 1).toString());
			expect(formatPublicationYear(currentYear + 5)).toBe((currentYear + 5).toString());
			expect(formatPublicationYear(currentYear + 10)).toBe((currentYear + 10).toString());
		});

		it("should handle edge case years", () => {
			expect(formatPublicationYear(1000)).toBe("1000");
			expect(formatPublicationYear(1001)).toBe("1001");
		});
	});

	describe("getYearDateRange", () => {
		it("should return correct date range for a year", () => {
			const { start, end } = getYearDateRange(2023);

			expect(start).toEqual(new Date(2023, 0, 1, 0, 0, 0, 0));
			expect(end).toEqual(new Date(2023, 11, 31, 23, 59, 59, 999));
		});

		it("should handle different years", () => {
			const range2020 = getYearDateRange(2020);
			expect(range2020.start.getFullYear()).toBe(2020);
			expect(range2020.start.getMonth()).toBe(0); // January
			expect(range2020.start.getDate()).toBe(1);
			expect(range2020.end.getFullYear()).toBe(2020);
			expect(range2020.end.getMonth()).toBe(11); // December
			expect(range2020.end.getDate()).toBe(31);

			const range2021 = getYearDateRange(2021);
			expect(range2021.start.getFullYear()).toBe(2021);
			expect(range2021.end.getFullYear()).toBe(2021);
		});

		it("should handle leap years correctly", () => {
			const { start, end } = getYearDateRange(2020); // 2020 is a leap year

			expect(start).toEqual(new Date(2020, 0, 1, 0, 0, 0, 0));
			expect(end).toEqual(new Date(2020, 11, 31, 23, 59, 59, 999));
			expect(end.getFullYear()).toBe(2020);
		});

		it("should work with historical years", () => {
			const { start, end } = getYearDateRange(1995);

			expect(start.getFullYear()).toBe(1995);
			expect(end.getFullYear()).toBe(1995);
			expect(start < end).toBe(true);
		});
	});

	describe("isDateInRange", () => {
		it("should return true for dates within range", () => {
			const startDate = new Date("2023-01-01");
			const endDate = new Date("2023-12-31");

			expect(isDateInRange("2023-06-15", startDate, endDate)).toBe(true);
			expect(isDateInRange("2023-01-01", startDate, endDate)).toBe(true);
			expect(isDateInRange("2023-12-31", startDate, endDate)).toBe(true);
		});

		it("should return false for dates outside range", () => {
			const startDate = new Date("2023-01-01");
			const endDate = new Date("2023-12-31");

			expect(isDateInRange("2022-12-31", startDate, endDate)).toBe(false);
			expect(isDateInRange("2024-01-01", startDate, endDate)).toBe(false);
			expect(isDateInRange("2020-05-15", startDate, endDate)).toBe(false);
		});

		it("should handle null and undefined date strings", () => {
			const startDate = new Date("2023-01-01");
			const endDate = new Date("2023-12-31");

			expect(isDateInRange(null, startDate, endDate)).toBe(false);
			expect(isDateInRange(undefined, startDate, endDate)).toBe(false);
			expect(isDateInRange("", startDate, endDate)).toBe(false);
		});

		it("should handle null start and end dates", () => {
			expect(isDateInRange("2023-06-15", null, null)).toBe(true);
			expect(isDateInRange("2023-06-15", new Date("2023-01-01"), null)).toBe(true);
			expect(isDateInRange("2023-06-15", null, new Date("2023-12-31"))).toBe(true);
		});

		it("should handle invalid date strings", () => {
			const startDate = new Date("2023-01-01");
			const endDate = new Date("2023-12-31");

			expect(isDateInRange("invalid-date", startDate, endDate)).toBe(false);
			expect(isDateInRange("not-a-date", startDate, endDate)).toBe(false);
			expect(isDateInRange("2023-13-45", startDate, endDate)).toBe(false);
		});

		it("should handle edge cases with time components", () => {
			const startDate = new Date("2023-06-15T00:00:00Z");
			const endDate = new Date("2023-06-15T23:59:59Z");

			expect(isDateInRange("2023-06-15T12:00:00Z", startDate, endDate)).toBe(true);
			expect(isDateInRange("2023-06-15T00:00:00Z", startDate, endDate)).toBe(true);
			expect(isDateInRange("2023-06-14T23:59:59Z", startDate, endDate)).toBe(false);
		});

		it("should handle exceptions in date parsing", () => {
			const startDate = new Date("2023-01-01");
			const endDate = new Date("2023-12-31");

			// Test malformed dates that might throw exceptions
			expect(isDateInRange("2023/06/15", startDate, endDate)).toBe(false);
			expect(isDateInRange("June 15, 2023", startDate, endDate)).toBe(false);
		});
	});

	describe("getRelativePublicationDate", () => {
		it("should return correct relative dates for recent years", () => {
			// Current year is mocked as 2024
			expect(getRelativePublicationDate("2024-06-15")).toBe("This year");
			expect(getRelativePublicationDate("2024-01-01")).toBe("This year");
			expect(getRelativePublicationDate("2024-12-31")).toBe("This year");
		});

		it("should return correct relative dates for past years", () => {
			expect(getRelativePublicationDate("2023-06-15")).toBe("1 year ago");
			expect(getRelativePublicationDate("2022-06-15")).toBe("2 years ago");
			expect(getRelativePublicationDate("2020-06-15")).toBe("4 years ago");
			expect(getRelativePublicationDate("2010-06-15")).toBe("14 years ago");
		});

		it("should handle null and undefined values", () => {
			expect(getRelativePublicationDate(null)).toBe("Unknown date");
			expect(getRelativePublicationDate(undefined)).toBe("Unknown date");
		});

		it("should handle invalid date strings", () => {
			expect(getRelativePublicationDate("")).toBe("Unknown date");
			expect(getRelativePublicationDate("invalid-date")).toBe("Invalid date");
			expect(getRelativePublicationDate("not-a-date")).toBe("Invalid date");
			expect(getRelativePublicationDate("2023-13-45")).toBe("Invalid date");
		});

		it("should handle future dates correctly", () => {
			// Future dates should return negative years ago (or be handled as current implementation does)
			expect(getRelativePublicationDate("2025-06-15")).toBe("-1 years ago");
			expect(getRelativePublicationDate("2026-06-15")).toBe("-2 years ago");
		});

		it("should handle edge cases with different months", () => {
			// Year difference is based on year only, not month/day
			expect(getRelativePublicationDate("2023-01-01")).toBe("1 year ago");
			expect(getRelativePublicationDate("2023-12-31")).toBe("1 year ago");
		});

		it("should handle malformed ISO strings", () => {
			expect(getRelativePublicationDate("2023/06/15")).toBe("Invalid date");
			expect(getRelativePublicationDate("June 15, 2023")).toBe("Invalid date");
			expect(getRelativePublicationDate("15-06-2023")).toBe("Invalid date");
		});

		it("should handle exceptions in date parsing", () => {
			expect(getRelativePublicationDate("invalid")).toBe("Invalid date");
			expect(getRelativePublicationDate("{}")).toBe("Invalid date");
		});
	});
});