/**
 * Disk-based cache writing system for OpenAlex API responses
 * Handles writing intercepted responses to apps/web/public/data/openalex/ structure
 * with atomic operations, file locking, and metadata generation
 */

import type { LogCategory } from "@academic-explorer/utils/logger";
import { logError, logger } from "@academic-explorer/utils/logger";
import {
  DirectoryEntry,
  DirectoryIndex,
  FileEntry,
  generateContentHash,
  sanitizeUrlForCaching,
  STATIC_DATA_CACHE_PATH,
} from "@academic-explorer/utils/static-data/cache-utilities";
import type { EntityType, OpenAlexEntity, OpenAlexResponse } from "../../types";

// Dynamic imports for Node.js modules to avoid browser bundling issues
let fs: typeof import("fs/promises") | undefined;
let path: typeof import("path") | undefined;
let crypto: typeof import("crypto") | undefined;

/**
 * For testing: allow injecting mock Node.js modules
 */
export function __setMockModules(
  mockFs?: typeof import("fs/promises"),
  mockPath?: typeof import("path"),
  mockCrypto?: typeof import("crypto"),
): void {
  fs = mockFs;
  path = mockPath;
  crypto = mockCrypto;
}

/**
 * Initialize Node.js modules (required before using any file operations)
 */
async function initializeNodeModules(): Promise<void> {
  if (!fs || !path || !crypto) {
    const [fsModule, pathModule, cryptoModule] = await Promise.all([
      import("node:fs"),
      import("node:path"),
      import("node:crypto"),
    ]);
    fs = fsModule.promises;
    path = pathModule;
    crypto = cryptoModule;
  }
}

/**
 * Get initialized Node modules (throws if not initialized)
 */
function getNodeModules(): {
  fs: typeof import("fs/promises");
  path: typeof import("path");
  crypto: typeof import("crypto");
} {
  if (!fs || !path || !crypto) {
    throw new Error(
      "Node modules not initialized. Call initializeNodeModules() first.",
    );
  }
  return { fs, path, crypto };
}

/**
 * Configuration for disk cache writer
 */
export interface DiskWriterConfig {
  /** Base path for cache storage (defaults to apps/web/public/data/openalex) */
  basePath: string;
  /** Maximum concurrent write operations (defaults to 10) */
  maxConcurrentWrites: number;
  /** Timeout for file lock acquisition in milliseconds (defaults to 5000) */
  lockTimeoutMs: number;
  /** Whether to validate available disk space before writing (defaults to true) */
  checkDiskSpace: boolean;
  /** Minimum required disk space in bytes (defaults to 100MB) */
  minDiskSpaceBytes: number;
}

/**
 * Metadata for cached response
 */
export interface CacheMetadata {
  /** Original request URL */
  url: string;
  /** Final URL after redirects (if different from original) */
  finalUrl?: string;
  /** Request method */
  method: string;
  /** Request headers */
  requestHeaders: Record<string, string>;
  /** Response status code */
  statusCode: number;
  /** Response headers */
  responseHeaders: Record<string, string>;
  /** Response timestamp */
  timestamp: string;
  /** Content type */
  contentType?: string;
  /** Cache write timestamp */
  cacheWriteTime: string;
  /** Entity type detected */
  entityType?: EntityType;
  /** Entity ID detected */
  entityId?: string;
  /** File size in bytes */
  fileSizeBytes: number;
  /** Content hash for integrity verification */
  contentHash: string;
}

/**
 * Intercepted request/response data for caching
 */
export interface InterceptedData {
  /** Original request URL */
  url: string;
  /** Final URL after redirects (if different from original) */
  finalUrl?: string;
  /** Request method */
  method: string;
  /** Request headers */
  requestHeaders: Record<string, string>;
  /** Response data (parsed JSON) */
  responseData: unknown;
  /** Response status code */
  statusCode: number;
  /** Response headers */
  responseHeaders: Record<string, string>;
  /** Response timestamp */
  timestamp: string;
}

