/**
 * URL Parser Tests
 *
 * Demonstrates functionality of parseURL, extractSelectFields, and reconstructURL
 */

import { describe, it, expect } from "vitest"
import { parseURL, extractSelectFields, reconstructURL } from "./url-parser"

describe("extractSelectFields", () => {
	it("should extract fields from comma-separated string", () => {
		const result = extractSelectFields("id,display_name,cited_by_count")
		expect(result).toEqual(["id", "display_name", "cited_by_count"])
	})

	it("should extract fields from URL with select parameter", () => {
		const result = extractSelectFields("https://api.openalex.org/works?select=id,title,doi")
		expect(result).toEqual(["id", "title", "doi"])
	})

	it("should handle whitespace around field names", () => {
		const result = extractSelectFields(" id , display_name , cited_by_count ")
		expect(result).toEqual(["id", "display_name", "cited_by_count"])
	})

	it("should return empty array for URL without select parameter", () => {
		const result = extractSelectFields("https://api.openalex.org/works")
		expect(result).toEqual([])
	})

	it("should return empty array for empty string", () => {
		const result = extractSelectFields("")
		expect(result).toEqual([])
	})

	it("should handle relative URLs with select parameter", () => {
		const result = extractSelectFields("/authors?select=id,orcid,display_name")
		expect(result).toEqual(["id", "orcid", "display_name"])
	})
})

describe("parseURL", () => {
	it("should parse complete OpenAlex URL with entity ID and select", () => {
		const result = parseURL(
			"https://api.openalex.org/works/W123456?select=id,title,doi&filter=is_oa:true"
		)

		expect(result).toEqual({
			url: "https://api.openalex.org/works/W123456?select=id,title,doi&filter=is_oa:true",
			basePath: "/works/W123456",
			queryParams: {
				select: "id,title,doi",
				filter: "is_oa:true",
			},
			selectFields: ["id", "title", "doi"],
			entityType: "works",
			entityId: "W123456",
		})
	})

	it("should parse relative URL with entity type", () => {
		const result = parseURL("/authors?filter=last_known_institution.id:I123")

		expect(result).toEqual({
			url: "/authors?filter=last_known_institution.id:I123",
			basePath: "/authors",
			queryParams: {
				filter: "last_known_institution.id:I123",
			},
			selectFields: [],
			entityType: "authors",
			entityId: null,
		})
	})

	it("should extract entity type and ID from path", () => {
		const result = parseURL("https://api.openalex.org/sources/S987654321")

		expect(result).toEqual({
			url: "https://api.openalex.org/sources/S987654321",
			basePath: "/sources/S987654321",
			queryParams: {},
			selectFields: [],
			entityType: "sources",
			entityId: "S987654321",
		})
	})

	it("should detect entity type from ID pattern when not in path", () => {
		const result = parseURL("/api/A123456789?select=id,display_name")

		expect(result.entityType).toBe("authors")
		expect(result.entityId).toBe("A123456789")
	})

	it("should handle URL without query parameters", () => {
		const result = parseURL("/works")

		expect(result).toEqual({
			url: "/works",
			basePath: "/works",
			queryParams: {},
			selectFields: [],
			entityType: "works",
			entityId: null,
		})
	})

	it("should handle invalid URLs gracefully", () => {
		const result = parseURL("")

		expect(result).toEqual({
			url: "",
			basePath: "",
			queryParams: {},
			selectFields: [],
			entityType: null,
			entityId: null,
		})
	})

	it("should parse publisher URLs", () => {
		const result = parseURL("https://api.openalex.org/publishers/P123456")

		expect(result.entityType).toBe("publishers")
		expect(result.entityId).toBe("P123456")
	})

	it("should parse topic URLs", () => {
		const result = parseURL("/topics/T123456?select=id,display_name")

		expect(result.entityType).toBe("topics")
		expect(result.entityId).toBe("T123456")
		expect(result.selectFields).toEqual(["id", "display_name"])
	})
})

