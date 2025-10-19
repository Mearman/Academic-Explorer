import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join, relative } from "path";
import {
  generateContentHash,
  parseOpenAlexUrl,
  decodeFilename,
  filenameToQuery,
  hasCollision,
  mergeCollision,
  reconstructPossibleCollisions,
  validateFileEntry,
  migrateToMultiUrl,
  sanitizeUrlForCaching,
  type DirectoryIndex,
  type FileEntry,
  type DirectoryEntry,
  type EntityType,
  type CollisionInfo,
} from "../../../packages/utils/src/static-data/cache-utilities";
import type { CacheContext } from "./types";

/**
 * Check if directory index has changed before writing
 */
export const hasIndexChanged = (
  oldIndex: DirectoryIndex | null,
  newIndex: DirectoryIndex,
): boolean => {
  if (!oldIndex) {
    return true; // No existing index, needs update
  }

  // Compare key fields that would indicate a change
  return (
    oldIndex.lastUpdated !== newIndex.lastUpdated ||
    JSON.stringify(oldIndex.files) !== JSON.stringify(newIndex.files) ||
    JSON.stringify(oldIndex.directories) !==
      JSON.stringify(newIndex.directories) ||
    JSON.stringify(oldIndex.aggregatedCollisions) !==
      JSON.stringify(newIndex.aggregatedCollisions)
  );
};

/**
 * Aggregate metadata from child directories
 */
export const aggregateFromChildren = async (
  dir: string,
): Promise<{
  lastUpdated: string;
  aggregatedCollisions?: {
    totalMerged: number;
    lastCollision?: string;
    totalWithCollisions: number;
  };
}> => {
  try {
    const indexPath = join(dir, "index.json");
    if (!existsSync(indexPath)) {
      return { lastUpdated: new Date().toISOString() };
    }

    const indexContent = await readFile(indexPath, "utf-8");
    const index: DirectoryIndex = JSON.parse(indexContent);

    let maxLastUpdated = index.lastUpdated || new Date().toISOString();

    let totalMerged = 0;
    let maxLastMerge: string | undefined;
    let totalWithCollisions = 0;

    // Aggregate from current index if it has aggregatedCollisions
    if (index.aggregatedCollisions) {
      totalMerged += index.aggregatedCollisions.totalMerged;
      totalWithCollisions += index.aggregatedCollisions.totalWithCollisions;
      if (
        index.aggregatedCollisions.lastCollision &&
        (!maxLastMerge ||
          index.aggregatedCollisions.lastCollision > maxLastMerge)
      ) {
        maxLastMerge = index.aggregatedCollisions.lastCollision;
      }
    }

    // Aggregate from subdirectories
    if (index.directories) {
      for (const [dirName, dirInfo] of Object.entries(index.directories)) {
        const childDirPath = join(dir, dirName);
        const childIndexPath = join(childDirPath, "index.json");

        if (existsSync(childIndexPath)) {
          try {
            const childIndexContent = await readFile(childIndexPath, "utf-8");
            const childIndex: DirectoryIndex = JSON.parse(childIndexContent);

            // Track the maximum lastUpdated timestamp
            if (
              childIndex.lastUpdated &&
              childIndex.lastUpdated > maxLastUpdated
            ) {
              maxLastUpdated = childIndex.lastUpdated;
            }

            // Aggregate collisions from child
            if (childIndex.aggregatedCollisions) {
              totalMerged += childIndex.aggregatedCollisions.totalMerged;
              totalWithCollisions +=
                childIndex.aggregatedCollisions.totalWithCollisions;
              if (
                childIndex.aggregatedCollisions.lastCollision &&
                (!maxLastMerge ||
                  childIndex.aggregatedCollisions.lastCollision > maxLastMerge)
              ) {
                maxLastMerge = childIndex.aggregatedCollisions.lastCollision;
              }
            }
          } catch (error) {
            console.error(
              `[openalex-cache] Failed to read child index ${childIndexPath}: ${error}`,
            );
          }
        }
      }
    }

    const aggregatedCollisions =
      totalMerged > 0
        ? { totalMerged, lastCollision: maxLastMerge, totalWithCollisions }
        : undefined;

    return { lastUpdated: maxLastUpdated, aggregatedCollisions };
  } catch (error) {
    console.error(
      `[openalex-cache] Failed to aggregate from children in ${dir}: ${error}`,
    );
    return { lastUpdated: new Date().toISOString() };
  }
};

/**
 * Update a single directory index file with aggregation support
 */
