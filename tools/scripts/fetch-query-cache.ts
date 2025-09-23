#!/usr/bin/env tsx
/**
 * Script to automatically fetch and cache OpenAlex queries
 */

import { join } from "path";
import { fetchAndCacheQueries } from "../src/lib/utils/query-cache-builder.ts";
import { generateAllIndexes } from "../src/lib/utils/static-data-index-generator.ts";

/**
 * Predefined queries to cache
 */
const QUERIES_TO_CACHE = [
  {
    url: "https://api.openalex.org/works?filter=author.id:A5017898742&select=id",
    entityType: "works"
  },
  {
    url: "https://api.openalex.org/works?filter=author.id:A5017898742&select=id,display_name",
    entityType: "works"
  },
  {
    url: "https://api.openalex.org/works?filter=author.id:A5017898742&select=id,display_name,publication_year",
    entityType: "works"
  },
  {
    url: "https://api.openalex.org/works?filter=author.id:A5017898742&per_page=50",
    entityType: "works"
  },
  {
    url: "https://api.openalex.org/authors?filter=last_known_institution.id:I27837315&select=id,display_name",
    entityType: "authors"
  }
];

async function main() {
  try {
    const staticDataDir = join(process.cwd(), "public", "data", "openalex");

    console.log("🔄 Fetching and caching OpenAlex queries...");
    console.log(`📁 Output directory: ${staticDataDir}`);
    console.log(`🔗 Queries to cache: ${QUERIES_TO_CACHE.length}`);

    // Fetch and cache all queries
    const { success, failed, errors } = await fetchAndCacheQueries(QUERIES_TO_CACHE, staticDataDir);

    console.log(`✅ Successfully cached: ${success} queries`);
    if (failed > 0) {
      console.warn(`⚠️  Failed to cache: ${failed} queries`);
      console.warn(`📋 Error details:`);
      errors.forEach(({ url, error }) => {
        console.warn(`   - ${url}: ${error}`);
      });
    }

    // Regenerate indexes to include the new queries
    console.log("🔄 Regenerating static data indexes...");
    await generateAllIndexes(staticDataDir);

    console.log("🎉 Query cache generation completed successfully!");

  } catch (error) {
    console.error("❌ Error in query cache generation:", error);
    process.exit(1);
  }
}

// Add specific queries if provided as command line arguments
if (process.argv.length > 2) {
  const additionalQueries = process.argv.slice(2).map(url => {
    // Determine entity type from URL
    const entityType = url.includes("/works") ? "works"
                    : url.includes("/authors") ? "authors"
                    : url.includes("/institutions") ? "institutions"
                    : url.includes("/sources") ? "sources"
                    : url.includes("/topics") ? "topics"
                    : url.includes("/publishers") ? "publishers"
                    : url.includes("/funders") ? "funders"
                    : "works"; // default

    return { url, entityType };
  });

  QUERIES_TO_CACHE.push(...additionalQueries);
  console.log(`📎 Added ${additionalQueries.length} additional queries from command line`);
}

main().catch(console.error);