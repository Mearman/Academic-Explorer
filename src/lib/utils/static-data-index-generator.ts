import { readdir, writeFile, stat, mkdir, readFile } from "fs/promises";
import { join, extname, basename } from "path";
import { downloadEntityFromOpenAlex, findMissingEntities, downloadMultipleEntities } from "./openalex-downloader";
// parseQueryParams and generateQueryHash removed - no longer needed
import { fetchOpenAlexQuery, saveQueryToCache } from "./query-cache-builder";
import { createContentHash, hasContentChanged } from "./content-hash";

/**
 * Type guard to check if value is a record
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export interface FileMetadata {
  id: string;
  size: number;
  lastModified: string;
}

export interface QueryMetadata {
  queryHash: string;
  url: string;
  params: Record<string, unknown>;
  resultCount: number;
  size: number;
  lastModified: string;
}

export interface StaticDataIndex {
  entityType: string;
  count: number;
  lastModified: string;
  contentHash: string;
  entities: string[];
  queries?: QueryMetadata[];
  metadata: {
    totalSize: number;
    files: FileMetadata[];
  };
}

// generateQueryHash export removed - no longer available

/**
 * Generate index file for a specific entity type directory
 */
export async function generateIndexForEntityType(
  entityDir: string,
  entityType: string
): Promise<void> {
  try {
    // Get all JSON files in the entity directory (excluding index.json)
    const files = await readdir(entityDir);
    const jsonFiles = files.filter(file =>
      extname(file) === ".json" && basename(file) !== "index.json"
    );

    // Separate entity files from query files
    const entityFiles = jsonFiles.filter(file => {
      const fileName = basename(file, ".json");
      // Entity files have OpenAlex ID pattern (letter + numbers)
      return /^[WASITCPFKG]\d+$/i.test(fileName);
    });

    const queryFiles = jsonFiles.filter(file => {
      const fileName = basename(file, ".json");
      // Query files have hash pattern (16 hex characters)
      return /^[a-f0-9]{16}$/i.test(fileName);
    });

    if (entityFiles.length === 0 && queryFiles.length === 0) {
      console.log(`⚠️  No JSON files found in ${entityType} directory`);
      return;
    }

    // Extract entity IDs from filenames (remove .json extension)
    const entityIds = entityFiles.map(file => basename(file, ".json"));

    // Get file stats for entity files
    const fileStats: FileMetadata[] = await Promise.all(
      entityFiles.map(async (file): Promise<FileMetadata> => {
        const filePath = join(entityDir, file);
        const stats = await stat(filePath);
        return {
          id: basename(file, ".json"),
          size: stats.size,
          lastModified: stats.mtime.toISOString()
        };
      })
    );

    // Process query files to extract metadata
    const queryStats: QueryMetadata[] = await Promise.all(
      queryFiles.map(async (file): Promise<QueryMetadata> => {
        const filePath = join(entityDir, file);
        const stats = await stat(filePath);
        const queryHash = basename(file, ".json");

        // Try to read the query file to extract URL and result count
        let url = "";
        let params: Record<string, unknown> = {};
        let resultCount = 0;

        try {
          const content = JSON.parse(await readFile(filePath, "utf-8"));
          if (content.meta && content.meta.originalUrl) {
            url = content.meta.originalUrl;
            // Extract query parameters from URL
            try {
              const urlObj = new URL(url);
              params = Object.fromEntries(urlObj.searchParams);
            } catch {
              params = {};
            }
          }
          if (content.results && Array.isArray(content.results)) {
            resultCount = content.results.length;
          }
        } catch {
          // If we can't parse the file, use defaults
        }

        return {
          queryHash,
          url,
          params,
          resultCount,
          size: stats.size,
          lastModified: stats.mtime.toISOString()
        };
      })
    );

    // Create preliminary index content without timestamp and hash
    const preliminaryIndexContent = {
      entityType,
      count: entityIds.length,
      entities: entityIds.sort(), // Sorted for consistent output
      queries: queryStats.length > 0 ? queryStats.sort((a, b) => a.queryHash.localeCompare(b.queryHash)) : undefined,
      metadata: {
        totalSize: fileStats.reduce((sum, file) => sum + file.size, 0) + queryStats.reduce((sum, query) => sum + query.size, 0),
        files: fileStats.sort((a, b) => a.id.localeCompare(b.id))
      }
    };

    // Generate content hash based on static fields only
    const newContentHash = createContentHash(preliminaryIndexContent);

    // Check if content has actually changed by comparing hashes
    const indexPath = join(entityDir, "index.json");
    let existingContentHash: string | undefined;
    let existingTimestamp: string | undefined;

    try {
      const existingContent = await readFile(indexPath, "utf-8");
      const existingData = JSON.parse(existingContent);
      existingContentHash = existingData.contentHash;
      existingTimestamp = existingData.lastModified;
    } catch {
      // File doesn't exist or can't be read
      existingContentHash = undefined;
      existingTimestamp = undefined;
    }

    // Determine if we need to update the timestamp
    const contentChanged = hasContentChanged({ currentHash: existingContentHash, newHash: newContentHash });
    const timestamp = contentChanged ? new Date().toISOString() : (existingTimestamp ?? new Date().toISOString());

    // Create final index content with hash and appropriate timestamp
    const indexContent: StaticDataIndex = {
      ...preliminaryIndexContent,
      lastModified: timestamp,
      contentHash: newContentHash
    };

    // Only write if content has changed
    if (contentChanged) {
      // Use a custom replacer to ensure consistent key ordering at all levels including root
      const newContent = JSON.stringify(indexContent, (key, value: unknown) => {
        if (isRecord(value)) {
          // Sort object keys for consistent output (including root object)
          const sortedObj: Record<string, unknown> = {};
          Object.keys(value).sort().forEach(sortedKey => {
            sortedObj[sortedKey] = value[sortedKey];
          });
          return sortedObj;
        }
        return value;
      }, 2);
      await writeFile(indexPath, newContent);
    }

    const queryMessage = queryStats.length > 0 ? ` and ${queryStats.length} queries` : "";
    const statusMessage = contentChanged ? "Updated" : "Unchanged";
    console.log(`✅ ${statusMessage} ${entityType}/index.json with ${entityIds.length} entities${queryMessage} (hash: ${newContentHash.substring(0, 8)}...)`);
  } catch (error) {
    console.error(`❌ Error generating index for ${entityType}:`, error);
  }
}