export const updateDirectoryIndexWithAggregation = async (
  dirPath: string,
  triggerUrl: string,
  newFileName?: string,
  retrieved_at?: string,
  contentHash?: string,
  aggregated?: {
    lastUpdated: string;
    aggregatedCollisions?: {
      totalMerged: number;
      lastCollision?: string;
      totalWithCollisions: number;
    };
  },
  context?: CacheContext,
): Promise<void> => {
  let migratedCount = 0;
  let collisionsDetected = 0;
  try {
    const indexPath = join(dirPath, "index.json");
    const { readdirSync, statSync } = await import("fs");

    // Read existing index using unified structure
    let index: DirectoryIndex = {
      lastUpdated: new Date().toISOString(),
    };

    if (existsSync(indexPath)) {
      try {
        const indexContent = await readFile(indexPath, "utf-8");
        const existingIndex = JSON.parse(indexContent);
        index = { ...index, ...existingIndex };
      } catch {
        // Index doesn't exist or is invalid, use fresh structure
      }
    }

    // Scan directory contents
    const items = readdirSync(dirPath);

    // Reset files and directories
    index.files = {};
    index.directories = {};

    for (const item of items) {
      if (item === "index.json") continue; // Skip the index file itself

      const itemPath = join(dirPath, item);
      const stats = statSync(itemPath);
      const relativePath = `./${item}`;

      if (stats.isDirectory()) {
        const directoryEntry: DirectoryEntry = {
          $ref: relativePath,
          lastModified: stats.mtime.toISOString(),
        };
        index.directories[item] = directoryEntry;
      } else if (item.endsWith(".json")) {
        let file_lastRetrieved: string = stats.mtime.toISOString();
        let file_contentHash: string | undefined;

        // Use provided metadata if this is the newly cached file
        if (
          newFileName &&
          item === newFileName &&
          retrieved_at &&
          contentHash
        ) {
          file_lastRetrieved = retrieved_at;
          file_contentHash = contentHash;
        } else {
          // Try to read cache entry metadata for backwards compatibility
          try {
            const fileContent = await readFile(itemPath, "utf-8");
            const cacheEntry = JSON.parse(fileContent);

            // Extract metadata from old cache format (wrapped)
            if (cacheEntry.retrieved_at) {
              file_lastRetrieved = cacheEntry.retrieved_at;
            }
            if (cacheEntry.contentHash) {
              file_contentHash = cacheEntry.contentHash;
            }
            // For new cache format (raw data), generate content hash if not provided
            if (!file_contentHash) {
              file_contentHash = await generateContentHash(cacheEntry);
            }
          } catch {
            // Skip files that can't be read or parsed - use file system time
          }
        }

        // Use base name without .json extension as the key
        const baseName = item.replace(/\.json$/, "");

        let fileEntry: FileEntry;

        // Check for existing entry to migrate
        const existingEntry = index.files?.[baseName];
        if (existingEntry) {
          if (!("equivalentUrls" in existingEntry)) {
            fileEntry = migrateToMultiUrl(existingEntry);
            migratedCount++;
            if (context?.verbose) {
              console.log(
                `[openalex-cache] Migrated legacy entry for ${baseName} in ${dirPath}`,
              );
            }
          } else {
            fileEntry = { ...existingEntry };
          }
        } else {
          // New entry
          fileEntry = {
            url: "",
            $ref: relativePath,
            lastRetrieved: file_lastRetrieved,
            contentHash: file_contentHash || "unknown",
          };
        }

        let primaryUrl = "";
        try {
          if (dirPath.includes("/queries")) {
            // RECONSTRUCTION LOGIC: For query files in /queries/, reconstruct the canonical URL
            // from the encoded filename. This reverses the normalization process (decodeFilename
            // + filenameToQuery) to get the original query parameters, then builds the primary
            // OpenAlex URL. Apply sanitizeUrlForCaching to ensure consistent normalization.
            // This is crucial for populating FileEntry.url and enabling collision detection
            // for existing cache files without requiring new requests.
            const relativeDirPath = context?.staticDataDir
              ? relative(context.staticDataDir, dirPath)
              : dirPath;
            const pathSegments = relativeDirPath
              .split(/[\\/]/)
              .filter((segment) => segment.length > 0);
            const queriesIndex = pathSegments.lastIndexOf("queries");
            const resourceSegments =
              queriesIndex >= 0
                ? pathSegments.slice(0, queriesIndex)
                : pathSegments;
            const entityTypeStr = resourceSegments[0] ?? "";
            const entityType = entityTypeStr as EntityType;
            // Check if this is a hash-based filename (can't reconstruct URL from it)
            if (/^q_[a-f0-9]{16}$/.test(baseName)) {
              logger.debug(
                "cache",
                "Skipping reconstruction for hash-based filename",
                {
                  filename: baseName,
                },
              );
              // Skip this file - it will be handled by index migration if needed
              continue;
            }

            // Decode filename to get original query params
            const decodedQuery = decodeFilename(baseName);
            const queryParams = filenameToQuery(decodedQuery);
            const resourcePath = resourceSegments.join("/");
            const reconstructedUrl =
              resourcePath.length > 0
                ? `https://api.openalex.org/${resourcePath}${queryParams}`
                : `https://api.openalex.org${queryParams}`;
            // Apply normalization to ensure consistency with runtime caching
            const normalizedPath = sanitizeUrlForCaching(
              new URL(reconstructedUrl).pathname +
                new URL(reconstructedUrl).search,
            );
            primaryUrl = `https://api.openalex.org${normalizedPath}`;

            // Ensure migrated to multi-URL format for collision support
            fileEntry = migrateToMultiUrl(fileEntry);
            fileEntry.url = primaryUrl;

            // COLLISION MERGING: Proactively infer and merge possible colliding URLs
            // using reconstructPossibleCollisions. This populates equivalentUrls with
            // variations (e.g., with api_key or mailto params) that would normalize to
            // the same filename, improving cache efficiency and debugging capabilities.
            // Only merges if hasCollision confirms path equivalence.
            const possibleUrls = reconstructPossibleCollisions(
              baseName,
              entityType,
            );
            let mergedThisEntry = 0;
            for (const possibleUrl of possibleUrls) {
              if (
                possibleUrl !== primaryUrl &&
                hasCollision(fileEntry, possibleUrl)
              ) {
                fileEntry = mergeCollision(fileEntry, possibleUrl);
                mergedThisEntry++;
              }
            }
            if (mergedThisEntry > 0) {
              collisionsDetected++;
            }

            // Ensure equivalentUrls[0] === url for consistency (primary URL first)
            fileEntry.equivalentUrls![0] = primaryUrl;
          } else {
            // Non-query: single entity or collection (e.g., /authors/A123.json)
            // Reconstruction is simpler: just prepend entity type and ID to base URL.
            // Apply normalization for consistency even though no query params expected.
            const relativeDirPath = context?.staticDataDir
              ? relative(context.staticDataDir, dirPath)
              : dirPath;
            const pathSegments = relativeDirPath
              .split(/[\\/]/)
              .filter((segment) => segment.length > 0);
            if (pathSegments.length >= 1) {
              const resourceSegments = [...pathSegments, baseName];
              const reconstructedUrl = `https://api.openalex.org/${resourceSegments.join("/")}`;
              // Apply normalization for consistency (will be no-op for paths without query params)
              const normalizedPath = sanitizeUrlForCaching(
                new URL(reconstructedUrl).pathname +
                  new URL(reconstructedUrl).search,
              );
              primaryUrl = `https://api.openalex.org${normalizedPath}`;
              fileEntry.url = primaryUrl;
              fileEntry = migrateToMultiUrl(fileEntry);
              // For non-queries, typically no additional collisions
            }
          }

          // Validate the reconstructed entry to catch any inconsistencies
          if (!(await validateFileEntry(fileEntry))) {
            if (context?.verbose) {
              console.log(
                `[openalex-cache] Validation failed for ${baseName} in ${dirPath}, falling back to simple entry`,
              );
            }
            fileEntry = {
              url: primaryUrl,
              $ref: relativePath,
              lastRetrieved: file_lastRetrieved,
              contentHash: file_contentHash || "unknown",
            };
          }
        } catch (error) {
          if (context?.verbose) {
            console.log(
              `[openalex-cache] Reconstruction failed for ${item} in ${dirPath}: ${error}`,
            );
          }
          // Fallback to simple entry without multi-URL features
          fileEntry = {
            url: primaryUrl,
            $ref: relativePath,
            lastRetrieved: file_lastRetrieved,
            contentHash: file_contentHash || "unknown",
          };
        }

        if (fileEntry.url) {
          index.files![baseName] = fileEntry;
        }
      }
    }

    // COLLISION MERGING IN AGGREGATION: Compute aggregated collision statistics
    // from all FileEntries in this directory. Sums mergedCount across entries with
    // collisions, tracks the latest merge timestamp, and counts files affected.
    // This provides directory-level insights into cache efficiency (e.g., how many
    // duplicates were avoided) without scanning individual files at runtime.
    if (index.files) {
      let totalMerged = 0;
      let maxLastMerge: string | undefined;
      let filesWithCollisions = 0;
      for (const entry of Object.values(index.files)) {
        const info = (entry as any).collisionInfo as CollisionInfo | undefined;
        if (info && info.mergedCount > 0) {
          totalMerged += info.mergedCount;
          filesWithCollisions++;
          if (
            info.lastMerge &&
            (!maxLastMerge || info.lastMerge > maxLastMerge)
          ) {
            maxLastMerge = info.lastMerge;
          }
        }
      }
      index.aggregatedCollisions =
        totalMerged > 0
          ? {
              totalMerged,
              lastCollision: maxLastMerge,
              totalWithCollisions: filesWithCollisions,
            }
          : undefined;
    }

    // Merge aggregated collisions from child directories (recursive aggregation).
    // Combines statistics from subdirectories to provide hierarchical views of
    // collision patterns across the entire cache structure. Ensures root index
    // reflects global cache health.
    if (aggregated?.aggregatedCollisions && index.aggregatedCollisions) {
      const childTotal = aggregated.aggregatedCollisions.totalMerged;
      const currentTotal = index.aggregatedCollisions.totalMerged;
      index.aggregatedCollisions.totalMerged = currentTotal + childTotal;
      index.aggregatedCollisions.totalWithCollisions +=
        aggregated.aggregatedCollisions.totalWithCollisions;
      if (
        aggregated.aggregatedCollisions.lastCollision &&
        (!index.aggregatedCollisions.lastCollision ||
          aggregated.aggregatedCollisions.lastCollision >
            index.aggregatedCollisions.lastCollision)
      ) {
        index.aggregatedCollisions.lastCollision =
          aggregated.aggregatedCollisions.lastCollision;
      }
    } else if (aggregated?.aggregatedCollisions) {
      index.aggregatedCollisions = aggregated.aggregatedCollisions;
    }

    // Update timestamp and apply aggregated data
    const originalLastUpdated = index.lastUpdated;
    index.lastUpdated = new Date().toISOString();

    // Apply aggregated data if provided
    if (aggregated) {
      // Use the latest timestamp from children if available
      if (aggregated.lastUpdated > index.lastUpdated) {
        index.lastUpdated = aggregated.lastUpdated;
      }
    }

    if (context?.verbose) {
      console.log(
        `[openalex-cache] Directory ${dirPath}: ${migratedCount} entries migrated, ${collisionsDetected} collisions detected`,
      );
    }

    // Check if index has actually changed before writing (optimization)
    // Compares key fields (lastUpdated, files, directories, aggregatedCollisions)
    // to avoid unnecessary file I/O when no structural changes occurred.
    const existingIndexContent = existsSync(indexPath)
      ? await readFile(indexPath, "utf-8").catch(() => null)
      : null;
    let existingIndex: DirectoryIndex | null = null;

    if (existingIndexContent) {
      try {
        existingIndex = JSON.parse(existingIndexContent);
      } catch {
        // Invalid existing index, proceed with update
      }
    }

    if (!hasIndexChanged(existingIndex, index)) {
      if (context?.verbose) {
        console.log(
          `[openalex-cache] No changes detected for directory index: ${dirPath}`,
        );
      }
      return;
    }

    // DRY-RUN OPTION: In dry-run mode, log the intended index update without writing.
    // Outputs the full JSON structure that would be saved, allowing verification of
    // reconstruction, migration, and aggregation logic before applying changes.
    // Essential for safe migration testing on existing caches.
    // Save updated index
    if (context?.dryRun) {
      if (context?.verbose) {
        console.log(
          `[openalex-cache] [DRY-RUN] Would update directory index: ${indexPath}`,
        );
        console.log(JSON.stringify(index, null, 2));
      }
      return;
    }
    await writeFile(indexPath, JSON.stringify(index, null, 2));
    if (context?.verbose) {
      console.log(`[openalex-cache] Updated directory index: ${dirPath}`);
    }
  } catch (error) {
    console.error(
      `[openalex-cache] Failed to update directory index: ${error}`,
    );
  }
};

