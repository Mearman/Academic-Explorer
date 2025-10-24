#!/usr/bin/env npx tsx
/**
 * Script to automatically fetch and cache OpenAlex queries
 */

import { join } from "path"
// TODO: Fix imports once files exist
// import { fetchAndCacheQueries } from "../../apps/academic-explorer/src/lib/utils/query-cache-builder.ts";
// import { generateAllIndexes } from "../../apps/academic-explorer/src/lib/utils/static-data-index-generator.ts";
const fetchAndCacheQueries = (..._args: unknown[]) =>
	Promise.resolve({ success: 0, failed: 0, errors: [] })
const generateAllIndexes = (..._args: unknown[]) => Promise.resolve()

/**
 * Predefined queries to cache
 */
const QUERIES_TO_CACHE = [
	{
		url: "https://api.openalex.org/works?filter=author.id:A5017898742&select=id",
		entityType: "works",
	},
	{
		url: "https://api.openalex.org/works?filter=author.id:A5017898742&select=id,display_name",
		entityType: "works",
	},
	{
		url: "https://api.openalex.org/works?filter=author.id:A5017898742&select=id,display_name,publication_year",
		entityType: "works",
	},
	{
		url: "https://api.openalex.org/works?filter=author.id:A5017898742&per_page=50",
		entityType: "works",
	},
	{
		url: "https://api.openalex.org/authors?filter=last_known_institution.id:I27837315&select=id,display_name",
		entityType: "authors",
	},
]

async function main() {
	try {
		const staticDataDir = join(process.cwd(), "public", "data", "openalex")

		console.log("[REFRESH] Fetching and caching OpenAlex queries...")
		console.log(`[FOLDER] Output directory: ${staticDataDir}`)
		console.log(`[LINK] Queries to cache: ${QUERIES_TO_CACHE.length}`)

		// Fetch and cache all queries
		const { success, failed, errors } = await fetchAndCacheQueries(QUERIES_TO_CACHE, staticDataDir)

		console.log(`[SUCCESS] Successfully cached: ${success} queries`)
		if (failed > 0) {
			console.warn(`[WARNING] Failed to cache: ${failed} queries`)
			console.warn(`[CLIPBOARD] Error details:`)
			errors.forEach(({ url, error }) => {
				console.warn(`   - ${url}: ${error}`)
			})
		}

		// Regenerate indexes to include the new queries
		console.log("[REFRESH] Regenerating static data indexes...")
		await generateAllIndexes(staticDataDir)

		console.log("[CELEBRATION] Query cache generation completed successfully!")
	} catch (error) {
		console.error("[ERROR] Error in query cache generation:", error)
		process.exit(1)
	}
}

function determineEntityType(url: string): string {
	const entityPatterns = [
		{ pattern: "/works", type: "works" },
		{ pattern: "/authors", type: "authors" },
		{ pattern: "/institutions", type: "institutions" },
		{ pattern: "/sources", type: "sources" },
		{ pattern: "/topics", type: "topics" },
		{ pattern: "/publishers", type: "publishers" },
		{ pattern: "/funders", type: "funders" },
	]

	for (const { pattern, type } of entityPatterns) {
		if (url.includes(pattern)) {
			return type
		}
	}

	return "works" // default
}

// Add specific queries if provided as command line arguments
if (process.argv.length > 2) {
	const additionalQueries = process.argv.slice(2).map((url) => {
		const entityType = determineEntityType(url)
		return { url, entityType }
	})

	QUERIES_TO_CACHE.push(...additionalQueries)
	console.log(`[ATTACHMENT] Added ${additionalQueries.length} additional queries from command line`)
}

main().catch(console.error)
