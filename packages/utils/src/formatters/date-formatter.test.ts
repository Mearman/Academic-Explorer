import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatRelativeTime, formatAbsoluteTime, formatTimestamp } from './date-formatter.js';

describe('date-formatter', () => {
	const FIXED_NOW = new Date('2024-03-15T12:00:00Z').getTime();

	beforeEach(() => {
		// Mock Date.now() to return a fixed timestamp
		vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
	});

	describe('formatRelativeTime', () => {
		it('should format "just now" for very recent dates', () => {
			const date = new Date(FIXED_NOW - 5 * 1000); // 5 seconds ago
			expect(formatRelativeTime(date)).toBe('just now');
		});

		it('should format seconds correctly', () => {
			const date = new Date(FIXED_NOW - 30 * 1000); // 30 seconds ago
			expect(formatRelativeTime(date)).toBe('30 seconds ago');
		});

		it('should format minutes correctly', () => {
			const date = new Date(FIXED_NOW - 5 * 60 * 1000); // 5 minutes ago
			expect(formatRelativeTime(date)).toBe('5 minutes ago');
		});

		it('should format hours correctly', () => {
			const date = new Date(FIXED_NOW - 2 * 60 * 60 * 1000); // 2 hours ago
			expect(formatRelativeTime(date)).toBe('2 hours ago');
		});

		it('should format days correctly', () => {
			const date = new Date(FIXED_NOW - 3 * 24 * 60 * 60 * 1000); // 3 days ago
			expect(formatRelativeTime(date)).toBe('3 days ago');
		});

		it('should format weeks correctly', () => {
			const date = new Date(FIXED_NOW - 2 * 7 * 24 * 60 * 60 * 1000); // 2 weeks ago
			expect(formatRelativeTime(date)).toBe('2 weeks ago');
		});

		it('should format months correctly', () => {
			const date = new Date(FIXED_NOW - 2 * 30 * 24 * 60 * 60 * 1000); // ~2 months ago
			expect(formatRelativeTime(date)).toBe('2 months ago');
		});

		it('should format years correctly', () => {
			const date = new Date(FIXED_NOW - 2 * 365 * 24 * 60 * 60 * 1000); // ~2 years ago
			expect(formatRelativeTime(date)).toBe('2 years ago');
		});

		it('should handle singular units correctly', () => {
			expect(formatRelativeTime(new Date(FIXED_NOW - 1 * 1000))).toBe('just now');
			expect(formatRelativeTime(new Date(FIXED_NOW - 30 * 1000))).toBe('30 seconds ago');
			expect(formatRelativeTime(new Date(FIXED_NOW - 1 * 60 * 1000))).toBe('1 minute ago');
			expect(formatRelativeTime(new Date(FIXED_NOW - 1 * 60 * 60 * 1000))).toBe('1 hour ago');
			expect(formatRelativeTime(new Date(FIXED_NOW - 1 * 24 * 60 * 60 * 1000))).toBe('1 day ago');
		});

		it('should handle future dates', () => {
			const date = new Date(FIXED_NOW + 5 * 60 * 1000); // 5 minutes in future
			expect(formatRelativeTime(date)).toBe('in the future');
		});

		it('should handle invalid dates', () => {
			expect(formatRelativeTime(new Date('invalid'))).toBe('Invalid date');
			expect(formatRelativeTime(null as unknown as Date)).toBe('Invalid date');
			expect(formatRelativeTime(undefined as unknown as Date)).toBe('Invalid date');
		});
	});

	describe('formatAbsoluteTime', () => {
		it('should format dates with month, day, year, and time', () => {
			const date = new Date('2024-03-15T14:30:00Z');
			const result = formatAbsoluteTime(date);

			// Check format contains expected parts (exact format may vary by locale)
			expect(result).toMatch(/Mar/);
			expect(result).toMatch(/15/);
			expect(result).toMatch(/2024/);
			expect(result).toMatch(/at/);
		});

		it('should handle invalid dates', () => {
			expect(formatAbsoluteTime(new Date('invalid'))).toBe('Invalid date');
			expect(formatAbsoluteTime(null as unknown as Date)).toBe('Invalid date');
			expect(formatAbsoluteTime(undefined as unknown as Date)).toBe('Invalid date');
		});
	});

	describe('formatTimestamp', () => {
		it('should use relative time for recent dates (within default 7-day threshold)', () => {
			const date = new Date(FIXED_NOW - 2 * 24 * 60 * 60 * 1000); // 2 days ago
			expect(formatTimestamp(date)).toBe('2 days ago');
		});

		it('should use absolute time for old dates (beyond default 7-day threshold)', () => {
			const date = new Date(FIXED_NOW - 10 * 24 * 60 * 60 * 1000); // 10 days ago
			const result = formatTimestamp(date);

			// Should use absolute format
			expect(result).toMatch(/Mar/);
			expect(result).toMatch(/at/);
		});

		it('should respect custom threshold', () => {
			const date = new Date(FIXED_NOW - 10 * 24 * 60 * 60 * 1000); // 10 days ago
			const threshold = 14 * 24 * 60 * 60 * 1000; // 14 days threshold

			// Should use relative time with custom threshold
			expect(formatTimestamp(date, threshold)).toBe('1 week ago');
		});

		it('should use absolute time for future dates', () => {
			const date = new Date(FIXED_NOW + 5 * 24 * 60 * 60 * 1000); // 5 days in future
			const result = formatTimestamp(date);

			// Should use absolute format
			expect(result).toMatch(/Mar/);
			expect(result).toMatch(/at/);
		});

		it('should handle invalid dates', () => {
			expect(formatTimestamp(new Date('invalid'))).toBe('Invalid date');
			expect(formatTimestamp(null as unknown as Date)).toBe('Invalid date');
		});
	});
});
