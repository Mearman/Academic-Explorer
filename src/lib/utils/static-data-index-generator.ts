import { readdir, writeFile, stat, mkdir, readFile } from "fs/promises";
import { join, extname, basename } from "path";
import { downloadEntityFromOpenAlex, findMissingEntities, downloadMultipleEntities } from "./openalex-downloader";
import { parseQueryParams, generateQueryHash } from "./query-hash";

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
  lastGenerated: string;
  entities: string[];
  queries?: QueryMetadata[];
  metadata: {
    totalSize: number;
    files: FileMetadata[];
  };
}

/**
 * Generate a hash for a query URL to use as filename
 * Uses the unified hash function from query-hash.ts
 */
export { generateQueryHash } from "./query-hash";

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
            params = parseQueryParams(url);
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

    // Create index content
    const indexContent: StaticDataIndex = {
      entityType,
      count: entityIds.length,
      lastGenerated: new Date().toISOString(),
      entities: entityIds.sort(), // Sorted for consistent output
      queries: queryStats.length > 0 ? queryStats.sort((a, b) => a.queryHash.localeCompare(b.queryHash)) : undefined,
      metadata: {
        totalSize: fileStats.reduce((sum, file) => sum + file.size, 0) + queryStats.reduce((sum, query) => sum + query.size, 0),
        files: fileStats.sort((a, b) => a.id.localeCompare(b.id))
      }
    };

    // Write index file
    const indexPath = join(entityDir, "index.json");
    await writeFile(indexPath, JSON.stringify(indexContent, null, 2));

    const queryMessage = queryStats.length > 0 ? ` and ${queryStats.length} queries` : "";
    console.log(`✅ Generated ${entityType}/index.json with ${entityIds.length} entities${queryMessage}`);
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

      // Auto-download missing entities if enabled
      if (options.autoDownload) {
        await downloadMissingEntities(entityType, entityDir, staticDataDir);
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
}