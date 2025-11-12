import { describe, it, expect } from "vitest"
import {
	detectEntityTypeFromURL,
	extractEntityId,
	isEntityPage,
	parseEntityUrl,
} from "./entity-detector"

describe("entity-detector", () => {
	describe("detectEntityTypeFromURL", () => {
		it("detects entity type from full URL", () => {
			expect(detectEntityTypeFromURL("https://api.openalex.org/works/W1234567890")).toBe(
				"works",
			)
			expect(
				detectEntityTypeFromURL("https://api.openalex.org/authors/A123456789"),
			).toBe("authors")
			expect(
				detectEntityTypeFromURL("https://api.openalex.org/sources/S987654321"),
			).toBe("sources")
		})

		it("detects entity type from pathname", () => {
			expect(detectEntityTypeFromURL("/works/W1234567890")).toBe("works")
			expect(detectEntityTypeFromURL("/authors/A123456789")).toBe("authors")
			expect(detectEntityTypeFromURL("/institutions/I555555555")).toBe("institutions")
			expect(detectEntityTypeFromURL("/publishers/P999999999")).toBe("publishers")
			expect(detectEntityTypeFromURL("/funders/F111111111")).toBe("funders")
			expect(detectEntityTypeFromURL("/topics/T222222222")).toBe("topics")
			expect(detectEntityTypeFromURL("/concepts/C333333333")).toBe("concepts")
			expect(detectEntityTypeFromURL("/keywords/K444444444")).toBe("keywords")
		})

		it("detects entity type from hash route", () => {
			expect(detectEntityTypeFromURL("#/works/W1234567890")).toBe("works")
			expect(detectEntityTypeFromURL("#/authors/A123456789")).toBe("authors")
		})

		it("detects entity type with query parameters", () => {
			expect(detectEntityTypeFromURL("/works/W1234567890?select=id,title")).toBe("works")
			expect(detectEntityTypeFromURL("#/authors/A123456789?select=id")).toBe("authors")
		})

		it("returns undefined for query/listing pages", () => {
			expect(detectEntityTypeFromURL("/works")).toBeUndefined()
			expect(detectEntityTypeFromURL("/works?filter=title.search:test")).toBeUndefined()
			expect(detectEntityTypeFromURL("/authors")).toBeUndefined()
			expect(detectEntityTypeFromURL("/authors?filter=display_name.search:smith")).toBeUndefined()
		})

		it("returns undefined for non-entity pages", () => {
			expect(detectEntityTypeFromURL("/search")).toBeUndefined()
			expect(detectEntityTypeFromURL("/about")).toBeUndefined()
			expect(detectEntityTypeFromURL("/")).toBeUndefined()
		})

		it("handles case insensitivity", () => {
			expect(detectEntityTypeFromURL("/WORKS/W1234567890")).toBe("works")
			expect(detectEntityTypeFromURL("/Works/W1234567890")).toBe("works")
		})

		it("handles URLs with hash fragments", () => {
			expect(detectEntityTypeFromURL("/works/W1234567890#section")).toBe("works")
			expect(detectEntityTypeFromURL("#/authors/A123456789#bio")).toBe("authors")
		})
	})

	describe("extractEntityId", () => {
		it("extracts work ID from URL", () => {
			expect(extractEntityId("/works/W1234567890", "works")).toBe("W1234567890")
			expect(
				extractEntityId("https://api.openalex.org/works/W1234567890", "works"),
			).toBe("W1234567890")
			expect(extractEntityId("#/works/W9999999999", "works")).toBe("W9999999999")
		})

		it("extracts author ID from URL", () => {
			expect(extractEntityId("/authors/A123456789", "authors")).toBe("A123456789")
			expect(extractEntityId("#/authors/A999999999", "authors")).toBe("A999999999")
		})

		it("extracts ID for all entity types", () => {
			expect(extractEntityId("/sources/S123456789", "sources")).toBe("S123456789")
			expect(extractEntityId("/institutions/I987654321", "institutions")).toBe(
				"I987654321",
			)
			expect(extractEntityId("/publishers/P111222333", "publishers")).toBe("P111222333")
			expect(extractEntityId("/funders/F444555666", "funders")).toBe("F444555666")
			expect(extractEntityId("/topics/T777888999", "topics")).toBe("T777888999")
			expect(extractEntityId("/concepts/C123123123", "concepts")).toBe("C123123123")
			expect(extractEntityId("/keywords/K456456456", "keywords")).toBe("K456456456")
		})

		it("extracts ID with query parameters", () => {
			expect(extractEntityId("/works/W1234567890?select=id,title", "works")).toBe(
				"W1234567890",
			)
		})

		it("returns undefined when ID not found", () => {
			expect(extractEntityId("/works", "works")).toBeUndefined()
			expect(extractEntityId("/authors", "authors")).toBeUndefined()
		})

		it("returns undefined when entity type mismatch", () => {
			expect(extractEntityId("/works/W1234567890", "authors")).toBeUndefined()
			expect(extractEntityId("/authors/A123456789", "works")).toBeUndefined()
		})

		it("handles URLs with hash fragments", () => {
			expect(extractEntityId("/works/W1234567890#section", "works")).toBe("W1234567890")
		})
	})

	describe("isEntityPage", () => {
		it("returns true for entity pages with IDs", () => {
			expect(isEntityPage("/works/W1234567890")).toBe(true)
			expect(isEntityPage("/authors/A123456789")).toBe(true)
			expect(isEntityPage("/sources/S987654321")).toBe(true)
			expect(isEntityPage("/institutions/I555555555")).toBe(true)
			expect(isEntityPage("/publishers/P999999999")).toBe(true)
			expect(isEntityPage("/funders/F111111111")).toBe(true)
			expect(isEntityPage("/topics/T222222222")).toBe(true)
			expect(isEntityPage("/concepts/C333333333")).toBe(true)
			expect(isEntityPage("/keywords/K444444444")).toBe(true)
		})

		it("returns true for hash routes with IDs", () => {
			expect(isEntityPage("#/works/W1234567890")).toBe(true)
			expect(isEntityPage("#/authors/A123456789")).toBe(true)
		})

		it("returns true for full URLs with IDs", () => {
			expect(isEntityPage("https://api.openalex.org/works/W1234567890")).toBe(true)
			expect(isEntityPage("https://api.openalex.org/authors/A123456789")).toBe(true)
		})

		it("returns false for query/listing pages", () => {
			expect(isEntityPage("/works")).toBe(false)
			expect(isEntityPage("/works?filter=title.search:test")).toBe(false)
			expect(isEntityPage("/authors")).toBe(false)
		})

		it("returns false for non-entity pages", () => {
			expect(isEntityPage("/search")).toBe(false)
			expect(isEntityPage("/about")).toBe(false)
			expect(isEntityPage("/")).toBe(false)
		})

		it("handles URLs with query parameters", () => {
			expect(isEntityPage("/works/W1234567890?select=id,title")).toBe(true)
		})

		it("handles URLs with hash fragments", () => {
			expect(isEntityPage("/works/W1234567890#section")).toBe(true)
		})
	})

	describe("parseEntityUrl", () => {
		it("extracts both entity type and ID", () => {
			expect(parseEntityUrl("/works/W1234567890")).toEqual({
				entityType: "works",
				entityId: "W1234567890",
			})
			expect(parseEntityUrl("/authors/A123456789")).toEqual({
				entityType: "authors",
				entityId: "A123456789",
			})
		})

		it("handles hash routes", () => {
			expect(parseEntityUrl("#/works/W1234567890")).toEqual({
				entityType: "works",
				entityId: "W1234567890",
			})
		})

		it("handles full URLs", () => {
			expect(parseEntityUrl("https://api.openalex.org/works/W1234567890")).toEqual({
				entityType: "works",
				entityId: "W1234567890",
			})
		})

		it("returns undefined values for query pages", () => {
			expect(parseEntityUrl("/works")).toEqual({
				entityType: undefined,
				entityId: undefined,
			})
			expect(parseEntityUrl("/works?filter=title.search:test")).toEqual({
				entityType: undefined,
				entityId: undefined,
			})
		})

		it("returns undefined values for non-entity pages", () => {
			expect(parseEntityUrl("/search")).toEqual({
				entityType: undefined,
				entityId: undefined,
			})
			expect(parseEntityUrl("/about")).toEqual({
				entityType: undefined,
				entityId: undefined,
			})
		})

		it("handles URLs with query parameters", () => {
			expect(parseEntityUrl("/works/W1234567890?select=id,title")).toEqual({
				entityType: "works",
				entityId: "W1234567890",
			})
		})

		it("handles URLs with hash fragments", () => {
			expect(parseEntityUrl("/works/W1234567890#section")).toEqual({
				entityType: "works",
				entityId: "W1234567890",
			})
		})

		it("handles all entity types", () => {
			expect(parseEntityUrl("/sources/S123456789")).toEqual({
				entityType: "sources",
				entityId: "S123456789",
			})
			expect(parseEntityUrl("/institutions/I987654321")).toEqual({
				entityType: "institutions",
				entityId: "I987654321",
			})
			expect(parseEntityUrl("/publishers/P111222333")).toEqual({
				entityType: "publishers",
				entityId: "P111222333",
			})
			expect(parseEntityUrl("/funders/F444555666")).toEqual({
				entityType: "funders",
				entityId: "F444555666",
			})
			expect(parseEntityUrl("/topics/T777888999")).toEqual({
				entityType: "topics",
				entityId: "T777888999",
			})
			expect(parseEntityUrl("/concepts/C123123123")).toEqual({
				entityType: "concepts",
				entityId: "C123123123",
			})
			expect(parseEntityUrl("/keywords/K456456456")).toEqual({
				entityType: "keywords",
				entityId: "K456456456",
			})
		})
	})
})