/**
 * Update the root index file
 */
export const updateRootIndex = async (context: CacheContext): Promise<void> => {
  try {
    const rootIndexPath = join(context.staticDataDir, "index.json");
    const { readdirSync, statSync } = await import("fs");

    // Read existing index or create new one using unified structure
    let rootIndex: DirectoryIndex = {
      lastUpdated: new Date().toISOString(),
    };

    if (existsSync(rootIndexPath)) {
      try {
        const indexContent = await readFile(rootIndexPath, "utf-8");
        const existingIndex = JSON.parse(indexContent) as DirectoryIndex;
        rootIndex = { ...rootIndex, ...existingIndex };
      } catch {
        // Index doesn't exist or is invalid, use fresh structure
      }
    }

    // Reset directories and files
    rootIndex.directories = {};
    rootIndex.files = {};

    // Scan for entity type directories and collection files
    if (existsSync(context.staticDataDir)) {
      const items = readdirSync(context.staticDataDir);

      for (const item of items) {
        if (item === "index.json") continue; // Skip the index file itself

        const itemPath = join(context.staticDataDir, item);
        const stats = statSync(itemPath);

        if (stats.isDirectory()) {
          // Only include directories that have content (either index.json or cache files)
          const dirItems = readdirSync(itemPath);
          const hasContent =
            dirItems.length > 0 &&
            (dirItems.includes("index.json") ||
              dirItems.some(
                (dirItem) =>
                  dirItem.endsWith(".json") && dirItem !== "index.json",
              ));

          if (hasContent) {
            const directoryEntry: DirectoryEntry = {
              $ref: `./${item}`,
              lastModified: stats.mtime.toISOString(),
            };
            rootIndex.directories[item] = directoryEntry;
          }
        } else if (item.endsWith(".json")) {
          // Handle top-level collection files like authors.json, works.json
          const baseName = item.replace(/\.json$/, "");

          // Only include collection files for known entity types
          const entityTypes = [
            "works",
            "authors",
            "sources",
            "institutions",
            "topics",
            "publishers",
            "funders",
            "keywords",
            "concepts",
            "autocomplete",
            "text",
          ];
          if (entityTypes.includes(baseName)) {
            try {
              // Read the cached file to get metadata
              const file_lastRetrieved = stats.mtime.toISOString();
              let file_contentHash = "unknown";

              try {
                const fileContent = await readFile(itemPath, "utf-8");
                const cacheEntry = JSON.parse(fileContent);
                file_contentHash = await generateContentHash(cacheEntry);
              } catch {
                // Skip files that can't be read or parsed
              }

              // Reconstruct the URL for this collection file
              const reconstructedUrl = `https://api.openalex.org/${baseName}`;

              const fileEntry: FileEntry = {
                url: reconstructedUrl,
                $ref: `./${item}`,
                lastRetrieved: file_lastRetrieved,
                contentHash: file_contentHash,
              };
              rootIndex.files[baseName] = fileEntry;
            } catch {
              // Skip files where we can't process metadata
            }
          }
        }
      }
    }

    // Update timestamp
    rootIndex.lastUpdated = new Date().toISOString();

    // Save updated root index
    await writeFile(rootIndexPath, JSON.stringify(rootIndex, null, 2));
    if (context.verbose) {
      console.log(`[openalex-cache] Updated root index`);
    }
  } catch (error) {
    console.error(`[openalex-cache] Failed to update root index: ${error}`);
  }
};