/**
 * File lock entry for concurrent access control
 */
interface FileLock {
  lockId: string;
  timestamp: number;
  filePath: string;
}

/**
 * Disk space information (unused but kept for future implementation)
 */
interface _DiskSpaceInfo {
  available: number;
  total: number;
  used: number;
}

/**
 * Comprehensive disk cache writer with atomic operations and concurrent access control
 */
export class DiskCacheWriter {
  private readonly config: Required<DiskWriterConfig>;
  private readonly activeLocks = new Map<string, FileLock>();
  private readonly writeQueue = new Set<Promise<void>>();

  constructor(config: Partial<DiskWriterConfig> = {}) {
    this.config = {
      basePath: config.basePath ?? STATIC_DATA_CACHE_PATH,
      maxConcurrentWrites: config.maxConcurrentWrites ?? 10,
      lockTimeoutMs: config.lockTimeoutMs ?? 5000,
      checkDiskSpace: config.checkDiskSpace ?? true,
      minDiskSpaceBytes: config.minDiskSpaceBytes ?? 100 * 1024 * 1024, // 100MB
    };

    logger.debug("cache" as LogCategory, "DiskCacheWriter initialized", {
      config: this.config,
    });
  }

  /**
   * Write intercepted response data to disk cache
   * @param data - Intercepted request/response data
   * @returns Promise that resolves when write is complete
   */
  public async writeToCache(data: InterceptedData): Promise<void> {
    // Enforce concurrent write limit
    while (this.writeQueue.size >= this.config.maxConcurrentWrites) {
      // Wait for any write to complete
      await Promise.race(this.writeQueue);
    }

    const writePromise = this._writeToCache(data);
    this.writeQueue.add(writePromise);

    try {
      await writePromise;
    } finally {
      this.writeQueue.delete(writePromise);
    }
  }

  /**
   * Internal write implementation
   *
   * WRITE WORKFLOW:
   * This method orchestrates the complete cache write process, including:
   * 1. Input validation and disk space checks
   * 2. Entity extraction and path generation
   * 3. File locking for concurrent safety (index and data files)
   * 4. Atomic file writes using temporary files
   * 5. Index updates with hierarchical propagation
   * 6. Lock release in finally block
   */
  private async _writeToCache(data: InterceptedData): Promise<void> {
    let indexLockId: string | undefined;
    let dataLockId: string | undefined;
    let filePaths:
      | {
          dataFile: string;
          directoryPath: string;
        }
      | undefined;

    // Initialize Node.js modules and extract them for use in try and finally blocks
    await initializeNodeModules();
    const { path: pathModule, fs: fsModule } = getNodeModules();

    try {
      // Validate input data
      this.validateInterceptedData(data);

      // Check disk space if enabled
      if (this.config.checkDiskSpace) {
        await this.ensureSufficientDiskSpace();
      }

      // Extract entity information from URL or response
      const entityInfo = await this.extractEntityInfo(data);

      // Generate file paths
      filePaths = this.generateFilePaths(entityInfo);

      const indexPath = pathModule.join(filePaths.directoryPath, "index.json");

      // Acquire exclusive locks for concurrent writes
      indexLockId = await this.acquireFileLock(indexPath);
      dataLockId = await this.acquireFileLock(filePaths.dataFile);

      // Ensure directory structure exists
      await this.ensureDirectoryStructure(filePaths.directoryPath);

      // Prepare content
      const content = JSON.stringify(data.responseData, null, 2);
      const newContentHash = await generateContentHash(data.responseData);
      const newLastRetrieved = new Date().toISOString();

      const baseName = pathModule.basename(filePaths.dataFile, ".json");

      // Read or create directory index
      let indexData: DirectoryIndex = {
        lastUpdated: new Date().toISOString(),
      };

      try {
        const existingContent = await fsModule.readFile(indexPath, "utf8");
        const existingData = JSON.parse(existingContent) as DirectoryIndex;
        indexData = {
          ...existingData,
          lastUpdated: new Date().toISOString(),
        };
      } catch {
        // Index doesn't exist, use default
      }

      // Create or update file entry with sanitized URL
      const sanitizedUrl = sanitizeUrlForCaching(data.url);
      const fileEntry: FileEntry = {
        url: sanitizedUrl,
        $ref: `./${baseName}.json`,
        lastRetrieved: newLastRetrieved,
        contentHash: newContentHash,
      };

      // Write data file atomically
      await this.writeFileAtomic(filePaths.dataFile, content);

      // Update the containing directory index
      if (!indexData.files) {
        indexData.files = {};
      }
      indexData.files[baseName] = fileEntry;
      indexData.lastUpdated = new Date().toISOString();
      await this.writeFileAtomic(indexPath, JSON.stringify(indexData, null, 2));

      // Propagate updates to hierarchical parent indexes (skip containing directory)
      await this.updateHierarchicalIndexes(entityInfo, filePaths, data, true);

      logger.debug("cache" as LogCategory, "Cache write successful", {
        entityType: entityInfo.entityType,
        entityId: entityInfo.entityId,
        baseName,
        dataFile: filePaths.dataFile,
        fileSizeBytes: Buffer.byteLength(content, "utf8"),
      });
    } finally {
      // Release all locks
      if (indexLockId && filePaths) {
        await this.releaseFileLock(
          indexLockId,
          pathModule.join(filePaths.directoryPath, "index.json"),
        );
      }
      if (dataLockId && filePaths) {
        await this.releaseFileLock(dataLockId, filePaths.dataFile);
      }
    }
  }

