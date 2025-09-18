import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	debouncedSearch,
	removeDuplicatesBy,
	sortByPublicationYear,
	sortByCitationCount,
	groupByPublicationYear,
	groupByFirstAuthor,
	extractSafeProperties,
	sanitizeApiResponse,
	isValidSearchQuery,
	normalizeSearchQuery,
	hasValidData,
	getDisplayName,
	formatLargeNumber,
} from "./data-helpers";

describe("data-helpers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("debouncedSearch", () => {
		it("should debounce search function calls", () => {
			const searchFn = vi.fn();

			// Call multiple times rapidly
			debouncedSearch(searchFn, "query1");
			debouncedSearch(searchFn, "query2");
			debouncedSearch(searchFn, "query3");

			// Should not have been called yet
			expect(searchFn).not.toHaveBeenCalled();

			// Fast-forward time past the debounce delay (300ms)
			vi.advanceTimersByTime(300);

			// Should have been called once with the last query
			expect(searchFn).toHaveBeenCalledTimes(1);
			expect(searchFn).toHaveBeenCalledWith("query3");
		});

		it("should reset debounce timer with new calls", () => {
			const searchFn = vi.fn();

			debouncedSearch(searchFn, "query1");

			// Advance time but not past the full debounce delay
			vi.advanceTimersByTime(150);

			// Call again, which should reset the timer
			debouncedSearch(searchFn, "query2");

			// Advance another 150ms (total 300ms from first call, but only 150ms from second)
			vi.advanceTimersByTime(150);

			// Should not have been called yet
			expect(searchFn).not.toHaveBeenCalled();

			// Advance another 150ms to complete the debounce from second call
			vi.advanceTimersByTime(150);

			// Should now be called with the second query
			expect(searchFn).toHaveBeenCalledTimes(1);
			expect(searchFn).toHaveBeenCalledWith("query2");
		});
	});

	describe("removeDuplicatesBy", () => {
		it("should remove duplicates by specified key", () => {
			const items = [
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" },
				{ id: 1, name: "Alice Duplicate" },
				{ id: 3, name: "Charlie" },
			];

			const result = removeDuplicatesBy(items, "id");

			expect(result).toHaveLength(3);
			expect(result).toEqual([
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" },
				{ id: 3, name: "Charlie" },
			]);
		});

		it("should handle empty array", () => {
			const result = removeDuplicatesBy([], "id");
			expect(result).toEqual([]);
		});

		it("should work with string keys", () => {
			const items = [
				{ name: "Alice", age: 25 },
				{ name: "Bob", age: 30 },
				{ name: "Alice", age: 26 },
			];

			const result = removeDuplicatesBy(items, "name");

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe("Alice");
			expect(result[1].name).toBe("Bob");
		});
	});

	describe("sortByPublicationYear", () => {
		const works = [
			{ publication_year: 2020, title: "Work 2020" },
			{ publication_year: 2018, title: "Work 2018" },
			{ publication_year: 2022, title: "Work 2022" },
			{ publication_year: null, title: "Work null" },
			{ title: "Work undefined" }, // publication_year is undefined
		];

		it("should sort by publication year descending by default", () => {
			const result = sortByPublicationYear(works);

			expect(result[0].publication_year).toBe(2022);
			expect(result[1].publication_year).toBe(2020);
			expect(result[2].publication_year).toBe(2018);
			// null and undefined should be sorted as 0 and appear at the end
			// Order between null and undefined depends on lodash sorting behavior
			expect([null, undefined]).toContain(result[3].publication_year);
			expect([null, undefined]).toContain(result[4].publication_year);
		});

		it("should sort by publication year ascending when specified", () => {
			const result = sortByPublicationYear(works, true);

			// null and undefined (treated as 0) should appear first
			expect(result[0].publication_year).toBeNull();
			expect(result[1].publication_year).toBeUndefined();
			expect(result[2].publication_year).toBe(2018);
			expect(result[3].publication_year).toBe(2020);
			expect(result[4].publication_year).toBe(2022);
		});

		it("should handle empty array", () => {
			const result = sortByPublicationYear([]);
			expect(result).toEqual([]);
		});
	});

	describe("sortByCitationCount", () => {
		const works = [
			{ cited_by_count: 150, title: "Work 150" },
			{ cited_by_count: 45, title: "Work 45" },
			{ cited_by_count: 300, title: "Work 300" },
			{ cited_by_count: null, title: "Work null" },
			{ title: "Work undefined" }, // cited_by_count is undefined
		];

		it("should sort by citation count descending by default", () => {
			const result = sortByCitationCount(works);

			expect(result[0].cited_by_count).toBe(300);
			expect(result[1].cited_by_count).toBe(150);
			expect(result[2].cited_by_count).toBe(45);
			// null and undefined should be treated as 0 and appear at the end
			// Order between null and undefined depends on lodash sorting behavior
			expect([null, undefined]).toContain(result[3].cited_by_count);
			expect([null, undefined]).toContain(result[4].cited_by_count);
		});

		it("should sort by citation count ascending when specified", () => {
			const result = sortByCitationCount(works, true);

			// null and undefined (treated as 0) should appear first
			expect(result[0].cited_by_count).toBeNull();
			expect(result[1].cited_by_count).toBeUndefined();
			expect(result[2].cited_by_count).toBe(45);
			expect(result[3].cited_by_count).toBe(150);
			expect(result[4].cited_by_count).toBe(300);
		});

		it("should handle empty array", () => {
			const result = sortByCitationCount([]);
			expect(result).toEqual([]);
		});
	});

	describe("groupByPublicationYear", () => {
		it("should group works by publication year", () => {
			const works = [
				{ publication_year: 2020, title: "Work A" },
				{ publication_year: 2020, title: "Work B" },
				{ publication_year: 2021, title: "Work C" },
				{ publication_year: null, title: "Work D" },
				{ title: "Work E" }, // publication_year is undefined
			];

			const result = groupByPublicationYear(works);

			expect(result["2020"]).toHaveLength(2);
			expect(result["2021"]).toHaveLength(1);
			expect(result["Unknown"]).toHaveLength(2); // null and undefined
			expect(result["Unknown"][0].title).toBe("Work D");
			expect(result["Unknown"][1].title).toBe("Work E");
		});

		it("should handle empty array", () => {
			const result = groupByPublicationYear([]);
			expect(result).toEqual({});
		});

		it("should handle all works with unknown years", () => {
			const works = [
				{ publication_year: null, title: "Work A" },
				{ title: "Work B" },
			];

			const result = groupByPublicationYear(works);

			expect(result["Unknown"]).toHaveLength(2);
			expect(Object.keys(result)).toEqual(["Unknown"]);
		});
	});

	describe("groupByFirstAuthor", () => {
		it("should group works by first author", () => {
			const works = [
				{
					authorships: [
						{ author: { display_name: "Alice Smith" } },
						{ author: { display_name: "Bob Johnson" } },
					],
					title: "Work A",
				},
				{
					authorships: [
						{ author: { display_name: "Charlie Brown" } },
					],
					title: "Work B",
				},
				{
					authorships: [
						{ author: { display_name: "Alice Smith" } },
					],
					title: "Work C",
				},
				{
					authorships: [],
					title: "Work D", // No authors
				},
				{
					title: "Work E", // No authorships property
				},
			];

			const result = groupByFirstAuthor(works);

			expect(result["Alice Smith"]).toHaveLength(2);
			expect(result["Charlie Brown"]).toHaveLength(1);
			expect(result["Unknown Author"]).toHaveLength(2); // Works D and E
		});

		it("should handle works with null author display names", () => {
			const works = [
				{
					authorships: [
						{ author: { display_name: null } },
					],
					title: "Work A",
				},
				{
					authorships: [
						{ author: {} }, // No display_name property
					],
					title: "Work B",
				},
			];

			const result = groupByFirstAuthor(works);

			expect(result["Unknown Author"]).toHaveLength(2);
		});

		it("should handle empty array", () => {
			const result = groupByFirstAuthor([]);
			expect(result).toEqual({});
		});
	});

	describe("extractSafeProperties", () => {
		it("should extract specified properties from object", () => {
			const obj = {
				id: 1,
				name: "Test",
				age: 25,
				email: "test@example.com",
				password: "secret",
			};

			const result = extractSafeProperties(obj, ["id", "name", "email"]);

			expect(result).toEqual({
				id: 1,
				name: "Test",
				email: "test@example.com",
			});
			expect(result).not.toHaveProperty("age");
			expect(result).not.toHaveProperty("password");
		});

		it("should handle empty keys array", () => {
			const obj = { id: 1, name: "Test" };
			const result = extractSafeProperties(obj, []);
			expect(result).toEqual({});
		});

		it("should handle non-existent keys gracefully", () => {
			const obj = { id: 1, name: "Test" };
			const result = extractSafeProperties(obj, ["id", "nonExistent" as keyof typeof obj]);
			expect(result).toEqual({ id: 1 });
		});
	});

	describe("sanitizeApiResponse", () => {
		it("should remove specified keys from object", () => {
			const obj = {
				id: 1,
				name: "Test",
				password: "secret",
				apiKey: "key123",
				publicData: "visible",
			};

			const result = sanitizeApiResponse(obj, ["password", "apiKey"]);

			expect(result).toEqual({
				id: 1,
				name: "Test",
				publicData: "visible",
			});
			expect(result).not.toHaveProperty("password");
			expect(result).not.toHaveProperty("apiKey");
		});

		it("should handle empty omit keys array", () => {
			const obj = { id: 1, name: "Test" };
			const result = sanitizeApiResponse(obj, []);
			expect(result).toEqual(obj);
		});

		it("should handle non-existent keys gracefully", () => {
			const obj = { id: 1, name: "Test" };
			const result = sanitizeApiResponse(obj, ["nonExistent" as keyof typeof obj]);
			expect(result).toEqual(obj);
		});
	});

	describe("isValidSearchQuery", () => {
		it("should return true for valid non-empty strings", () => {
			expect(isValidSearchQuery("valid query")).toBe(true);
			expect(isValidSearchQuery("a")).toBe(true);
			expect(isValidSearchQuery("123")).toBe(true);
		});

		it("should return false for empty or whitespace-only strings", () => {
			expect(isValidSearchQuery("")).toBe(false);
			expect(isValidSearchQuery("   ")).toBe(false);
			expect(isValidSearchQuery("\t\n")).toBe(false);
		});

		it("should return false for non-string values", () => {
			expect(isValidSearchQuery(null)).toBe(false);
			expect(isValidSearchQuery(undefined)).toBe(false);
			expect(isValidSearchQuery(123)).toBe(false);
			expect(isValidSearchQuery([])).toBe(false);
			expect(isValidSearchQuery({})).toBe(false);
			expect(isValidSearchQuery(true)).toBe(false);
		});
	});

	describe("normalizeSearchQuery", () => {
		it("should trim and lowercase search queries", () => {
			expect(normalizeSearchQuery("  MACHINE LEARNING  ")).toBe("machine learning");
			expect(normalizeSearchQuery("Neural Networks")).toBe("neural networks");
			expect(normalizeSearchQuery("AI")).toBe("ai");
		});

		it("should handle already normalized queries", () => {
			expect(normalizeSearchQuery("machine learning")).toBe("machine learning");
			expect(normalizeSearchQuery("ai")).toBe("ai");
		});

		it("should handle empty string", () => {
			expect(normalizeSearchQuery("")).toBe("");
		});

		it("should handle whitespace-only strings", () => {
			expect(normalizeSearchQuery("   ")).toBe("");
		});
	});

	describe("hasValidData", () => {
		it("should return true for non-empty arrays", () => {
			expect(hasValidData([1, 2, 3])).toBe(true);
			expect(hasValidData(["a", "b"])).toBe(true);
			expect(hasValidData([{}])).toBe(true);
		});

		it("should return false for empty arrays", () => {
			expect(hasValidData([])).toBe(false);
		});

		it("should return false for non-arrays", () => {
			expect(hasValidData(null)).toBe(false);
			expect(hasValidData(undefined)).toBe(false);
			expect(hasValidData("")).toBe(false);
			expect(hasValidData("not array")).toBe(false);
			expect(hasValidData(123)).toBe(false);
			expect(hasValidData({})).toBe(false);
		});
	});

	describe("getDisplayName", () => {
		it("should return display_name when available", () => {
			const item = {
				display_name: "Display Name",
				title: "Title",
				name: "Name",
			};
			expect(getDisplayName(item)).toBe("Display Name");
		});

		it("should fallback to title when display_name is null/undefined", () => {
			expect(getDisplayName({ display_name: null, title: "Title", name: "Name" })).toBe("Title");
			expect(getDisplayName({ title: "Title", name: "Name" })).toBe("Title");
		});

		it("should fallback to name when display_name and title are null/undefined", () => {
			expect(getDisplayName({ display_name: null, title: null, name: "Name" })).toBe("Name");
			expect(getDisplayName({ name: "Name" })).toBe("Name");
		});

		it('should return "Untitled" when all properties are null/undefined', () => {
			expect(getDisplayName({ display_name: null, title: null, name: null })).toBe("Untitled");
			expect(getDisplayName({})).toBe("Untitled");
		});

		it("should handle empty string properties", () => {
			expect(getDisplayName({ display_name: "", title: "Title" })).toBe("Title");
			expect(getDisplayName({ display_name: "", title: "", name: "Name" })).toBe("Name");
			expect(getDisplayName({ display_name: "", title: "", name: "" })).toBe("Untitled");
		});
	});

	describe("formatLargeNumber", () => {
		it("should format numbers in millions", () => {
			expect(formatLargeNumber(1000000)).toBe("1.0M");
			expect(formatLargeNumber(1500000)).toBe("1.5M");
			expect(formatLargeNumber(2234567)).toBe("2.2M");
			expect(formatLargeNumber(10000000)).toBe("10.0M");
		});

		it("should format numbers in thousands", () => {
			expect(formatLargeNumber(1000)).toBe("1.0K");
			expect(formatLargeNumber(1500)).toBe("1.5K");
			expect(formatLargeNumber(12345)).toBe("12.3K");
			expect(formatLargeNumber(999999)).toBe("1000.0K");
		});

		it("should return numbers under 1000 as strings", () => {
			expect(formatLargeNumber(999)).toBe("999");
			expect(formatLargeNumber(100)).toBe("100");
			expect(formatLargeNumber(1)).toBe("1");
		});

		it("should handle zero", () => {
			expect(formatLargeNumber(0)).toBe("0");
		});

		it("should handle null and undefined", () => {
			expect(formatLargeNumber(null)).toBe("0");
			expect(formatLargeNumber(undefined)).toBe("0");
		});

		it("should handle decimal numbers", () => {
			expect(formatLargeNumber(1500.7)).toBe("1.5K");
			expect(formatLargeNumber(1500000.9)).toBe("1.5M");
			expect(formatLargeNumber(999.9)).toBe("999.9"); // Numbers under 1000 keep decimal places
		});
	});
});