/**
 * Generate all static data indexes with optional auto-download
 */
export async function generateAllIndexes(
  staticDataDir: string,
  options: { autoDownload?: boolean } = {}
): Promise<void> {
  try {
    const entityTypes = await readdir(staticDataDir, { withFileTypes: true });
    const directories = entityTypes.filter(dirent => dirent.isDirectory());

    console.log(`📁 Found ${directories.length} entity type directories`);

    for (const dir of directories) {
      const entityType = dir.name;
      const entityDir = join(staticDataDir, entityType);
      await generateIndexForEntityType(entityDir, entityType);

      // Auto-download missing entities and queries if enabled
      if (options.autoDownload) {
        await downloadMissingEntities(entityType, entityDir, staticDataDir);
        await downloadMissingQueries(entityType, entityDir);
      }
    }

    console.log("🎉 Static data indexes generated successfully");
  } catch (error) {
    console.error("❌ Error generating static data indexes:", error);
    throw error;
  }
}

/**
 * Download missing entities for a specific entity type
 */
export async function downloadMissingEntities(
  entityType: string,
  entityDir: string,
  staticDataDir: string
): Promise<void> {
  try {
    // Check if we have an existing index to determine what entities should exist
    const indexPath = join(entityDir, "index.json");
    let expectedEntities: string[] = [];

    try {
      await stat(indexPath);
      const indexContent = JSON.parse(await readFile(indexPath, "utf-8"));
      expectedEntities = indexContent.entities || [];
    } catch {
      // No existing index, nothing to check
      return;
    }

    if (expectedEntities.length === 0) {
      return;
    }

    // Find missing entities
    const missingEntities = await findMissingEntities(entityType, expectedEntities, staticDataDir);

    if (missingEntities.length === 0) {
      console.log(`✅ All ${entityType} entities are present`);
      return;
    }

    console.log(`🔄 Found ${missingEntities.length} missing ${entityType} entities, downloading...`);

    // Download missing entities
    const { downloaded, failed } = await downloadMultipleEntities(entityType, missingEntities, staticDataDir);

    if (downloaded > 0) {
      console.log(`✅ Downloaded ${downloaded} missing ${entityType} entities`);

      // Regenerate index after downloading
      await generateIndexForEntityType(entityDir, entityType);
    }

    if (failed > 0) {
      console.warn(`⚠️  Failed to download ${failed} ${entityType} entities`);
    }
  } catch (error) {
    console.error(`❌ Error downloading missing ${entityType} entities:`, error);
  }
}

