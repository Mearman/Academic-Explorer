#!/usr/bin/env node

/**
 * OpenAlex CLI Client
 * A command-line interface for accessing OpenAlex data via static cache and API
 */

import { Command } from "commander";
import { OpenAlexCLI, SUPPORTED_ENTITIES, type QueryOptions, type CacheOptions } from "./openalex-cli-class.js";
import type { StaticEntityType } from "../lib/api/static-data-provider.js";
import type { EntityType } from "../lib/openalex/types.js";
import { detectEntityType } from "../lib/entities/entity-detection.js";
import { z } from "zod";

// Zod schemas for CLI validation
const StaticEntityTypeSchema = z.enum(["authors", "works", "institutions", "topics", "publishers", "funders"]);

// Query result validation for display
const QueryResultItemSchema = z.object({
  display_name: z.string().optional(),
  id: z.string().optional(),
}).strict();

const QueryResultSchema = z.object({
  results: z.array(QueryResultItemSchema),
  meta: z.object({
    count: z.number().optional(),
  }).strict().optional(),
}).strict();

// Command options validation
const SearchCommandOptionsSchema = z.object({
  limit: z.union([z.string(), z.undefined()]).optional(),
  format: z.string().optional(),
});

const FetchCommandOptionsSchema = z.object({
  perPage: z.union([z.string(), z.undefined()]).optional(),
  page: z.union([z.string(), z.undefined()]).optional(),
  filter: z.string().optional(),
  select: z.string().optional(),
  sort: z.string().optional(),
  noCache: z.boolean().optional(),
  noSave: z.boolean().optional(),
  cacheOnly: z.boolean().optional(),
  format: z.string().optional(),
});

