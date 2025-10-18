#!/usr/bin/env node

/**
 * OpenAlex CLI Client
 * A command-line interface for accessing OpenAlex data via static cache and API
 */

/* eslint-disable prefer-destructured-params-plugin/prefer-destructured-params */

import { Command } from "commander";
import {
  OpenAlexCLI,
  SUPPORTED_ENTITIES,
  type QueryOptions,
  type CacheOptions,
} from "./openalex-cli-class.js";
import type { StaticEntityType } from "./entity-detection.js";
import type { EntityType } from "@academic-explorer/client";

// Common CLI option strings
const FORMAT_OPTION = "-f, --format <format>";
const PRETTY_OPTION = "-p, --pretty";
const NO_CACHE_OPTION = "--no-cache";
const NO_SAVE_OPTION = "--no-save";
const CACHE_ONLY_OPTION = "--cache-only";

/**
 * Print entity summary to console
 */
interface EntitySummary {
  display_name?: string;
  id?: string;
  works_count?: number;
  cited_by_count?: number;
  publication_year?: number;
  country_code?: string;
}

function printEntitySummary(entity: EntitySummary, entityType: string): void {
  console.log(`\n${entityType.toUpperCase()}: ${entity.display_name}`);
  console.log(`ID: ${entity.id}`);

  // Entity-specific summary fields
  if (entityType === "authors" && "works_count" in entity) {
    const worksCount =
      typeof entity["works_count"] === "number"
        ? entity["works_count"]
        : "Unknown";
    console.log(`Works Count: ${worksCount.toString()}`);
    const citedBy =
      typeof entity["cited_by_count"] === "number"
        ? entity["cited_by_count"]
        : 0;
    console.log(`Cited By Count: ${citedBy.toString()}`);
  } else if (entityType === "works" && "publication_year" in entity) {
    const pubYear =
      typeof entity["publication_year"] === "number"
        ? entity["publication_year"]
        : "Unknown";
    console.log(`Publication Year: ${pubYear.toString()}`);
    const citedBy =
      typeof entity["cited_by_count"] === "number"
        ? entity["cited_by_count"]
        : 0;
    console.log(`Cited By Count: ${citedBy.toString()}`);
  } else if (entityType === "institutions" && "works_count" in entity) {
    const worksCount =
      typeof entity["works_count"] === "number"
        ? entity["works_count"]
        : "Unknown";
    console.log(`Works Count: ${worksCount.toString()}`);
    const country =
      "country_code" in entity && typeof entity["country_code"] === "string"
        ? entity["country_code"]
        : "Unknown";
    console.log(`Country: ${country}`);
  }
}
import { detectEntityType } from "./entity-detection.js";
import { z } from "zod";
import { StaticCacheManager } from "./cache/static-cache-manager.js";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";

// Zod schemas for CLI validation
const StaticEntityTypeSchema = z.enum([
  "authors",
  "works",
  "institutions",
  "topics",
  "publishers",
  "funders",
]);

// Query result validation for display
const QueryResultItemSchema = z
  .object({
    display_name: z.string().optional(),
    id: z.string().optional(),
  })
  .strict();

