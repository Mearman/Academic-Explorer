import { describe, it, expect } from "vitest"

import { generateSequentialId, createFilterManager, computePagedItems } from "./index.js"

describe("State Utilities", () => {
	describe("generateSequentialId", () => {
		it("should generate sequential IDs with prefix", () => {
			const generator = generateSequentialId("test")
			expect(generator()).toBe("test-1")
			expect(generator()).toBe("test-2")
			expect(generator()).toBe("test-3")
		})

		it("should use default prefix when none provided", () => {
			const generator = generateSequentialId()
			expect(generator()).toBe("id-1")
			expect(generator()).toBe("id-2")
		})
	})

	describe("createFilterManager", () => {
		interface TestItem extends Record<string, unknown> {
			id: number
			name: string
			category: string
			active: boolean
		}

		const items: TestItem[] = [
			{ id: 1, name: "Item 1", category: "A", active: true },
			{ id: 2, name: "Item 2", category: "B", active: false },
			{ id: 3, name: "Item 3", category: "A", active: true },
			{ id: 4, name: "Item 4", category: "C", active: false },
		]

		it("should filter by string values", () => {
			const filterManager = createFilterManager<TestItem>()
			filterManager.setFilter({ key: "category", value: "A" })

			const filtered = filterManager.applyFilters(items)
			expect(filtered).toHaveLength(2)
			expect(filtered.every((item) => item.category === "A")).toBe(true)
		})

		it("should filter by array values", () => {
			const filterManager = createFilterManager<TestItem>()
			filterManager.setFilter({ key: "category", value: ["A", "C"] })

			const filtered = filterManager.applyFilters(items)
			expect(filtered).toHaveLength(3)
			expect(filtered.every((item) => ["A", "C"].includes(item.category))).toBe(true)
		})

		it("should filter by function", () => {
			const filterManager = createFilterManager<TestItem>()
			filterManager.setFilter({
				key: "name",
				value: (value: unknown) => typeof value === "string" && value.includes("Item 1"),
			})

			const filtered = filterManager.applyFilters(items)
			expect(filtered).toHaveLength(1)
			expect(filtered[0].name).toBe("Item 1")
		})

		it("should clear filters", () => {
			const filterManager = createFilterManager<TestItem>()
			filterManager.setFilter({ key: "category", value: "A" })
			expect(filterManager.applyFilters(items)).toHaveLength(2)

			filterManager.clearFilter("category")
			expect(filterManager.applyFilters(items)).toHaveLength(4)
		})

		it("should detect active filters", () => {
			const filterManager = createFilterManager<TestItem>()
			expect(filterManager.hasActiveFilters()).toBe(false)

			filterManager.setFilter({ key: "category", value: "A" })
			expect(filterManager.hasActiveFilters()).toBe(true)

			filterManager.clearAllFilters()
			expect(filterManager.hasActiveFilters()).toBe(false)
		})
	})

	describe("computePagedItems", () => {
		const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))

		it("should compute pagination correctly", () => {
			const result = computePagedItems({ items, page: 1, pageSize: 10 })

			expect(result.items).toHaveLength(10)
			expect(result.pagination.page).toBe(1)
			expect(result.pagination.pageSize).toBe(10)
			expect(result.pagination.total).toBe(25)
			expect(result.pagination.totalPages).toBe(3)
			expect(result.pagination.hasNextPage).toBe(true)
			expect(result.pagination.hasPrevPage).toBe(false)
		})

		it("should handle last page correctly", () => {
			const result = computePagedItems({ items, page: 3, pageSize: 10 })

			expect(result.items).toHaveLength(5)
			expect(result.pagination.hasNextPage).toBe(false)
			expect(result.pagination.hasPrevPage).toBe(true)
		})

		it("should handle empty items", () => {
			const result = computePagedItems({ items: [], page: 1, pageSize: 10 })

			expect(result.items).toHaveLength(0)
			expect(result.pagination.total).toBe(0)
			expect(result.pagination.totalPages).toBe(0)
		})
	})
})