// Helper function to validate and convert EntityType to StaticEntityType
function toStaticEntityType(entityType: EntityType): StaticEntityType {
  const validation = StaticEntityTypeSchema.safeParse(entityType);
  if (validation.success) {
    return validation.data;
  }
  throw new Error(`Entity type ${entityType} is not supported by CLI. Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
}

// CLI Commands
const program = new Command();
const cli = OpenAlexCLI.getInstance();

program
  .name("openalex-cli")
  .description("CLI for accessing OpenAlex academic data")
  .version("1.0.0");

// List command
program
  .command("list <entity-type>")
  .description("List all entities of a specific type")
  .option("-c, --count", "Show only count")
  .option("-f, --format <format>", "Output format (json, table)", "table")
  .action(async (entityType: string, options) => {
    const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType);
    if (!entityTypeValidation.success) {
      console.error(`Unsupported entity type: ${entityType}`);
      console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
      process.exit(1);
    }

    const staticEntityType = entityTypeValidation.data;
    const entities = await cli.listEntities(staticEntityType);

    if (options.count) {
      console.log(entities.length);
      return;
    }

    if (options.format === "json") {
      console.log(JSON.stringify(entities, null, 2));
    } else {
      console.log(`\n${entityType.toUpperCase()} (${entities.length} entities):`);
      entities.forEach((id, index) => {
        console.log(`${(index + 1).toString().padStart(3)}: ${id}`);
      });
    }
  });

// Get command with explicit entity type
program
  .command("get-typed <entity-type> <entity-id>")
  .description("Get a specific entity by ID with explicit entity type")
  .option("-f, --format <format>", "Output format (json, summary)", "summary")
  .option("-p, --pretty", "Pretty print JSON")
  .option("--no-cache", "Skip cache, fetch directly from API")
  .option("--no-save", "Don't save API results to cache")
  .option("--cache-only", "Only use cache, don't fetch from API if not found")
  .action(async (entityType: string, entityId: string, options) => {
    const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType);
    if (!entityTypeValidation.success) {
      console.error(`Unsupported entity type: ${entityType}`);
      console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
      process.exit(1);
    }

    const staticEntityType = entityTypeValidation.data;

    const cacheOptions: CacheOptions = {
      useCache: !options.noCache,
      saveToCache: !options.noSave,
      cacheOnly: options.cacheOnly
    };
    const entity = await cli.getEntityWithCache(staticEntityType, entityId, cacheOptions);

    if (!entity) {
      console.error(`Entity ${entityId} not found`);
      process.exit(1);
    }

    if (options.format === "json") {
      console.log(JSON.stringify(entity, null, options.pretty ? 2 : 0));
    } else {
      console.log(`\n${staticEntityType.toUpperCase()}: ${entity.display_name}`);
      console.log(`ID: ${entity.id}`);

      // Entity-specific summary fields
      if (staticEntityType === "authors" && "works_count" in entity) {
        console.log(`Works Count: ${entity.works_count ?? "Unknown"}`);
        const citedBy = typeof entity.cited_by_count === "number" ? entity.cited_by_count : 0;
        console.log(`Cited By Count: ${citedBy}`);
      } else if (staticEntityType === "works" && "publication_year" in entity) {
        console.log(`Publication Year: ${entity.publication_year ?? "Unknown"}`);
        const citedBy = typeof entity.cited_by_count === "number" ? entity.cited_by_count : 0;
        console.log(`Cited By Count: ${citedBy}`);
      } else if (staticEntityType === "institutions" && "works_count" in entity) {
        console.log(`Works Count: ${entity.works_count ?? "Unknown"}`);
        const country = "country_code" in entity && typeof entity.country_code === "string" ? entity.country_code : "Unknown";
        console.log(`Country: ${country}`);
      }
    }
  });

// Auto-detect get command (takes just entity ID)
program
  .command("get <entity-id>")
  .description("Get entity by ID with auto-detection of entity type")
  .option("-f, --format <format>", "Output format (json, summary)", "summary")
  .option("-p, --pretty", "Pretty print JSON")
  .option("--no-cache", "Skip cache, fetch directly from API")
  .option("--no-save", "Don't save API results to cache")
  .option("--cache-only", "Only use cache, don't fetch from API if not found")
  .action(async (entityId: string, options) => {
    let entityType: EntityType;
    let staticEntityType: StaticEntityType;

    try {
      entityType = detectEntityType(entityId);
      staticEntityType = toStaticEntityType(entityType);
    } catch (error) {
      console.error(`Cannot detect entity type from ID: ${entityId}`);
      console.error("Expected format: W2241997964 (works), A5017898742 (authors), S123 (sources), I123 (institutions), T123 (topics), P123 (publishers)");
      console.error("Or full URLs like: https://openalex.org/A5017898742");
      console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
      process.exit(1);
    }

    const cacheOptions: CacheOptions = {
      useCache: !options.noCache,
      saveToCache: !options.noSave,
      cacheOnly: options.cacheOnly
    };

    const entity = await cli.getEntityWithCache(staticEntityType, entityId, cacheOptions);

    if (!entity) {
      console.error(`Entity ${entityId} not found`);
      process.exit(1);
    }

    if (options.format === "json") {
      console.log(JSON.stringify(entity, null, options.pretty ? 2 : 0));
    } else {
      console.log(`\n${staticEntityType.toUpperCase()}: ${entity.display_name}`);
      console.log(`ID: ${entity.id}`);

      // Entity-specific summary fields
      if (staticEntityType === "authors" && "works_count" in entity) {
        console.log(`Works Count: ${entity.works_count ?? "Unknown"}`);
        const citedBy = typeof entity.cited_by_count === "number" ? entity.cited_by_count : 0;
        console.log(`Cited By Count: ${citedBy}`);
      } else if (staticEntityType === "works" && "publication_year" in entity) {
        console.log(`Publication Year: ${entity.publication_year ?? "Unknown"}`);
        const citedBy = typeof entity.cited_by_count === "number" ? entity.cited_by_count : 0;
        console.log(`Cited By Count: ${citedBy}`);
      } else if (staticEntityType === "institutions" && "works_count" in entity) {
        console.log(`Works Count: ${entity.works_count ?? "Unknown"}`);
        const country = "country_code" in entity && typeof entity.country_code === "string" ? entity.country_code : "Unknown";
        console.log(`Country: ${country}`);
      }
    }
  });

// Search command
program
  .command("search <entity-type> <term>")
  .description("Search entities by display name")
  .option("-l, --limit <limit>", "Limit results", "10")
  .option("-f, --format <format>", "Output format (json, table)", "table")
  .action(async (entityType: string, searchTerm: string, options) => {
    const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType);
    if (!entityTypeValidation.success) {
      console.error(`Unsupported entity type: ${entityType}`);
      console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
      process.exit(1);
    }

    const optionsValidation = SearchCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const staticEntityType = entityTypeValidation.data;
    const validatedOptions = optionsValidation.data;
    const results = await cli.searchEntities(staticEntityType, searchTerm);
    const limit = typeof validatedOptions.limit === "string" ? parseInt(validatedOptions.limit, 10) : 10;
    const limitedResults = results.slice(0, limit);

    if (validatedOptions.format === "json") {
      console.log(JSON.stringify(limitedResults, null, 2));
    } else {
      console.log(`\nSearch results for "${searchTerm}" in ${entityType} (${limitedResults.length}/${results.length}):`);
      limitedResults.forEach((entity, index) => {
        console.log(`${(index + 1).toString().padStart(3)}: ${entity.display_name} (${entity.id})`);
      });
    }
  });

// Stats command
program
  .command("stats")
  .description("Show statistics for all entity types")
  .option("-f, --format <format>", "Output format (json, table)", "table")
  .action(async (options) => {
    const stats = await cli.getStatistics();

    if (options.format === "json") {
      console.log(JSON.stringify(stats, null, 2));
    } else {
      console.log("\nOpenAlex Static Data Statistics:");
      console.log("=".repeat(50));

      Object.entries(stats).forEach(([entityType, data]) => {
        const sizeInMB = (data.totalSize / (1024 * 1024)).toFixed(2);
        const lastMod = new Date(data.lastModified).toLocaleString();

        console.log(`${entityType.toUpperCase().padEnd(12)}: ${data.count.toString().padStart(4)} entities, ${sizeInMB.padStart(6)}MB, last: ${lastMod}`);
      });
    }
  });

// Index command
program
  .command("index <entity-type>")
  .description("Show index information for entity type")
  .action(async (entityType: string) => {
    const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType);
    if (!entityTypeValidation.success) {
      console.error(`Unsupported entity type: ${entityType}`);
      console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
      process.exit(1);
    }

    const staticEntityType = entityTypeValidation.data;
    const index = await cli.loadIndex(staticEntityType);

    if (!index) {
      console.error(`No index found for ${entityType}`);
      process.exit(1);
    }

    console.log(JSON.stringify(index, null, 2));
  });

// Fetch command (new API query command with cache control)
program
  .command("fetch <entity-type>")
  .description("Fetch entities from OpenAlex API with cache control")
  .option("--filter <filter>", "OpenAlex filter parameter")
  .option("--select <fields>", "Comma-separated list of fields to select")
  .option("--sort <sort>", "Sort parameter")
  .option("--per-page <number>", "Number of results per page", "25")
  .option("--page <number>", "Page number", "1")
  .option("--no-cache", "Skip cache, fetch directly from API")
  .option("--no-save", "Don't save API results to cache")
  .option("--cache-only", "Only use cache, don't fetch from API if not found")
  .option("-f, --format <format>", "Output format (json, summary)", "json")
  .action(async (entityType: string, options) => {
    const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType);
    if (!entityTypeValidation.success) {
      console.error(`Unsupported entity type: ${entityType}`);
      console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
      process.exit(1);
    }

    const optionsValidation = FetchCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const staticEntityType = entityTypeValidation.data;
    const validatedOptions = optionsValidation.data;

    const perPage = typeof validatedOptions.perPage === "string" ? parseInt(validatedOptions.perPage, 10) : 25;
    const page = typeof validatedOptions.page === "string" ? parseInt(validatedOptions.page, 10) : 1;

    const queryOptions: QueryOptions = {
      per_page: perPage,
      page: page
    };

    if (validatedOptions.filter) queryOptions.filter = validatedOptions.filter;
    if (validatedOptions.select) queryOptions.select = validatedOptions.select.split(",").map((s: string) => s.trim());
    if (validatedOptions.sort) queryOptions.sort = validatedOptions.sort;

    const cacheOptions: CacheOptions = {
      useCache: !validatedOptions.noCache,
      saveToCache: !validatedOptions.noSave,
      cacheOnly: validatedOptions.cacheOnly ?? false
    };

    try {
      const result = await cli.queryWithCache(staticEntityType, queryOptions, cacheOptions);

      if (!result) {
        console.error("No results found");
        process.exit(1);
      }

      if (validatedOptions.format === "json") {
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Summary format for query results
        const queryResultValidation = QueryResultSchema.safeParse(result);
        if (queryResultValidation.success) {
          const apiResult = queryResultValidation.data;
          console.log(`\nQuery Results for ${staticEntityType.toUpperCase()}:`);
          console.log(`Total results: ${apiResult.meta?.count ?? apiResult.results.length}`);
          console.log(`Returned: ${apiResult.results.length}`);

          if (apiResult.results.length > 0) {
            apiResult.results.slice(0, 10).forEach((item, index: number) => {
              const displayName = item.display_name ?? item.id ?? `Item ${index + 1}`;
              console.log(`${(index + 1).toString().padStart(3)}: ${displayName}`);
            });

            if (apiResult.results.length > 10) {
              console.log(`... and ${apiResult.results.length - 10} more`);
            }
          }
        } else {
          console.log("Unexpected result format");
        }
      }
    } catch (error) {
      console.error("Query failed:", error);
      process.exit(1);
    }
  });

// Parse and execute
program.parse();