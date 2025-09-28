/**
 * Vite Plugin for OpenAlex API Request Caching
 * Uses proxy configuration to intercept requests to api.openalex.org and caches responses to disk during development
 */

import type { Plugin, ResolvedConfig } from "vite";
import { join } from "path";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import {
  generateContentHash,
  parseOpenAlexUrl,
  getCacheFilePath,
  sanitizeFilename,
  type DirectoryIndex,
  type FileEntry,
  type DirectoryEntry
} from "../../packages/utils/src/static-data/cache-utilities.js";

export interface OpenAlexCachePluginOptions {
  /** Custom static data directory path (relative to project root) */
  staticDataPath?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Enable request caching (default: true in development) */
  enabled?: boolean;
}

interface CachedResponse {
  data: unknown;
  headers: Record<string, string>;
  timestamp: string;
  url: string;
}

/**
 * Vite plugin for intercepting and caching OpenAlex API requests during development
 * Uses proxy configuration to redirect api.openalex.org requests through the dev server
 */
export function openalexCachePlugin(options: OpenAlexCachePluginOptions = {}): Plugin {
  let config: ResolvedConfig;
  let staticDataDir: string;

  const opts = {
    staticDataPath: "public/data/openalex",
    verbose: false,
    enabled: true,
    ...options
  };

  const logVerbose = (message: string) => {
    if (opts.verbose) {
      console.log(`[openalex-cache] ${message}`);
    }
  };

  // Debounce mechanism for index updates
  const pendingUpdates = new Map<string, NodeJS.Timeout>();
  const DEBOUNCE_DELAY = 100; // 100ms delay

  const isDevelopment = () => config.command === 'serve';

  /**
   * Get cache path for a request using shared utilities
   */
  const getCachePath = (url: string): string | null => {
    return getCacheFilePath(url, staticDataDir);
  };

  /**
   * Check if response is cached and still valid
   */
  const getCachedResponse = async (cachePath: string): Promise<unknown | null> => {
    try {
      if (!existsSync(cachePath)) {
        return null;
      }

      const content = await readFile(cachePath, 'utf-8');
      const response = JSON.parse(content);

      // Cache files now contain raw API responses only
      return response;
    } catch {
      return null;
    }
  };

  /**
   * Save response to cache and update directory indexes
   */
  const saveToCache = async (cachePath: string, url: string, data: unknown): Promise<void> => {
    try {
      // Ensure directory exists
      const dir = join(cachePath, '..');
      await mkdir(dir, { recursive: true });

      // Generate metadata
      const retrieved_at = new Date().toISOString();
      const contentHash = await generateContentHash(data);

      // Save raw API response only (no wrapper)
      await writeFile(cachePath, JSON.stringify(data, null, 2));
      logVerbose(`Cached response to ${cachePath}`);

      // Update directory indexes with metadata
      const fileName = cachePath.split('/').pop() || '';
      await updateDirectoryIndexes(cachePath, url, fileName, retrieved_at, contentHash);

    } catch (error) {
      console.error(`[openalex-cache] Failed to save to cache: ${error}`);
    }
  };

  /**
   * Check if directory index has changed before writing
   */
  const hasIndexChanged = (oldIndex: DirectoryIndex | null, newIndex: DirectoryIndex): boolean => {
    if (!oldIndex) {
      return true; // No existing index, needs update
    }

    // Compare key fields that would indicate a change
    return (
      oldIndex.lastUpdated !== newIndex.lastUpdated ||
      JSON.stringify(oldIndex.files) !== JSON.stringify(newIndex.files) ||
      JSON.stringify(oldIndex.directories) !== JSON.stringify(newIndex.directories)
    );
  };

  /**
   * Debounced update for directory indexes
   */
  const debouncedUpdateDirectoryIndexes = async (cachePath: string, url: string, fileName: string, retrieved_at?: string, contentHash?: string): Promise<void> => {
    const updateKey = `${cachePath}:${fileName}`;

    // Clear existing timeout for this path
    const existingTimeout = pendingUpdates.get(updateKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      try {
        pendingUpdates.delete(updateKey);
        await performDirectoryIndexUpdates(cachePath, url, fileName, retrieved_at, contentHash);
      } catch (error) {
        console.error(`[openalex-cache] Failed in debounced update: ${error}`);
      }
    }, DEBOUNCE_DELAY);

    pendingUpdates.set(updateKey, timeout);
  };

  /**
   * Perform the actual directory index updates with recursive propagation
   */
  const performDirectoryIndexUpdates = async (cachePath: string, url: string, fileName: string, retrieved_at?: string, contentHash?: string): Promise<void> => {
    try {
      let currentDir = join(cachePath, '..');
      const rootDir = staticDataDir;

      // Traverse up the directory tree and update each level
      while (currentDir.startsWith(rootDir)) {
        logVerbose(`Updating directory index: ${currentDir}`);

        try {
          // Aggregate metadata from child directories before updating this level
          const aggregated = await aggregateFromChildren(currentDir);

          // Update the current directory index with aggregated metadata
          await updateDirectoryIndexWithAggregation(currentDir, url, fileName, retrieved_at, contentHash, aggregated);
        } catch (error) {
          console.error(`[openalex-cache] Failed to update directory ${currentDir}: ${error}`);
          // Continue with parent directories even if one fails
        }

        // Move to parent directory
        const parentDir = join(currentDir, '..');
        if (parentDir === currentDir) {
          // Reached the root directory
          break;
        }
        currentDir = parentDir;
      }

      // Always update the root index at the end to ensure consistency
      try {
        await updateRootIndex();
      } catch (error) {
        console.error(`[openalex-cache] Failed to update root index: ${error}`);
      }

    } catch (error) {
      console.error(`[openalex-cache] Failed to update directory indexes: ${error}`);
    }
  };

  /**
   * Update directory indexes after caching new file with recursive propagation
   */
  const updateDirectoryIndexes = async (cachePath: string, url: string, fileName: string, retrieved_at?: string, contentHash?: string): Promise<void> => {
    // Use debounced updates to avoid excessive file I/O
    return debouncedUpdateDirectoryIndexes(cachePath, url, fileName, retrieved_at, contentHash);
  };

  /**
   * Aggregate metadata from child directories
   */
  const aggregateFromChildren = async (dir: string): Promise<{lastUpdated: string}> => {
    try {
      const indexPath = join(dir, 'index.json');
      if (!existsSync(indexPath)) {
        return { lastUpdated: new Date().toISOString() };
      }

      const indexContent = await readFile(indexPath, 'utf-8');
      const index: DirectoryIndex = JSON.parse(indexContent);

      let maxLastUpdated = index.lastUpdated || new Date().toISOString();

      // Aggregate from subdirectories
      if (index.directories) {
        for (const [dirName, dirInfo] of Object.entries(index.directories)) {
          const childDirPath = join(dir, dirName);
          const childIndexPath = join(childDirPath, 'index.json');

          if (existsSync(childIndexPath)) {
            try {
              const childIndexContent = await readFile(childIndexPath, 'utf-8');
              const childIndex: DirectoryIndex = JSON.parse(childIndexContent);

              // Track the maximum lastUpdated timestamp
              if (childIndex.lastUpdated && childIndex.lastUpdated > maxLastUpdated) {
                maxLastUpdated = childIndex.lastUpdated;
              }
            } catch (error) {
              console.error(`[openalex-cache] Failed to read child index ${childIndexPath}: ${error}`);
            }
          }
        }
      }

      return { lastUpdated: maxLastUpdated };
    } catch (error) {
      console.error(`[openalex-cache] Failed to aggregate from children in ${dir}: ${error}`);
      return { lastUpdated: new Date().toISOString() };
    }
  };

  /**
   * Update a single directory index file with aggregation support
   */
  const updateDirectoryIndexWithAggregation = async (dirPath: string, triggerUrl: string, newFileName?: string, retrieved_at?: string, contentHash?: string, aggregated?: {lastUpdated: string}): Promise<void> => {
    try {
      const indexPath = join(dirPath, 'index.json');
      const { readdirSync, statSync } = await import('fs');

      // Read existing index using unified structure
      let index: DirectoryIndex = {
        lastUpdated: new Date().toISOString()
      };

      if (existsSync(indexPath)) {
        try {
          const indexContent = await readFile(indexPath, 'utf-8');
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
        if (item === 'index.json') continue; // Skip the index file itself

        const itemPath = join(dirPath, item);
        const stats = statSync(itemPath);
        const relativePath = `./${item}`;

        if (stats.isDirectory()) {
          const directoryEntry: DirectoryEntry = {
            $ref: relativePath,
            lastModified: stats.mtime.toISOString()
          };
          index.directories[item] = directoryEntry;
        } else if (item.endsWith('.json')) {
          let file_lastRetrieved: string = stats.mtime.toISOString();
          let file_contentHash: string | undefined;

          // Use provided metadata if this is the newly cached file
          if (newFileName && item === newFileName && retrieved_at && contentHash) {
            file_lastRetrieved = retrieved_at;
            file_contentHash = contentHash;
          } else {
            // Try to read cache entry metadata for backwards compatibility
            try {
              const fileContent = await readFile(itemPath, 'utf-8');
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
          const baseName = item.replace(/\.json$/, '');

          // Create ResponseEntry - we need the URL, but we don't have it here
          // For now, we'll reconstruct it from the file path or skip if we can't determine the URL
          // This is a limitation of the current approach where we scan files without knowing their URLs
          try {
            // Try to reconstruct URL from file path structure
            let reconstructedUrl: string = '';

            // If this is a query file in a queries directory
            if (dirPath.includes('/queries') && baseName.startsWith('filter=')) {
              const entityType = dirPath.split('/').slice(-2, -1)[0]; // Get entity type from path
              const queryParams = baseName; // The filename is the query params
              reconstructedUrl = `https://api.openalex.org/${entityType}?${queryParams}`;
            } else {
              // This is likely a single entity file
              const pathParts = dirPath.replace(staticDataDir, '').split('/').filter(Boolean);
              if (pathParts.length >= 1) {
                const entityType = pathParts[0];
                reconstructedUrl = `https://api.openalex.org/${entityType}/${baseName}`;
              }
            }

            if (reconstructedUrl) {
              const fileEntry: FileEntry = {
                url: reconstructedUrl,
                $ref: relativePath,
                lastRetrieved: file_lastRetrieved,
                contentHash: file_contentHash || 'unknown'
              };
              index.files[baseName] = fileEntry;
            }
          } catch {
            // Skip files where we can't reconstruct the URL
          }
        }
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

      // Check if index has actually changed before writing
      const existingIndexContent = existsSync(indexPath) ?
        await readFile(indexPath, 'utf-8').catch(() => null) : null;
      let existingIndex: DirectoryIndex | null = null;

      if (existingIndexContent) {
        try {
          existingIndex = JSON.parse(existingIndexContent);
        } catch {
          // Invalid existing index, proceed with update
        }
      }

      if (!hasIndexChanged(existingIndex, index)) {
        logVerbose(`No changes detected for directory index: ${dirPath}`);
        return;
      }

      // Save updated index
      await writeFile(indexPath, JSON.stringify(index, null, 2));
      logVerbose(`Updated directory index: ${dirPath}`);

    } catch (error) {
      console.error(`[openalex-cache] Failed to update directory index: ${error}`);
    }
  };

  /**
   * Update a single directory index file (legacy function for backward compatibility)
   */
  const updateDirectoryIndex = async (dirPath: string, triggerUrl: string, newFileName?: string, retrieved_at?: string, contentHash?: string): Promise<void> => {
    await updateDirectoryIndexWithAggregation(dirPath, triggerUrl, newFileName, retrieved_at, contentHash);
  };

  /**
   * Update the root index file
   */
  const updateRootIndex = async (): Promise<void> => {
    try {
      const rootIndexPath = join(staticDataDir, 'index.json');
      const { readdirSync, statSync } = await import('fs');

      // Read existing index or create new one using unified structure
      let rootIndex: DirectoryIndex = {
        lastUpdated: new Date().toISOString()
      };

      if (existsSync(rootIndexPath)) {
        try {
          const indexContent = await readFile(rootIndexPath, 'utf-8');
          const existingIndex = JSON.parse(indexContent) as DirectoryIndex;
          rootIndex = { ...rootIndex, ...existingIndex };
        } catch {
          // Index doesn't exist or is invalid, use fresh structure
        }
      }

      // Reset directories
      rootIndex.directories = {};

      // Scan for entity type directories
      if (existsSync(staticDataDir)) {
        const items = readdirSync(staticDataDir);

        for (const item of items) {
          if (item === 'index.json') continue; // Skip the index file itself

          const itemPath = join(staticDataDir, item);
          const stats = statSync(itemPath);

          if (stats.isDirectory()) {
            // Only include directories that have content (either index.json or cache files)
            const dirItems = readdirSync(itemPath);
            const hasContent = dirItems.length > 0 &&
              (dirItems.includes('index.json') ||
               dirItems.some(dirItem => dirItem.endsWith('.json') && dirItem !== 'index.json'));

            if (hasContent) {
              const directoryEntry: DirectoryEntry = {
                $ref: `./${item}`,
                lastModified: stats.mtime.toISOString()
              };
              rootIndex.directories[item] = directoryEntry;
            }
          }
        }
      }

      // Update timestamp
      rootIndex.lastUpdated = new Date().toISOString();

      // Save updated root index
      await writeFile(rootIndexPath, JSON.stringify(rootIndex, null, 2));
      logVerbose(`Updated root index`);

    } catch (error) {
      console.error(`[openalex-cache] Failed to update root index: ${error}`);
    }
  };


  return {
    name: "openalex-cache",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      staticDataDir = join(config.root, opts.staticDataPath);

      logVerbose(`Static data directory: ${staticDataDir}`);
      logVerbose(`Plugin enabled: ${opts.enabled && isDevelopment()}`);
    },

    configureServer(server) {
      if (!opts.enabled || !isDevelopment()) {
        return;
      }

      // Add middleware to intercept OpenAlex API requests
      server.middlewares.use('/api/openalex', async (req, res, next) => {
        try {
          const fullUrl = `https://api.openalex.org${req.url}`;
          const parsedUrl = parseOpenAlexUrl(fullUrl);

          if (!parsedUrl) {
            return next();
          }

          const cachePath = getCachePath(fullUrl);
          if (!cachePath) {
            return next();
          }

          // Check cache first
          const cached = await getCachedResponse(cachePath);
          if (cached) {
            logVerbose(`Cache hit for ${req.url}`);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.end(JSON.stringify(cached));
            return;
          }

          // Cache miss - fetch from API
          logVerbose(`Cache miss for ${req.url} - fetching from API`);
          const response = await fetch(fullUrl);

          if (!response.ok) {
            res.statusCode = response.status;
            res.end(response.statusText);
            return;
          }

          const data = await response.json();

          // Save to cache
          await saveToCache(cachePath, fullUrl, data);
          logVerbose(`Cached response for ${req.url}`);

          // Send response
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.end(JSON.stringify(data));

        } catch (error) {
          console.error(`[openalex-cache] Error handling request: ${error}`);
          next();
        }
      });

      console.log("🌐 OpenAlex cache middleware configured for development");
    },

    config(userConfig, configEnv) {
      const command = configEnv?.command;
      if (!opts.enabled || command !== 'serve') {
        return;
      }

      // Configure CORS to allow OpenAlex API requests
      if (!userConfig.server) {
        userConfig.server = {};
      }

      // Set up CORS for development
      userConfig.server.cors = {
        origin: true,
        credentials: true
      };

      console.log("🌐 OpenAlex cache plugin enabled for development");
    }
  };
}