  /**
   * Create a basic single-URL FileEntry
   */
  private createBasicFileEntry(
    baseName: string,
    url: string,
    lastRetrieved: string,
    contentHash: string,
  ): FileEntry {
    return {
      url,
      $ref: `./${baseName}.json`,
      lastRetrieved,
      contentHash,
    };
  }

  /**
   * Extract entity type and ID from URL or response data
   */
  private async extractEntityInfo(data: InterceptedData): Promise<{
    entityType?: EntityType;
    entityId?: string;
    queryParams?: string;
    isQueryResponse?: boolean;
  }> {
    try {
      // Try to extract from URL first
      const urlInfo = this.extractEntityInfoFromUrl(data.url);
      if (urlInfo.entityType) {
        return urlInfo;
      }

      // Try to extract from response data
      const responseInfo = this.extractEntityInfoFromResponse(
        data.responseData,
      );
      if (responseInfo.entityType) {
        return { ...responseInfo, ...urlInfo };
      }

      // Default fallback - use URL hash
      const urlHash = await generateContentHash(data.url);
      return {
        entityType: "works", // Default entity type
        entityId: `unknown_${urlHash.substring(0, 8)}`,
      };
    } catch (error) {
      logError(logger, "Failed to extract entity info", error);
      throw new Error(
        `Entity info extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract entity info from URL path
   */
  private extractEntityInfoFromUrl(url: string): {
    entityType?: EntityType;
    entityId?: string;
    queryParams?: string;
    isQueryResponse?: boolean;
  } {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      // Sanitize query parameters to remove sensitive information like api_key and mailto
      const sanitizedQuery = sanitizeUrlForCaching(urlObj.search);
      const queryParams = sanitizedQuery.startsWith("?")
        ? sanitizedQuery.slice(1)
        : sanitizedQuery; // Remove leading '?'

      // Validate entity type
      const validEntityTypes: EntityType[] = [
        "works",
        "authors",
        "sources",
        "institutions",
        "topics",
        "concepts",
        "publishers",
        "funders",
        "keywords",
      ];

      // OpenAlex API URL pattern: /entity_type/entity_id or /entity_type?params
      if (pathParts.length >= 1) {
        const entityType = pathParts[0] as EntityType;

        if (validEntityTypes.includes(entityType)) {
          // Single entity: /entity_type/entity_id
          if (pathParts.length >= 2 && !queryParams) {
            const entityId = pathParts[1];
            return { entityType, entityId, isQueryResponse: false };
          }
          // Query/filter response: /entity_type?params
          else if (queryParams) {
            return {
              entityType,
              queryParams,
              isQueryResponse: true,
              entityId: entityType, // Use entity type as ID for collections
            };
          }
          // Collection without params: /entity_type
          else {
            return {
              entityType,
              isQueryResponse: true,
              entityId: entityType, // Use entity type as ID for collections
            };
          }
        }
      }

      return {};
    } catch {
      return {};
    }
  }

  /**
   * Extract entity info from response data
   */
  private extractEntityInfoFromResponse(responseData: unknown): {
    entityType?: EntityType;
    entityId?: string;
    isQueryResponse?: boolean;
  } {
    try {
      // Single entity response
      if (this.isOpenAlexEntity(responseData)) {
        const entityType = this.detectEntityType(responseData);
        return {
          entityType,
          entityId: responseData.id,
          isQueryResponse: false,
        };
      }

      // Collection response
      if (
        this.isOpenAlexResponse(responseData) &&
        responseData.results.length > 0
      ) {
        const firstResult = responseData.results[0];
        if (this.isOpenAlexEntity(firstResult)) {
          const entityType = this.detectEntityType(firstResult);
          return {
            entityType,
            entityId: entityType, // Use entity type as ID for collections
            isQueryResponse: true,
          };
        }
      }

      return {};
    } catch {
      return {};
    }
  }

  /**
   * Type guard for OpenAlex entity
   */
  private isOpenAlexEntity(data: unknown): data is OpenAlexEntity {
    return (
      typeof data === "object" &&
      data !== null &&
      typeof (data as { id?: unknown }).id === "string" &&
      typeof (data as { display_name?: unknown }).display_name === "string"
    );
  }

  /**
   * Type guard for OpenAlex response
   */
  private isOpenAlexResponse(
    data: unknown,
  ): data is OpenAlexResponse<OpenAlexEntity> {
    return (
      typeof data === "object" &&
      data !== null &&
      Array.isArray((data as { results?: unknown }).results) &&
      typeof (data as { meta?: unknown }).meta === "object"
    );
  }

  /**
   * Detect entity type from entity data
   */
  private detectEntityType(entity: OpenAlexEntity): EntityType {
    // Try to detect based on specific properties
    if ("doi" in entity || "publication_year" in entity) return "works";
    if ("orcid" in entity || "last_known_institutions" in entity)
      return "authors";
    if ("issn_l" in entity || "publisher" in entity) return "sources";
    if ("ror" in entity || "country_code" in entity) return "institutions";
    if ("description" in entity && "keywords" in entity) return "topics";
    if ("wikidata" in entity && "level" in entity) return "concepts";
    if ("hierarchy_level" in entity || "parent_publisher" in entity)
      return "publishers";
    if ("grants_count" in entity) return "funders";

    // Default fallback
    return "works";
  }

  /**
   * Generate file paths for data
   */
  private generateFilePaths(entityInfo: {
    entityType?: EntityType;
    entityId?: string;
    queryParams?: string;
    isQueryResponse?: boolean;
  }): {
    dataFile: string;
    directoryPath: string;
  } {
    const entityType = entityInfo.entityType ?? "unknown";

    if (!path) {
      throw new Error("Node.js path module not initialized");
    }

    let directoryPath: string;
    let filename: string;

    if (entityInfo.isQueryResponse && entityInfo.queryParams) {
      // Query/filter response: works/queries/filter=author.id:A123&select=display_name.json
      const sanitizedQuery = this.sanitizeFilename(
        `filter=${entityInfo.queryParams}`,
      );
      directoryPath = path.join(this.config.basePath, entityType, "queries");
      filename = sanitizedQuery;
    } else if (entityInfo.entityId && !entityInfo.isQueryResponse) {
      // Single entity: works/W123456789.json
      const sanitizedId = this.sanitizeFilename(entityInfo.entityId);
      directoryPath = path.join(this.config.basePath, entityType);
      filename = sanitizedId;
    } else if (
      entityInfo.isQueryResponse &&
      entityInfo.entityId === entityType
    ) {
      // Collection response: works.json (not works/works.json)
      directoryPath = this.config.basePath;
      filename = entityType;
    } else {
      // Default fallback
      const entityId = entityInfo.entityId ?? "unknown";
      const sanitizedId = this.sanitizeFilename(entityId);
      directoryPath = path.join(this.config.basePath, entityType);
      filename = sanitizedId;
    }

    const dataFile = path.join(directoryPath, `${filename}.json`);

    return { dataFile, directoryPath };
  }

  /**
   * Sanitize filename to be filesystem-safe
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid characters
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/_{2,}/g, "_") // Replace multiple underscores with single
      .replace(/^_|_$/g, "") // Remove leading/trailing underscores
      .substring(0, 200); // Limit length
  }

  /**
   * Ensure directory structure exists
   */
  private async ensureDirectoryStructure(dirPath: string): Promise<void> {
    try {
      if (!fs) {
        throw new Error("Node.js fs module not initialized");
      }
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logError(logger, "Failed to create directory structure", error);
      throw new Error(
        `Directory creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Write file atomically using temporary file
   */
  private async writeFileAtomic(
    filePath: string,
    content: string,
  ): Promise<void> {
    if (!crypto) {
      throw new Error("Node.js crypto module not initialized");
    }
    if (!fs) {
      throw new Error("Node.js fs module not initialized");
    }
    const tempPath = `${filePath}.tmp.${crypto.randomUUID()}`;

    try {
      // Write to temporary file first
      await fs.writeFile(tempPath, content, "utf8");

      // Atomically move to final location
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temporary file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }

      logError(logger, "Atomic file write failed", error);
      throw new Error(
        `Atomic write failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Acquire file lock for concurrent access control
   *
   * LOCKING EXTENSIONS: Implements optimistic locking with timeout-based
   * stale lock cleanup. Uses UUID for lock IDs and in-memory Map for tracking.
   * Polls with 50ms intervals up to lockTimeoutMs (default 5s). Stale locks
   * (older than timeout) are automatically removed to prevent deadlocks from
   * crashed processes. Essential for safe concurrent writes in multi-tab
   * development or server environments.
   */
  private async acquireFileLock(filePath: string): Promise<string> {
    if (!crypto) {
      throw new Error("Node.js crypto module not initialized");
    }
    const lockId = crypto.randomUUID();
    const maxWaitTime = this.config.lockTimeoutMs;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      if (!this.activeLocks.has(filePath)) {
        // Acquire lock
        this.activeLocks.set(filePath, {
          lockId,
          timestamp: Date.now(),
          filePath,
        });

        logger.debug("disk-writer" as LogCategory, "File lock acquired", {
          filePath,
          lockId,
        });
        return lockId;
      }

      // Check for stale locks (older than timeout)
      const existingLock = this.activeLocks.get(filePath);
      if (existingLock && Date.now() - existingLock.timestamp > maxWaitTime) {
        // Remove stale lock
        this.activeLocks.delete(filePath);
        logger.warn("disk-writer" as LogCategory, "Removed stale file lock", {
          filePath,
          staleLockId: existingLock.lockId,
        });
        continue;
      }

      // Wait before retrying
      await this.sleep(50);
    }

    throw new Error(
      `Failed to acquire file lock for ${filePath} within ${maxWaitTime}ms`,
    );
  }

  /**
   * Release file lock
   */
  private async releaseFileLock(
    lockId: string,
    filePath: string,
  ): Promise<void> {
    const existingLock = this.activeLocks.get(filePath);

    if (existingLock && existingLock.lockId === lockId) {
      this.activeLocks.delete(filePath);
      logger.debug("disk-writer" as LogCategory, "File lock released", {
        filePath,
        lockId,
      });
    } else {
      logger.warn(
        "disk-writer" as LogCategory,
        "Attempted to release non-existent or mismatched lock",
        { filePath, lockId },
      );
    }
  }

  /**
   * Check available disk space
   */
  private async ensureSufficientDiskSpace(): Promise<void> {
    try {
      if (!fs) {
        throw new Error("Node.js fs module not initialized");
      }
      const stats = await fs.statfs(this.config.basePath);
      const availableBytes = stats.bavail * stats.bsize;

      if (availableBytes < this.config.minDiskSpaceBytes) {
        throw new Error(
          `Insufficient disk space: ${this.formatBytes(availableBytes)} available, ` +
            `${this.formatBytes(this.config.minDiskSpaceBytes)} required`,
        );
      }

      logger.debug("disk-writer" as LogCategory, "Disk space check passed", {
        availableBytes,
        requiredBytes: this.config.minDiskSpaceBytes,
      });
    } catch (error) {
      // If statfs is not available, skip the check
      if (error instanceof Error && error.message.includes("ENOSYS")) {
        logger.warn(
          "disk-writer" as LogCategory,
          "Disk space checking not available on this platform",
        );
        return;
      }

      throw error;
    }
  }

  /**
   * Format bytes for human-readable display
   */
  private formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Validate intercepted data structure
   */
  private validateInterceptedData(data: InterceptedData): void {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid intercepted data: must be an object");
    }

    const requiredFields = [
      "url",
      "method",
      "responseData",
      "statusCode",
      "timestamp",
    ];
    const missingFields = requiredFields.filter((field) => !(field in data));

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    if (typeof data.url !== "string" || !data.url) {
      throw new Error("Invalid URL: must be a non-empty string");
    }

    if (
      typeof data.statusCode !== "number" ||
      data.statusCode < 100 ||
      data.statusCode > 599
    ) {
      throw new Error("Invalid status code: must be a number between 100-599");
    }

    if (!data.responseData) {
      throw new Error("Invalid response data: must be present");
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update hierarchical index.json files from the saved file up to the root
   */
  private async updateHierarchicalIndexes(
    entityInfo: {
      entityType?: EntityType;
      entityId?: string;
      queryParams?: string;
      isQueryResponse?: boolean;
    },
    filePaths: {
      dataFile: string;
      directoryPath: string;
    },
    data: InterceptedData,
    skipContainingDirectory = true,
  ): Promise<void> {
    if (!path || !fs) {
      throw new Error("Node.js modules not initialized");
    }

    try {
      // Start from the immediate directory containing the data file
      let currentPath = filePaths.directoryPath;
      if (skipContainingDirectory) {
        currentPath = path.dirname(currentPath);
      }
      const basePath = path.resolve(this.config.basePath);

      while (currentPath && currentPath.startsWith(basePath)) {
        await this.updateDirectoryIndex(
          currentPath,
          entityInfo,
          filePaths,
          data,
        );

        // Move up one directory level
        const parentPath = path.dirname(currentPath);
        if (parentPath === currentPath || !parentPath.startsWith(basePath)) {
          break;
        }
        currentPath = parentPath;
      }
    } catch (error) {
      logError(logger, "Failed to update hierarchical indexes", error);
      throw new Error(
        `Index update failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Update a single directory's index.json file
   */
  private async updateDirectoryIndex(
    directoryPath: string,
    entityInfo: {
      entityType?: EntityType;
      entityId?: string;
      queryParams?: string;
      isQueryResponse?: boolean;
    },
    filePaths: {
      dataFile: string;
      directoryPath: string;
    },
    data: InterceptedData,
  ): Promise<void> {
    if (!path || !fs) {
      throw new Error("Node.js modules not initialized");
    }

    const indexPath = path.join(directoryPath, "index.json");
    const basePath = path.resolve(this.config.basePath);
    const relativePath = path
      .relative(basePath, directoryPath)
      .replace(/\\/g, "/");
    const displayPath = relativePath ? `/${relativePath}` : "/";

    try {
      // Read existing index or create new one
      let indexData: DirectoryIndex = {
        lastUpdated: new Date().toISOString(),
      };

      try {
        const existingContent = await fs.readFile(indexPath, "utf8");
        const existingData = JSON.parse(existingContent) as DirectoryIndex;
        indexData = {
          lastUpdated: new Date().toISOString(),
          ...(existingData.directories &&
            Object.keys(existingData.directories).length > 0 && {
              directories: existingData.directories,
            }),
          ...(existingData.files &&
            Object.keys(existingData.files).length > 0 && {
              files: existingData.files,
            }),
        };
      } catch {
        // File doesn't exist, use default structure
      }

      // Update timestamp
      indexData.lastUpdated = new Date().toISOString();

      // Determine if this is the directory containing our new file
      const isContainingDirectory = directoryPath === filePaths.directoryPath;

      if (isContainingDirectory) {
        // Add the new file to the appropriate section
        const filename = path.basename(filePaths.dataFile, ".json");
        const relativeFilePath = `./${filename}.json`;

        const fileEntry: FileEntry = {
          url: data.url,
          $ref: relativeFilePath,
          lastRetrieved: new Date().toISOString(),
          contentHash: await generateContentHash(data.responseData),
        };

        // Add to files section for query/filter responses
        if (entityInfo.isQueryResponse && entityInfo.queryParams) {
          if (!indexData.files) {
            indexData.files = {};
          }
          indexData.files[filename] = fileEntry;
        }
        // For entity files, we don't add them to index (only directories)
      } else {
        // This is a parent directory, add directory reference
        const relativePath = path.relative(
          directoryPath,
          filePaths.directoryPath,
        );
        const childDirName = relativePath.split(path.sep)[0];
        if (childDirName && childDirName !== ".") {
          if (!indexData.directories) {
            indexData.directories = {};
          }
          const directoryEntry: DirectoryEntry = {
            $ref: `./${childDirName}`,
            lastModified: new Date().toISOString(),
          };
          indexData.directories[childDirName] = directoryEntry;
        }
      }

      // Write updated index
      await this.writeFileAtomic(indexPath, JSON.stringify(indexData, null, 2));

      logger.debug("cache" as LogCategory, "Updated directory index", {
        indexPath,
        relativePath: displayPath,
        isContainingDirectory,
        hasFiles: Object.keys(indexData.files || {}).length > 0,
        hasDirectories: Object.keys(indexData.directories || {}).length > 0,
      });
    } catch (error) {
      logError(logger, "Failed to update directory index", error);
      throw new Error(
        `Directory index update failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get current cache statistics
   */
  /**
   * Get the current configuration (for testing)
   */
  public getConfig(): Readonly<Required<DiskWriterConfig>> {
    return this.config;
  }

  public getCacheStats(): {
    activeLocks: number;
    activeWrites: number;
    maxConcurrentWrites: number;
  } {
    return {
      activeLocks: this.activeLocks.size,
      activeWrites: this.writeQueue.size,
      maxConcurrentWrites: this.config.maxConcurrentWrites,
    };
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    // Wait for all active writes to complete
    if (this.writeQueue.size > 0) {
      await Promise.allSettled(this.writeQueue);
    }

    // Clear all locks
    this.activeLocks.clear();

    logger.debug(
      "disk-writer" as LogCategory,
      "DiskCacheWriter cleanup completed",
    );
  }
}

/**
 * Default disk cache writer instance
 */
export const defaultDiskWriter = new DiskCacheWriter();

/**
 * Convenience function to write intercepted data to cache
 */
export async function writeToDiskCache(data: InterceptedData): Promise<void> {
  return defaultDiskWriter.writeToCache(data);
}