/**
 * Download missing query results for a specific entity type
 */
export async function downloadMissingQueries(
  entityType: string,
  entityDir: string
): Promise<void> {
  try {
    // Check if we have an existing index with query definitions
    const indexPath = join(entityDir, "index.json");
    let expectedQueries: QueryMetadata[] = [];

    try {
      await stat(indexPath);
      const indexContent = JSON.parse(await readFile(indexPath, "utf-8"));
      expectedQueries = indexContent.queries || [];
    } catch {
      // No existing index, nothing to check
      return;
    }

    if (expectedQueries.length === 0) {
      return;
    }

    // Find missing query result files
    const missingQueries: QueryMetadata[] = [];

    for (const query of expectedQueries) {
      const queryFilePath = join(entityDir, `${query.queryHash}.json`);
      try {
        await stat(queryFilePath);
        // File exists, skip
      } catch {
        // File doesn't exist, needs to be downloaded
        missingQueries.push(query);
      }
    }

    if (missingQueries.length === 0) {
      console.log(`✅ All ${entityType} query results are present`);
      return;
    }

    console.log(`🔄 Found ${missingQueries.length} missing ${entityType} query results, downloading...`);

    let downloaded = 0;
    let failed = 0;

    // Download missing query results
    for (const query of missingQueries) {
      try {
        if (!query.url) {
          console.warn(`⚠️  Query ${query.queryHash} has no URL, skipping`);
          failed++;
          continue;
        }

        console.log(`📥 Downloading query: ${query.url}`);

        const results = await fetchOpenAlexQuery(query.url);
        await saveQueryToCache(entityType, query.url, results, {
          outputDir: join(entityDir, ".."),
        });

        downloaded++;
        console.log(`✅ Downloaded query result: ${query.queryHash}`);
      } catch (error) {
        failed++;
        console.error(`❌ Failed to download query ${query.queryHash}:`, error);
      }
    }

    if (downloaded > 0) {
      console.log(`✅ Downloaded ${downloaded} missing ${entityType} query results`);

      // Regenerate index after downloading queries
      await generateIndexForEntityType(entityDir, entityType);
    }

    if (failed > 0) {
      console.warn(`⚠️  Failed to download ${failed} ${entityType} query results`);
    }
  } catch (error) {
    console.error(`❌ Error downloading missing ${entityType} query results:`, error);
  }
}

/**
 * Generate index with auto-download for a specific entity type
 */
export async function generateIndexWithAutoDownload(
  entityDir: string,
  entityType: string,
  staticDataDir: string
): Promise<void> {
  // Generate initial index
  await generateIndexForEntityType(entityDir, entityType);

  // Download missing entities
  await downloadMissingEntities(entityType, entityDir, staticDataDir);

  // Download missing queries
  await downloadMissingQueries(entityType, entityDir);
}