const QueryResultSchema = z
  .object({
    results: z.array(QueryResultItemSchema),
    meta: z
      .object({
        count: z.number().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

// Command options validation
const ListCommandOptionsSchema = z.object({
  count: z.boolean().optional(),
  format: z.string().optional(),
});

const SearchCommandOptionsSchema = z.object({
  limit: z.union([z.string(), z.undefined()]).optional(),
  format: z.string().optional(),
});

const GetTypedCommandOptionsSchema = z.object({
  format: z.string().optional(),
  pretty: z.boolean().optional(),
  noCache: z.boolean().optional(),
  noSave: z.boolean().optional(),
  cacheOnly: z.boolean().optional(),
});

const GetCommandOptionsSchema = z.object({
  format: z.string().optional(),
  pretty: z.boolean().optional(),
  noCache: z.boolean().optional(),
  noSave: z.boolean().optional(),
  cacheOnly: z.boolean().optional(),
});

const StatsCommandOptionsSchema = z.object({
  format: z.string().optional(),
});

const CacheStatsCommandOptionsSchema = z.object({
  format: z.string().optional(),
});

const CacheFieldCoverageCommandOptionsSchema = z.object({
  format: z.string().optional(),
});

const CachePopularEntitiesCommandOptionsSchema = z.object({
  limit: z.union([z.string(), z.undefined()]).optional(),
  format: z.string().optional(),
});

const CachePopularCollectionsCommandOptionsSchema = z.object({
  limit: z.union([z.string(), z.undefined()]).optional(),
  format: z.string().optional(),
});

const CacheClearCommandOptionsSchema = z.object({
  confirm: z.boolean().optional(),
});

const StaticAnalyzeCommandOptionsSchema = z.object({
  format: z.string().optional(),
});

const StaticGenerateCommandOptionsSchema = z.object({
  entityType: z.string().optional(),
  dryRun: z.boolean().optional(),
  force: z.boolean().optional(),
});

// New static cache command schemas
const CacheGenerateStaticCommandOptionsSchema = z.object({
  entityType: z.string().optional(),
  limit: z.union([z.string(), z.undefined()]).optional(),
  force: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  format: z.string().optional(),
});

const CacheValidateStaticCommandOptionsSchema = z.object({
  format: z.string().optional(),
  verbose: z.boolean().optional(),
});

const CacheClearStaticCommandOptionsSchema = z.object({
  entityType: z.string().optional(),
  confirm: z.boolean().optional(),
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
  throw new Error(
    `Entity type ${entityType} is not supported by CLI. Supported types: ${SUPPORTED_ENTITIES.join(", ")}`,
  );
}

// CLI Commands
const program = new Command();
const cli = OpenAlexCLI.getInstance();

// Always use the correct development path for the web app
const currentFileUrl = import.meta.url;
const currentFilePath = fileURLToPath(currentFileUrl);
const projectRoot = resolve(dirname(currentFilePath), "../../..");
const webAppCachePath = join(
  projectRoot,
  "apps",
  "web",
  "public",
  "data",
  "openalex",
);

const staticCacheManager = new StaticCacheManager({
  mode: "development",
  basePath: webAppCachePath,
});

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
  .action(async (entityType: string, options: unknown) => {
    const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType);
    if (!entityTypeValidation.success) {
      console.error(`Unsupported entity type: ${entityType}`);
      console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
      process.exit(1);
    }

    const optionsValidation = ListCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const staticEntityType = entityTypeValidation.data;
    const validatedOptions = optionsValidation.data;
    const entities = await cli.listEntities(staticEntityType);

    if (validatedOptions.count) {
      console.log(entities.length);
      return;
    }

    if (validatedOptions.format === "json") {
      console.log(JSON.stringify(entities, null, 2));
    } else {
      console.log(
        `\n${entityType.toUpperCase()} (${entities.length.toString()} entities):`,
      );
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

  .action(async (entityType: string, entityId: string, options: unknown) => {
    const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType);
    if (!entityTypeValidation.success) {
      console.error(`Unsupported entity type: ${entityType}`);
      console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
      process.exit(1);
    }

    const optionsValidation = GetTypedCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const staticEntityType = entityTypeValidation.data;
    const validatedOptions = optionsValidation.data;

    const cacheOptions: CacheOptions = {
      useCache: !validatedOptions.noCache,
      saveToCache: !validatedOptions.noSave,
      cacheOnly: validatedOptions.cacheOnly ?? false,
    };
    const entity = await cli.getEntityWithCache(
      staticEntityType,
      entityId,
      cacheOptions,
    );

    if (!entity) {
      console.error(`Entity ${entityId} not found`);
      process.exit(1);
    }

    if (validatedOptions.format === "json") {
      console.log(
        JSON.stringify(entity, null, validatedOptions.pretty ? 2 : 0),
      );
    } else {
      console.log(
        `\n${staticEntityType.toUpperCase()}: ${entity.display_name}`,
      );
      console.log(`ID: ${entity.id}`);

      // Entity-specific summary fields
      if (staticEntityType === "authors" && "works_count" in entity) {
        const worksCount =
          typeof entity["works_count"] === "number"
            ? entity["works_count"]
            : "Unknown";
        console.log(`Works Count: ${worksCount.toString()}`);
        const citedBy =
          typeof entity["cited_by_count"] === "number"
            ? entity["cited_by_count"]
            : 0;
        console.log(`Cited By Count: ${citedBy.toString()}`);
      } else if (staticEntityType === "works" && "publication_year" in entity) {
        const pubYear =
          typeof entity["publication_year"] === "number"
            ? entity["publication_year"]
            : "Unknown";
        console.log(`Publication Year: ${pubYear.toString()}`);
        const citedBy =
          typeof entity["cited_by_count"] === "number"
            ? entity["cited_by_count"]
            : 0;
        console.log(`Cited By Count: ${citedBy.toString()}`);
      } else if (
        staticEntityType === "institutions" &&
        "works_count" in entity
      ) {
        const worksCount =
          typeof entity["works_count"] === "number"
            ? entity["works_count"]
            : "Unknown";
        console.log(`Works Count: ${worksCount.toString()}`);
        const country =
          "country_code" in entity && typeof entity["country_code"] === "string"
            ? entity["country_code"]
            : "Unknown";
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

  .action(async (entityId: string, options: unknown) => {
    const optionsValidation = GetCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const validatedOptions = optionsValidation.data;

    let entityType: EntityType;
    let staticEntityType: StaticEntityType;

    try {
      entityType = detectEntityType(entityId);
      staticEntityType = toStaticEntityType(entityType);
    } catch {
      console.error(`Cannot detect entity type from ID: ${entityId}`);
      console.error(
        "Expected format: W2241997964 (works), A5017898742 (authors), S123 (sources), I123 (institutions), T123 (topics), P123 (publishers)",
      );
      console.error("Or full URLs like: https://openalex.org/A5017898742");
      console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
      process.exit(1);
    }

    const cacheOptions: CacheOptions = {
      useCache: !validatedOptions.noCache,
      saveToCache: !validatedOptions.noSave,
      cacheOnly: validatedOptions.cacheOnly ?? false,
    };

    const entity = await cli.getEntityWithCache(
      staticEntityType,
      entityId,
      cacheOptions,
    );

    if (!entity) {
      console.error(`Entity ${entityId} not found`);
      process.exit(1);
    }

    if (validatedOptions.format === "json") {
      console.log(
        JSON.stringify(entity, null, validatedOptions.pretty ? 2 : 0),
      );
    } else {
      console.log(
        `\n${staticEntityType.toUpperCase()}: ${entity.display_name}`,
      );
      console.log(`ID: ${entity.id}`);

      // Entity-specific summary fields
      if (staticEntityType === "authors" && "works_count" in entity) {
        const worksCount =
          typeof entity["works_count"] === "number"
            ? entity["works_count"]
            : "Unknown";
        console.log(`Works Count: ${worksCount.toString()}`);
        const citedBy =
          typeof entity["cited_by_count"] === "number"
            ? entity["cited_by_count"]
            : 0;
        console.log(`Cited By Count: ${citedBy.toString()}`);
      } else if (staticEntityType === "works" && "publication_year" in entity) {
        const pubYear =
          typeof entity["publication_year"] === "number"
            ? entity["publication_year"]
            : "Unknown";
        console.log(`Publication Year: ${pubYear.toString()}`);
        const citedBy =
          typeof entity["cited_by_count"] === "number"
            ? entity["cited_by_count"]
            : 0;
        console.log(`Cited By Count: ${citedBy.toString()}`);
      } else if (
        staticEntityType === "institutions" &&
        "works_count" in entity
      ) {
        const worksCount =
          typeof entity["works_count"] === "number"
            ? entity["works_count"]
            : "Unknown";
        console.log(`Works Count: ${worksCount.toString()}`);
        const country =
          "country_code" in entity && typeof entity["country_code"] === "string"
            ? entity["country_code"]
            : "Unknown";
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
    const limit =
      typeof validatedOptions.limit === "string"
        ? parseInt(validatedOptions.limit, 10)
        : 10;
    const limitedResults = results.slice(0, limit);

    if (validatedOptions.format === "json") {
      console.log(JSON.stringify(limitedResults, null, 2));
    } else {
      console.log(
        `\nSearch results for "${searchTerm}" in ${entityType} (${limitedResults.length.toString()}/${results.length.toString()}):`,
      );
      limitedResults.forEach((entity, index) => {
        console.log(
          `${(index + 1).toString().padStart(3)}: ${entity.display_name} (${entity.id})`,
        );
      });
    }
  });

// Stats command
program
  .command("stats")
  .description("Show statistics for all entity types")
  .option("-f, --format <format>", "Output format (json, table)", "table")
  .action(async (options: unknown) => {
    const optionsValidation = StatsCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const validatedOptions = optionsValidation.data;
    const stats = await cli.getStatistics();

    if (validatedOptions.format === "json") {
      console.log(JSON.stringify(stats, null, 2));
    } else {
      console.log("\nOpenAlex Static Data Statistics:");
      console.log("=".repeat(50));

      Object.entries(stats).forEach(([entityType, data]) => {
        const lastMod = new Date(data.lastModified).toLocaleString();

        console.log(
          `${entityType.toUpperCase().padEnd(12)}: ${data.count.toString().padStart(4)} entities, last: ${lastMod}`,
        );
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
    const index = await cli.loadUnifiedIndex(staticEntityType);

    if (!index) {
      console.error(`No unified index found for ${entityType}`);
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

    const perPage =
      typeof validatedOptions.perPage === "string"
        ? parseInt(validatedOptions.perPage, 10)
        : 25;
    const page =
      typeof validatedOptions.page === "string"
        ? parseInt(validatedOptions.page, 10)
        : 1;

    const queryOptions: QueryOptions = {
      per_page: perPage,
      page,
    };

    if (validatedOptions.filter) queryOptions.filter = validatedOptions.filter;
    if (validatedOptions.select)
      queryOptions.select = validatedOptions.select
        .split(",")
        .map((s: string) => s.trim());
    if (validatedOptions.sort) queryOptions.sort = validatedOptions.sort;

    const cacheOptions: CacheOptions = {
      useCache: !validatedOptions.noCache,
      saveToCache: !validatedOptions.noSave,
      cacheOnly: validatedOptions.cacheOnly ?? false,
    };

    try {
      const result = await cli.queryWithCache(
        staticEntityType,
        queryOptions,
        cacheOptions,
      );

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
          console.log(
            `Total results: ${(apiResult.meta?.count ?? apiResult.results.length).toString()}`,
          );
          console.log(`Returned: ${apiResult.results.length.toString()}`);

          if (apiResult.results.length > 0) {
            apiResult.results.slice(0, 10).forEach((item, index: number) => {
              const displayName =
                item.display_name ??
                item.id ??
                `Item ${(index + 1).toString()}`;
              console.log(
                `${(index + 1).toString().padStart(3)}: ${displayName}`,
              );
            });

            if (apiResult.results.length > 10) {
              console.log(
                `... and ${(apiResult.results.length - 10).toString()} more`,
              );
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

// Cache management commands
program
  .command("cache:stats")
  .description("Show synthetic cache statistics and field accumulation data")
  .option("-f, --format <format>", "Output format (json, table)", "table")
  .action(async (options: unknown) => {
    const optionsValidation = CacheStatsCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const validatedOptions = optionsValidation.data;
    const stats = await cli.getCacheStats();

    if (validatedOptions.format === "json") {
      console.log(JSON.stringify(stats, null, 2));
    } else {
      console.log("\nSynthetic Cache Statistics:");
      console.log("=".repeat(50));

      if (stats.performance) {
        console.log("Performance Metrics:");
        console.log(
          `  Total Requests: ${stats.performance.totalRequests.toString()}`,
        );
        console.log(
          `  Cache Hit Rate: ${(stats.performance.cacheHitRate * 100).toFixed(1)}%`,
        );
        console.log(
          `  Surgical Requests: ${stats.performance.surgicalRequestCount.toString()}`,
        );
        console.log(
          `  Bandwidth Saved: ${(stats.performance.bandwidthSaved / 1024).toFixed(1)} KB`,
        );
        console.log("");
      }

      if (stats.storage?.memory) {
        console.log("Memory Storage:");
        console.log(
          `  Entities: ${(stats.storage.memory.entities ?? 0).toString()}`,
        );
        console.log(
          `  Fields: ${(stats.storage.memory.fields ?? 0).toString()}`,
        );
        console.log(
          `  Collections: ${(stats.storage.memory.collections ?? 0).toString()}`,
        );
        console.log(
          `  Size: ${((stats.storage.memory.size ?? 0) / 1024).toFixed(1)} KB`,
        );
      }
    }
  });

program
  .command("cache:field-coverage <entity-type> <entity-id>")
  .description(
    "Show field coverage for a specific entity across all cache tiers",
  )
  .option("-f, --format <format>", "Output format (json, table)", "table")
  .action(async (entityType: string, entityId: string, options: unknown) => {
    const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType);
    if (!entityTypeValidation.success) {
      console.error(`Unsupported entity type: ${entityType}`);
      console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
      process.exit(1);
    }

    const optionsValidation =
      CacheFieldCoverageCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const validatedOptions = optionsValidation.data;
    const coverage = await cli.getFieldCoverage(
      entityTypeValidation.data,
      entityId,
    );

    if (validatedOptions.format === "json") {
      console.log(JSON.stringify(coverage, null, 2));
    } else {
      console.log(
        `\nField Coverage for ${entityType.toUpperCase()}: ${entityId}`,
      );
      console.log("=".repeat(50));

      console.log(`Memory: ${coverage.memory.length.toString()} fields`);
      if (coverage.memory.length > 0) {
        console.log(`  ${coverage.memory.join(", ")}`);
      }

      console.log(
        `Local Storage: ${coverage.localStorage.length.toString()} fields`,
      );
      if (coverage.localStorage.length > 0) {
        console.log(`  ${coverage.localStorage.join(", ")}`);
      }

      console.log(`IndexedDB: ${coverage.indexedDB.length.toString()} fields`);
      if (coverage.indexedDB.length > 0) {
        console.log(`  ${coverage.indexedDB.join(", ")}`);
      }

      console.log(`Static Data: ${coverage.static.length.toString()} fields`);
      if (coverage.static.length > 0) {
        console.log(`  ${coverage.static.join(", ")}`);
      }

      console.log(`\nTotal Unique Fields: ${coverage.total.length.toString()}`);
    }
  });

program
  .command("cache:popular-entities <entity-type>")
  .description("Show well-populated entities with extensive field coverage")
  .option("-l, --limit <limit>", "Limit results", "10")
  .option("-f, --format <format>", "Output format (json, table)", "table")
  .action(async (entityType: string, options: unknown) => {
    const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType);
    if (!entityTypeValidation.success) {
      console.error(`Unsupported entity type: ${entityType}`);
      console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
      process.exit(1);
    }

    const optionsValidation =
      CachePopularEntitiesCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const validatedOptions = optionsValidation.data;
    const limit =
      typeof validatedOptions.limit === "string"
        ? parseInt(validatedOptions.limit, 10)
        : 10;
    const entities = await cli.getWellPopulatedEntities(
      entityTypeValidation.data,
      limit,
    );

    if (validatedOptions.format === "json") {
      console.log(JSON.stringify(entities, null, 2));
    } else {
      console.log(
        `\nWell-Populated ${entityType.toUpperCase()} Entities (${entities.length.toString()}):`,
      );
      console.log("=".repeat(50));

      entities.forEach((entity, index) => {
        console.log(
          `${(index + 1).toString().padStart(3)}: ${entity.entityId} (${entity.fieldCount.toString()} fields)`,
        );
        if (entity.fields.length > 0) {
          const displayFields = entity.fields.slice(0, 5);
          const extraCount = entity.fields.length - displayFields.length;
          const fieldsText = displayFields.join(", ");
          const suffix =
            extraCount > 0 ? ` +${extraCount.toString()} more` : "";
          console.log(`     Fields: ${fieldsText}${suffix}`);
        }
      });
    }
  });

program
  .command("cache:popular-collections")
  .description("Show popular cached collections with high entity counts")
  .option("-l, --limit <limit>", "Limit results", "10")
  .option("-f, --format <format>", "Output format (json, table)", "table")
  .action(async (options: unknown) => {
    const optionsValidation =
      CachePopularCollectionsCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const validatedOptions = optionsValidation.data;
    const limit =
      typeof validatedOptions.limit === "string"
        ? parseInt(validatedOptions.limit, 10)
        : 10;
    const collections = await cli.getPopularCollections(limit);

    if (validatedOptions.format === "json") {
      console.log(JSON.stringify(collections, null, 2));
    } else {
      console.log(
        `\nPopular Cached Collections (${collections.length.toString()}):`,
      );
      console.log("=".repeat(50));

      collections.forEach((collection, index) => {
        console.log(
          `${(index + 1).toString().padStart(3)}: ${collection.queryKey}`,
        );
        console.log(
          `     Entities: ${collection.entityCount.toString()}, Pages: ${collection.pageCount.toString()}`,
        );
      });
    }
  });

program
  .command("cache:clear")
  .description("Clear all synthetic cache data (memory, collections)")
  .option("--confirm", "Skip confirmation prompt")
  .action(async (options: unknown) => {
    const optionsValidation = CacheClearCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const validatedOptions = optionsValidation.data;
    if (!validatedOptions.confirm) {
      console.log("This will clear all synthetic cache data including:");
      console.log("- Entity field accumulations in memory");
      console.log("- Collection result mappings");
      console.log("- Performance metrics");
      console.log("");
      console.log("Static data cache files will NOT be affected.");
      console.log("");
      console.log("To confirm, run: pnpm cli cache:clear --confirm");
      return;
    }

    await cli.clearSyntheticCache();
    console.log("Synthetic cache cleared successfully.");
  });

// Static cache management commands
program
  .command("cache:generate-static")
  .description("Generate static cache with environment-aware operations")
  .option("--entity-type <type>", "Generate for specific entity type only")
  .option("--limit <limit>", "Limit number of entities to generate")
  .option("--force", "Force regeneration even if files exist")
  .option("--dry-run", "Show what would be generated without writing files")
  .option("-f, --format <format>", "Output format (json, table)", "table")
  .action(async (options: unknown) => {
    const optionsValidation =
      CacheGenerateStaticCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const validatedOptions = optionsValidation.data;
    let entityType: StaticEntityType | undefined;

    if (validatedOptions.entityType) {
      const entityTypeValidation = StaticEntityTypeSchema.safeParse(
        validatedOptions.entityType,
      );
      if (!entityTypeValidation.success) {
        console.error(
          `Unsupported entity type: ${validatedOptions.entityType}`,
        );
        console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
        process.exit(1);
      }
      entityType = entityTypeValidation.data;
    }

    const config = staticCacheManager.getConfig();
    console.log(`\nStatic Cache Generation (${config.mode} mode):`);
    console.log("=".repeat(50));

    if (config.mode === "production") {
      console.error("Error: Cannot generate static cache in production mode");
      console.error("Set NODE_ENV=development to enable cache generation");
      process.exit(1);
    }

    try {
      const limit = validatedOptions.limit
        ? parseInt(validatedOptions.limit)
        : undefined;
      const generateOptions = {
        entityTypes: entityType ? [entityType] : undefined,
        limit,
        force: !!validatedOptions.force,
        dryRun: !!validatedOptions.dryRun,
      };

      await staticCacheManager.generateStaticCache(generateOptions);

      console.log(
        `\nGeneration ${validatedOptions.dryRun ? "(Dry Run) " : ""}completed successfully`,
      );

      if (!validatedOptions.dryRun) {
        console.log(
          "Run 'pnpm cli cache:validate-static' to verify the generated cache",
        );
      }
    } catch (error) {
      console.error(
        `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });

program
  .command("cache:validate-static")
  .description("Validate static cache integrity and structure")
  .option("-f, --format <format>", "Output format (json, table)", "table")
  .option("--verbose", "Show detailed validation information")
  .action(async (options: unknown) => {
    const optionsValidation =
      CacheValidateStaticCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const validatedOptions = optionsValidation.data;
    const config = staticCacheManager.getConfig();

    console.log(`\nStatic Cache Validation (${config.mode} mode):`);
    console.log("=".repeat(50));

    try {
      const validation = await staticCacheManager.validateCache();

      if (validatedOptions.format === "json") {
        console.log(JSON.stringify(validation, null, 2));
      } else {
        console.log(`Status: ${validation.isValid ? "✓ VALID" : "✗ INVALID"}`);
        console.log(`Errors: ${validation.errors.length.toString()}`);
        console.log(`Warnings: ${validation.warnings.length.toString()}`);
        console.log(
          `Corrupted Files: ${validation.corruptedFiles.length.toString()}`,
        );
        console.log(
          `Missing Indexes: ${validation.missingIndexes.length.toString()}`,
        );
      }

      if (validatedOptions.verbose || !validation.isValid) {
        if (validation.errors.length > 0) {
          console.log("\nErrors:");
          validation.errors.forEach((error, index) => {
            console.log(`  ${(index + 1).toString()}. ${error}`);
          });
        }

        if (validation.warnings.length > 0) {
          console.log("\nWarnings:");
          validation.warnings.forEach((warning, index) => {
            console.log(`  ${(index + 1).toString()}. ${warning}`);
          });
        }

        if (validation.corruptedFiles.length > 0) {
          console.log("\nCorrupted Files:");
          validation.corruptedFiles.forEach((file, index) => {
            console.log(`  ${(index + 1).toString()}. ${file}`);
          });
        }
      }

      console.log("\nEntity Counts:");
      Object.entries(validation.entityCounts).forEach(([entityType, count]) => {
        console.log(`  ${entityType}: ${count.toString()}`);
      });
    } catch (error) {
      console.error(
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });

program
  .command("cache:clear-static")
  .description("Clear static cache data")
  .option("--entity-type <type>", "Clear only specific entity type")
  .option("--confirm", "Skip confirmation prompt")
  .action(async (options: unknown) => {
    const optionsValidation =
      CacheClearStaticCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const validatedOptions = optionsValidation.data;
    const config = staticCacheManager.getConfig();

    if (config.mode === "production") {
      console.error("Error: Cannot clear static cache in production mode");
      console.error("Set NODE_ENV=development to enable cache clearing");
      process.exit(1);
    }

    let entityTypes: StaticEntityType[] | undefined;
    if (validatedOptions.entityType) {
      const entityTypeValidation = StaticEntityTypeSchema.safeParse(
        validatedOptions.entityType,
      );
      if (!entityTypeValidation.success) {
        console.error(
          `Unsupported entity type: ${validatedOptions.entityType}`,
        );
        console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
        process.exit(1);
      }
      entityTypes = [entityTypeValidation.data];
    }

    if (!validatedOptions.confirm) {
      console.log("This will clear static cache data including:");
      if (entityTypes) {
        console.log(`- Entity data for: ${entityTypes.join(", ")}`);
      } else {
        console.log("- All entity data files");
        console.log("- All index files");
        console.log("- All query cache files");
      }
      console.log("");
      console.log("To confirm, run with --confirm flag");
      return;
    }

    try {
      await staticCacheManager.clearStaticCache(entityTypes);
      const targetDesc = entityTypes
        ? entityTypes.join(", ")
        : "all entity types";
      console.log(`Static cache cleared successfully for: ${targetDesc}`);
    } catch (error) {
      console.error(
        `Clear operation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });

program
  .command("static:analyze")
  .description(
    "Analyze static data cache usage patterns and suggest optimizations",
  )
  .option("-f, --format <format>", "Output format (json, table)", "table")
  .action(async (options: unknown) => {
    const optionsValidation =
      StaticAnalyzeCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const validatedOptions = optionsValidation.data;
    const analysis = await cli.analyzeStaticDataUsage();

    if (validatedOptions.format === "json") {
      console.log(JSON.stringify(analysis, null, 2));
    } else {
      console.log("\nStatic Data Cache Analysis:");
      console.log("=".repeat(50));

      console.log("Entity Type Distribution:");
      Object.entries(analysis.entityDistribution).forEach(([type, count]) => {
        console.log(
          `  ${type.padEnd(12)}: ${count.toString().padStart(4)} entities`,
        );
      });

      console.log(
        `\nTotal Static Entities: ${analysis.totalEntities.toString()}`,
      );
      console.log(
        `Cache Hit Potential: ${(analysis.cacheHitPotential * 100).toFixed(1)}%`,
      );
      console.log(
        `Recommended for Generation: ${analysis.recommendedForGeneration.length.toString()} entity types`,
      );

      if (analysis.recommendedForGeneration.length > 0) {
        console.log(`  ${analysis.recommendedForGeneration.join(", ")}`);
      }

      if (analysis.gaps.length > 0) {
        console.log(`\nIdentified Gaps: ${analysis.gaps.length.toString()}`);
        analysis.gaps.slice(0, 5).forEach((gap, index) => {
          console.log(`  ${(index + 1).toString().padStart(2)}: ${gap}`);
        });
        if (analysis.gaps.length > 5) {
          console.log(
            `     +${(analysis.gaps.length - 5).toString()} more gaps identified`,
          );
        }
      }
    }
  });

program
  .command("static:generate")
  .description("Generate optimized static data cache from usage patterns")
  .option("--entity-type <type>", "Generate for specific entity type only")
  .option("--dry-run", "Show what would be generated without writing files")
  .option("--force", "Force regeneration even if files exist")
  .action(async (options: unknown) => {
    const optionsValidation =
      StaticGenerateCommandOptionsSchema.safeParse(options);
    if (!optionsValidation.success) {
      console.error(`Invalid options: ${optionsValidation.error.message}`);
      process.exit(1);
    }

    const validatedOptions = optionsValidation.data;
    let entityType: StaticEntityType | undefined;

    if (validatedOptions.entityType) {
      const entityTypeValidation = StaticEntityTypeSchema.safeParse(
        validatedOptions.entityType,
      );
      if (!entityTypeValidation.success) {
        console.error(
          `Unsupported entity type: ${validatedOptions.entityType}`,
        );
        console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`);
        process.exit(1);
      }
      entityType = entityTypeValidation.data;
    }

    const result = await cli.generateStaticDataFromPatterns(entityType, {
      dryRun: !!validatedOptions.dryRun,
      force: !!validatedOptions.force,
    });

    console.log(
      `\nStatic Data Generation ${validatedOptions.dryRun ? "(Dry Run)" : "Completed"}:`,
    );
    console.log("=".repeat(50));

    console.log(
      `Files ${validatedOptions.dryRun ? "would be" : ""} processed: ${result.filesProcessed.toString()}`,
    );
    console.log(
      `Entities ${validatedOptions.dryRun ? "would be" : ""} cached: ${result.entitiesCached.toString()}`,
    );
    console.log(
      `Queries ${validatedOptions.dryRun ? "would be" : ""} cached: ${result.queriesCached.toString()}`,
    );

    if (result.errors.length > 0) {
      console.log(`\nErrors encountered: ${result.errors.length.toString()}`);
      result.errors.slice(0, 3).forEach((error, index) => {
        console.log(`  ${(index + 1).toString().padStart(2)}: ${error}`);
      });
      if (result.errors.length > 3) {
        console.log(
          `     +${(result.errors.length - 3).toString()} more errors`,
        );
      }
    }

    if (!validatedOptions.dryRun && result.filesProcessed > 0) {
      console.log(
        `\nStatic data cache updated. Run 'pnpm cli static:analyze' to verify.`,
      );
    }
  });

// Parse and execute
program.parse();