/**
 * Perform the actual directory index updates with recursive propagation
 */
export const performDirectoryIndexUpdates = async (
  cachePath: string,
  url: string,
  fileName: string,
  staticDataDir: string,
  context: CacheContext,
  retrieved_at?: string,
  contentHash?: string,
): Promise<void> => {
  try {
    let currentDir = join(cachePath, "..");
    const rootDir = staticDataDir;

    // Traverse up the directory tree and update each level
    while (currentDir.startsWith(rootDir)) {
      if (context.verbose) {
        console.log(`[openalex-cache] Updating directory index: ${currentDir}`);
      }

      try {
        // Aggregate metadata from child directories before updating this level
        const aggregated = await aggregateFromChildren(currentDir);

        // Update the current directory index with aggregated metadata
        await updateDirectoryIndexWithAggregation(
          currentDir,
          url,
          fileName,
          retrieved_at,
          contentHash,
          aggregated,
          context,
        );
      } catch (error) {
        console.error(
          `[openalex-cache] Failed to update directory ${currentDir}: ${error}`,
        );
        // Continue with parent directories even if one fails
      }

      // Move to parent directory
      const parentDir = join(currentDir, "..");
      if (parentDir === currentDir) {
        // Reached the root directory
        break;
      }
      currentDir = parentDir;
    }

    // Always update the root index at the end to ensure consistency
    try {
      await updateRootIndex(context);
    } catch (error) {
      console.error(`[openalex-cache] Failed to update root index: ${error}`);
    }
  } catch (error) {
    console.error(
      `[openalex-cache] Failed to update directory indexes: ${error}`,
    );
  }
};