describe("reconstructURL", () => {
	it("should reconstruct URL with query parameters and select fields", () => {
		const result = reconstructURL(
			"/works",
			{ filter: "is_oa:true", page: "2" },
			["id", "title", "cited_by_count"]
		)

		// Note: Order may vary, so we check for presence of components
		expect(result).toContain("/works?")
		expect(result).toContain("filter=is_oa%3Atrue")
		expect(result).toContain("page=2")
		expect(result).toContain("select=id,title,cited_by_count")
	})

	it("should NOT URL-encode commas in select parameter", () => {
		const result = reconstructURL("/works", {}, ["id", "display_name", "cited_by_count"])

		expect(result).toContain("select=id,display_name,cited_by_count")
		expect(result).not.toContain("%2C") // No encoded commas
	})

	it("should properly encode other query parameters", () => {
		const result = reconstructURL("/works", { filter: "publication_year:>2020" })

		expect(result).toContain("filter=publication_year%3A%3E2020")
	})

	it("should handle select in queryParams", () => {
		const result = reconstructURL("/authors", { select: "id,orcid", filter: "x:y" })

		expect(result).toContain("select=id,orcid")
		expect(result).toContain("filter=x%3Ay")
	})

	it("should prioritize selectFields array over queryParams select", () => {
		const result = reconstructURL(
			"/works",
			{ select: "id,title" },
			["id", "display_name", "doi"]
		)

		expect(result).toContain("select=id,display_name,doi")
		expect(result).not.toContain("select=id,title")
	})

	it("should handle base path without query parameters", () => {
		const result = reconstructURL("/works")

		expect(result).toBe("/works")
	})

	it("should handle absolute URLs", () => {
		const result = reconstructURL("https://api.openalex.org/works", { page: "1" }, ["id"])

		expect(result).toContain("https://api.openalex.org/works?")
		expect(result).toContain("page=1")
		expect(result).toContain("select=id")
	})

	it("should append to existing query string correctly", () => {
		const result = reconstructURL("/works?existing=param", { filter: "x:y" })

		expect(result).toContain("/works?existing=param&")
		expect(result).toContain("filter=x%3Ay")
	})

	it("should handle empty selectFields array", () => {
		const result = reconstructURL("/works", { filter: "is_oa:true" }, [])

		expect(result).toBe("/works?filter=is_oa%3Atrue")
	})

	it("should encode field names with special characters", () => {
		const result = reconstructURL("/works", {}, ["id", "display name", "cited-by-count"])

		expect(result).toContain("select=id,display%20name,cited-by-count")
	})

	it("should handle null/undefined queryParams", () => {
		const result = reconstructURL("/works", undefined, ["id"])

		expect(result).toBe("/works?select=id")
	})

	it("should filter out null/undefined query param values", () => {
		const result = reconstructURL(
			"/works",
			{ filter: "x:y", page: undefined as unknown as string, sort: null as unknown as string },
			["id"]
		)

		expect(result).toContain("filter=x%3Ay")
		expect(result).not.toContain("page")
		expect(result).not.toContain("sort")
	})
})

describe("integration: parse and reconstruct", () => {
	it("should round-trip URL parsing and reconstruction", () => {
		const originalUrl =
			"https://api.openalex.org/works/W123456?select=id,title,doi&filter=is_oa:true&page=1"
		const parsed = parseURL(originalUrl)

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		// Parse the reconstructed URL to compare components
		const parsedReconstructed = parseURL(`https://api.openalex.org${reconstructed}`)

		expect(parsedReconstructed.basePath).toBe(parsed.basePath)
		expect(parsedReconstructed.selectFields).toEqual(parsed.selectFields)
		expect(parsedReconstructed.queryParams.filter).toBe(parsed.queryParams.filter)
		expect(parsedReconstructed.queryParams.page).toBe(parsed.queryParams.page)
	})

	it("should preserve select parameter comma encoding", () => {
		const originalUrl = "/works?select=id,title,authors,cited_by_count"
		const parsed = parseURL(originalUrl)
		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		// Verify commas are NOT encoded
		expect(reconstructed).toContain("select=id,title,authors,cited_by_count")
		expect(reconstructed).not.toContain("%2C")
	})
})
