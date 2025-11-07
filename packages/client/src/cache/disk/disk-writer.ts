/**
 * Disk-based cache writing system for OpenAlex API responses
 * Handles writing intercepted responses to apps/web/public/data/openalex/ structure
 * with atomic operations, file locking, and metadata generation
 */

import type { LogCategory } from "@academic-explorer/utils";
import { logError, logger } from "@academic-explorer/utils";
import {
  DirectoryIndex,
  FileEntry,
  generateContentHash,
  isDirectoryIndex,
  sanitizeUrlForCaching,
  STATIC_DATA_CACHE_PATH,
} from "@academic-explorer/utils/static-data/cache-utilities";
import type { EntityType, OpenAlexEntity, OpenAlexResponse } from "../../types";

// Dynamic imports for Node.js modules to avoid browser bundling issues
let fs: any;
let path: any;
let crypto: any;

// Constants for error messages and file names
const ERROR_MESSAGE_FS_NOT_INITIALIZED = "Node.js fs module not initialized";
const __ERROR_MESSAGE_ENTITY_EXTRACTION_FAILED =
  "Entity info extraction failed";
const INDEX_FILE_NAME = "index.json";
const _LOGGER_NAME = "disk-writer";
const UNKNOWN_ERROR_MESSAGE = "Unknown error";

/**
 * For testing: allow injecting mock Node.js modules
 */
export function __setMockModules({
  mockFs,
  mockPath,
  mockCrypto,
}: {
  mockFs?: typeof import("fs/promises");
  mockPath?: typeof import("path");
  mockCrypto?: typeof import("crypto");
}): void {
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
      import("node:fs/promises"),
      import("node:path"),
      import("node:crypto"),
    ]);
    fs = fsModule.default || fsModule;
    path = pathModule.default || pathModule;
    crypto = cryptoModule.default || cryptoModule;
  }
}

/**
 * Get initialized Node modules (throws if not initialized)
 */
function getNodeModules(): {
  fs: any;
  path: any;
  crypto: any;
} {
  if (!fs || !path || !crypto) {
    throw new Error(
      "Node modules not initialized. Call initializeNodeModules() first.",
    );
  }
  return { fs, path, crypto };
}

/**
 * Compare two DirectoryIndex objects to determine if content has changed
 * Excludes the lastUpdated field from comparison
 * @param oldIndex - Previous index state
 * @param newIndex - New index state
 * @returns true if content is identical (excluding lastUpdated), false otherwise
 */
function indexContentEquals(oldIndex: DirectoryIndex, newIndex: DirectoryIndex): boolean {
  // Compare files
  const oldFiles = oldIndex.files ?? {};
  const newFiles = newIndex.files ?? {};

  const oldFileKeys = Object.keys(oldFiles).sort();
  const newFileKeys = Object.keys(newFiles).sort();

  if (oldFileKeys.length !== newFileKeys.length) {
    return false;
  }

  for (let i = 0; i < oldFileKeys.length; i++) {
    if (oldFileKeys[i] !== newFileKeys[i]) {
      return false;
    }

    const oldFile = oldFiles[oldFileKeys[i]] as FileEntry;
    const newFile = newFiles[newFileKeys[i]] as FileEntry;

    // Compare all FileEntry fields
    if (
      oldFile.url !== newFile.url ||
      oldFile.$ref !== newFile.$ref ||
      oldFile.lastRetrieved !== newFile.lastRetrieved ||
      oldFile.contentHash !== newFile.contentHash
    ) {
      return false;
    }
  }

  // Compare directories
  const oldDirs = oldIndex.directories ?? {};
  const newDirs = newIndex.directories ?? {};

  const oldDirKeys = Object.keys(oldDirs).sort();
  const newDirKeys = Object.keys(newDirs).sort();

  if (oldDirKeys.length !== newDirKeys.length) {
    return false;
  }

  for (let i = 0; i < oldDirKeys.length; i++) {
    if (oldDirKeys[i] !== newDirKeys[i]) {
      return false;
    }

    const oldDir = oldDirs[oldDirKeys[i]];
    const newDir = newDirs[newDirKeys[i]];

    // Compare directory entry fields
    if (
      oldDir?.$ref !== newDir?.$ref ||
      oldDir?.lastModified !== newDir?.lastModified
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Find the workspace root by looking for pnpm-workspace.yaml or package.json with workspaces
 * Walks up the directory tree from the current working directory
 */
async function findWorkspaceRoot(): Promise<string> {
  await initializeNodeModules();
  const { fs: fsModule, path: pathModule } = getNodeModules();

  let currentDir = process.cwd();
  const root = pathModule.parse(currentDir).root;

  while (currentDir !== root) {
    try {
      // Check for pnpm-workspace.yaml (pnpm monorepo)
      const pnpmWorkspace = pathModule.join(currentDir, "pnpm-workspace.yaml");
      await fsModule.access(pnpmWorkspace);
      return currentDir;
    } catch {
      // Not found, try package.json with workspaces field
      try {
        const packageJson = pathModule.join(currentDir, "package.json");
        const content = await fsModule.readFile(packageJson, "utf8");
        const pkg = JSON.parse(content) as { workspaces?: unknown };
        if (pkg.workspaces) {
          return currentDir;
        }
      } catch {
        // Continue searching
      }
    }

    // Move up one directory
    currentDir = pathModule.dirname(currentDir);
  }

  // Fallback to current working directory if no workspace root found
  return process.cwd();
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
  private workspaceRoot: string | null = null;
  private workspaceRootPromise: Promise<string> | null = null;

  constructor(config: Partial<DiskWriterConfig> = {}) {
    this.config = {
      basePath: config.basePath ?? STATIC_DATA_CACHE_PATH,
      maxConcurrentWrites: config.maxConcurrentWrites ?? 10,
      lockTimeoutMs: config.lockTimeoutMs ?? 5000,
      checkDiskSpace: config.checkDiskSpace ?? true,
      minDiskSpaceBytes: config.minDiskSpaceBytes ?? 100 * 1024 * 1024, // 100MB
    };

    logger.debug("cache", "DiskCacheWriter initialized", {
      config: this.config,
    });
  }

  /**
   * Get the resolved base path (workspace root + relative path)
   * Cached after first call
   */
  private async getResolvedBasePath(): Promise<string> {
    // Check if basePath is already absolute FIRST
    // This must be checked before using this.workspaceRoot to avoid double path joining
    await initializeNodeModules();
    const { path: pathModule } = getNodeModules();
    if (pathModule.isAbsolute(this.config.basePath)) {
      logger.debug("cache", "Using absolute basePath", {
        basePath: this.config.basePath,
      });
      return this.config.basePath;
    }

    // If we have a cached workspace root, use it for relative paths
    if (this.workspaceRoot) {
      return pathModule.join(this.workspaceRoot, this.config.basePath);
    }

    // Perform workspace root detection for relative paths
    if (!this.workspaceRootPromise) {
      this.workspaceRootPromise = findWorkspaceRoot().then((root) => {
        this.workspaceRoot = root;
        logger.debug("cache", "Workspace root found", { root });
        return root;
      });
    }

    const root = await this.workspaceRootPromise;
    return pathModule.join(root, this.config.basePath);
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

      // Get resolved base path (workspace root + relative path)
      const resolvedBasePath = await this.getResolvedBasePath();

      // Check disk space if enabled
      if (this.config.checkDiskSpace) {
        await this.ensureSufficientDiskSpace(resolvedBasePath);
      }

      // Extract entity information from URL or response
      const entityInfo = await this.extractEntityInfo(data);

      // Generate file paths
      filePaths = this.generateFilePaths(entityInfo, resolvedBasePath);

      const indexPath = pathModule.join(
        filePaths.directoryPath,
        INDEX_FILE_NAME,
      );

      // Acquire exclusive locks for concurrent writes
      indexLockId = await this.acquireFileLock(indexPath);
      dataLockId = await this.acquireFileLock(filePaths.dataFile);

      // Ensure directory structure exists
      await this.ensureDirectoryStructure(filePaths.directoryPath);

      // Prepare content - exclude meta field from cached responses
      const responseDataToCache = this.excludeMetaField(data.responseData);

      // Skip caching if results are empty
      if (this.hasEmptyResults(responseDataToCache)) {
        logger.debug("cache", "Skipping cache write for empty results", {
          url: data.url,
        });
        return;
      }

      const content = JSON.stringify(responseDataToCache, null, 2);
      const newContentHash = await generateContentHash(responseDataToCache);
      const newLastRetrieved = new Date().toISOString();

      const baseName = pathModule.basename(filePaths.dataFile, ".json");

      // Read or create directory index
      let oldIndexData: DirectoryIndex | null = null;
      let indexData: DirectoryIndex = {
        lastUpdated: new Date().toISOString(),
      };

      try {
        const existingContent = await fsModule.readFile(indexPath, "utf8");
        const parsedData: unknown = JSON.parse(existingContent);
        if (!isDirectoryIndex(parsedData)) {
          throw new Error(`Invalid directory index format in ${indexPath}`);
        }
        // parsedData is validated as DirectoryIndex by isDirectoryIndex
        oldIndexData = parsedData;
        indexData = {
          ...parsedData,
          // Preserve existing lastUpdated initially, we'll update it below if content changes
          lastUpdated: parsedData.lastUpdated,
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
      await this.writeFileAtomic({ filePath: filePaths.dataFile, content });

      // Update the containing directory index
      indexData.files ??= {};
      indexData.files[baseName] = fileEntry;

      // Only update lastUpdated if content has actually changed
      if (oldIndexData && indexContentEquals(oldIndexData, indexData)) {
        // Content is identical, preserve old lastUpdated timestamp
        indexData.lastUpdated = oldIndexData.lastUpdated;
      } else {
        // Content has changed or this is a new index, update timestamp
        indexData.lastUpdated = new Date().toISOString();
      }

      await this.writeFileAtomic({
        filePath: indexPath,
        content: JSON.stringify(indexData, null, 2),
      });

      // Propagate updates to hierarchical parent indexes (skip containing directory)
      await this.updateHierarchicalIndexes(entityInfo, filePaths, data, true);

      logger.debug("cache", "Cache write successful", {
        entityType: entityInfo.entityType,
        entityId: entityInfo.entityId,
        baseName,
        dataFile: filePaths.dataFile,
        fileSizeBytes: Buffer.byteLength(content, "utf8"),
      });
    } finally {
      // Release all locks
      if (indexLockId && filePaths) {
        await this.releaseFileLock({
          lockId: indexLockId,
          filePath: pathModule.join(filePaths.directoryPath, INDEX_FILE_NAME),
        });
      }
      if (dataLockId && filePaths) {
        await this.releaseFileLock({
          lockId: dataLockId,
          filePath: filePaths.dataFile,
        });
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
        `${__ERROR_MESSAGE_ENTITY_EXTRACTION_FAILED}: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`,
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

      // Check for autocomplete endpoint first
      if (pathParts.length >= 1 && pathParts[0] === "autocomplete") {
        // Autocomplete can be /autocomplete?q=query or /autocomplete/entity_type?q=query
        if (pathParts.length === 1) {
          // General autocomplete: /autocomplete?q=query
          return {
            // Don't set entityType for autocomplete - use undefined to mark as special case
            queryParams,
            isQueryResponse: true,
            entityId: "autocomplete/general", // Special marker for autocomplete
          };
        } else if (pathParts.length === 2) {
          // Entity-specific autocomplete: /autocomplete/works?q=query
          const entitySubtype = pathParts[1];
          return {
            // Don't set entityType for autocomplete - use undefined to mark as special case
            queryParams,
            isQueryResponse: true,
            entityId: `autocomplete/${entitySubtype}`, // Special marker for autocomplete with subtype
          };
        }
      }

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
        const entityType = pathParts[0];

        const typedEntityType = validEntityTypes.find(
          (type) => type === entityType,
        );
        if (typedEntityType) {
          // Single entity: /entity_type/entity_id
          if (pathParts.length >= 2 && !queryParams) {
            const entityId = pathParts[1];
            return {
              entityType: typedEntityType,
              entityId,
              isQueryResponse: false,
            };
          }
          // Query/filter response: /entity_type?params
          else if (queryParams) {
            return {
              entityType: typedEntityType,
              queryParams,
              isQueryResponse: true,
              entityId: typedEntityType, // Use entity type as ID for collections
            };
          }
          // Collection without params: /entity_type
          else {
            return {
              entityType: typedEntityType,
              isQueryResponse: true,
              entityId: typedEntityType, // Use entity type as ID for collections
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
    const obj = data as Record<string, unknown>;
    return (
      typeof data === "object" &&
      data !== null &&
      typeof obj.id === "string" &&
      typeof obj.display_name === "string"
    );
  }

  /**
   * Type guard for OpenAlex response
   */
  private isOpenAlexResponse(
    data: unknown,
  ): data is OpenAlexResponse<OpenAlexEntity> {
    const obj = data as Record<string, unknown>;
    return (
      typeof data === "object" &&
      data !== null &&
      Array.isArray(obj.results) &&
      typeof obj.meta === "object"
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
   * Exclude meta field from response data before caching
   * The meta field contains pagination and timing info that shouldn't be cached
   */
  private excludeMetaField(responseData: unknown): unknown {
    if (
      typeof responseData === "object" &&
      responseData !== null &&
      "meta" in responseData
    ) {
      const { meta: _meta, ...rest } = responseData as Record<string, unknown>;
      return rest;
    }
    return responseData;
  }

  /**
   * Check if response data has empty results
   * Returns true if the response has a results array that is empty
   */
  private hasEmptyResults(responseData: unknown): boolean {
    if (
      typeof responseData === "object" &&
      responseData !== null &&
      "results" in responseData
    ) {
      const data = responseData as Record<string, unknown>;
      return Array.isArray(data.results) && data.results.length === 0;
    }
    return false;
  }

  /**
   * Generate file paths for data
   */
  private generateFilePaths(
    entityInfo: {
      entityType?: EntityType;
      entityId?: string;
      queryParams?: string;
      isQueryResponse?: boolean;
    },
    basePath: string,
  ): {
    dataFile: string;
    directoryPath: string;
  } {
    const entityType = entityInfo.entityType ?? "unknown";

    if (!path) {
      throw new Error("Node.js path module not initialized");
    }

    let directoryPath: string;
    let filename: string;

    // Handle autocomplete responses specially
    if (entityInfo.entityId?.startsWith("autocomplete/") && entityInfo.queryParams) {
      // Autocomplete: autocomplete/works/q=query.json or autocomplete/general/q=query.json
      // queryParams already contains the serialized query string (e.g., "q=neural+networks")
      const sanitizedQuery = this.sanitizeFilename(entityInfo.queryParams);
      const [, subdirectory] = entityInfo.entityId.split("/");
      directoryPath = path.join(basePath, "autocomplete", subdirectory);
      filename = sanitizedQuery;
    } else if (entityInfo.isQueryResponse && entityInfo.queryParams) {
      // Query/filter response: works/queries/filter=author.id:A123&select=display_name.json
      const sanitizedQuery = this.sanitizeFilename(
        `filter=${entityInfo.queryParams}`,
      );
      directoryPath = path.join(basePath, entityType, "queries");
      filename = sanitizedQuery;
    } else if (entityInfo.entityId && !entityInfo.isQueryResponse) {
      // Single entity: works/W123456789.json
      const sanitizedId = this.sanitizeFilename(entityInfo.entityId);
      directoryPath = path.join(basePath, entityType);
      filename = sanitizedId;
    } else if (
      entityInfo.isQueryResponse &&
      entityInfo.entityId === entityType
    ) {
      // Collection response: works.json (not works/works.json)
      directoryPath = basePath;
      filename = entityType;
    } else {
      // Default fallback
      const entityId = entityInfo.entityId ?? "unknown";
      const sanitizedId = this.sanitizeFilename(entityId);
      directoryPath = path.join(basePath, entityType);
      filename = sanitizedId;
    }

    const dataFile = path.join(directoryPath, `${filename}.json`);

    return { dataFile, directoryPath };
  }

  /**
   * Sanitize filename to be filesystem-safe
   * Uses hash for very long filenames to avoid ENAMETOOLONG errors
   */
  private sanitizeFilename(filename: string): string {
    const sanitized = filename
      .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid characters
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/_{2,}/g, "_") // Replace multiple underscores with single
      .replace(/^_|_$/g, ""); // Remove leading/trailing underscores

    // If filename is too long, use a hash to ensure it fits filesystem limits
    // Keep it under 100 chars to leave room for directory path and .json extension
    if (sanitized.length > 100) {
      // Create a simple hash from the filename
      let hash = 0;
      for (let i = 0; i < filename.length; i++) {
        const char = filename.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      const hashStr = Math.abs(hash).toString(36);
      // Return first 50 chars + hash to make it somewhat readable
      return `${sanitized.substring(0, 50)}_${hashStr}`;
    }

    return sanitized;
  }

  /**
   * Ensure directory structure exists
   */
  private async ensureDirectoryStructure(dirPath: string): Promise<void> {
    try {
      if (!fs) {
        throw new Error(ERROR_MESSAGE_FS_NOT_INITIALIZED);
      }
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logError(logger, "Failed to create directory structure", error);
      throw new Error(
        `Directory creation failed: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`,
      );
    }
  }

  /**
   * Write file atomically using temporary file
   */
  private async writeFileAtomic({
    filePath,
    content,
  }: {
    filePath: string;
    content: string;
  }): Promise<void> {
    if (!crypto) {
      throw new Error("Node.js crypto module not initialized");
    }
    if (!fs) {
      throw new Error(ERROR_MESSAGE_FS_NOT_INITIALIZED);
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
        `Atomic write failed: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`,
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

        logger.debug("LOGGER_NAME", "File lock acquired", {
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
        logger.warn("LOGGER_NAME", "Removed stale file lock", {
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
  private async releaseFileLock({
    lockId,
    filePath,
  }: {
    lockId: string;
    filePath: string;
  }): Promise<void> {
    const existingLock = this.activeLocks.get(filePath);

    if (existingLock?.lockId === lockId) {
      this.activeLocks.delete(filePath);
      logger.debug("LOGGER_NAME", "File lock released", {
        filePath,
        lockId,
      });
    } else {
      logger.warn(
        "LOGGER_NAME",
        "Attempted to release non-existent or mismatched lock",
        { filePath, lockId },
      );
    }
  }

  /**
   * Check available disk space
   */
  private async ensureSufficientDiskSpace(basePath: string): Promise<void> {
    try {
      if (!fs) {
        throw new Error(ERROR_MESSAGE_FS_NOT_INITIALIZED);
      }
      const stats = await fs.statfs(basePath);
      const availableBytes = stats.bavail * stats.bsize;

      if (availableBytes < this.config.minDiskSpaceBytes) {
        throw new Error(
          `Insufficient disk space: ${this.formatBytes(availableBytes)} available, ` +
            `${this.formatBytes(this.config.minDiskSpaceBytes)} required`,
        );
      }

      logger.debug("LOGGER_NAME", "Disk space check passed", {
        availableBytes,
        requiredBytes: this.config.minDiskSpaceBytes,
      });
    } catch (error) {
      // If statfs is not available or directory doesn't exist yet, skip the check
      if (error instanceof Error && (error.message.includes("ENOSYS") || error.message.includes("ENOENT"))) {
        logger.warn(
          "LOGGER_NAME",
          error.message.includes("ENOSYS")
            ? "Disk space checking not available on this platform"
            : "Base path does not exist yet, skipping disk space check",
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

      while (currentPath?.startsWith(basePath)) {
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
        `Index update failed: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`,
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

    const indexPath = path.join(directoryPath, INDEX_FILE_NAME);
    const basePath = path.resolve(this.config.basePath);
    const relativePath = path
      .relative(basePath, directoryPath)
      .replace(/\\/g, "/");
    const displayPath = relativePath ? `/${relativePath}` : "/";

    try {
      // Read existing index or create new one
      let oldIndexData: DirectoryIndex | null = null;
      let indexData: DirectoryIndex = {
        lastUpdated: new Date().toISOString(),
      };

      try {
        const existingContent = await fs.readFile(indexPath, "utf8");
        const parsedData: unknown = JSON.parse(existingContent);
        if (!isDirectoryIndex(parsedData)) {
          throw new Error(`Invalid directory index format in ${indexPath}`);
        }
        // parsedData is validated as DirectoryIndex by isDirectoryIndex
        oldIndexData = parsedData;
        indexData = {
          // Preserve existing lastUpdated initially
          lastUpdated: parsedData.lastUpdated,
          ...(parsedData.directories &&
            Object.keys(parsedData.directories).length > 0 && {
              directories: parsedData.directories,
            }),
          ...(parsedData.files &&
            Object.keys(parsedData.files).length > 0 && {
              files: parsedData.files,
            }),
        };
      } catch {
        // File doesn't exist, use default structure
      }

      const isContainingDirectory = directoryPath === filePaths.directoryPath;

      // Handle containing directory case
      if (
        isContainingDirectory &&
        entityInfo.isQueryResponse &&
        entityInfo.queryParams
      ) {
        const filename = path.basename(filePaths.dataFile, ".json");
        indexData.files ??= {};
        const responseDataToCache = this.excludeMetaField(data.responseData);
        indexData.files[filename] = {
          url: data.url,
          $ref: `./${filename}.json`,
          lastRetrieved: new Date().toISOString(),
          contentHash: await generateContentHash(responseDataToCache),
        };

        // Only update lastUpdated if content has actually changed
        if (oldIndexData && indexContentEquals(oldIndexData, indexData)) {
          indexData.lastUpdated = oldIndexData.lastUpdated;
        } else {
          indexData.lastUpdated = new Date().toISOString();
        }

        await this.writeFileAtomic({
          filePath: indexPath,
          content: JSON.stringify(indexData, null, 2),
        });
        return;
      }

      // Handle parent directory case
      if (!isContainingDirectory) {
        const relativePath = path.relative(
          directoryPath,
          filePaths.directoryPath,
        );
        const childDirName = relativePath.split(path.sep)[0];
        if (childDirName && childDirName !== ".") {
          indexData.directories ??= {};
          indexData.directories[childDirName] = {
            $ref: `./${childDirName}`,
            lastModified: new Date().toISOString(),
          };
        }
      }

      // Only update lastUpdated if content has actually changed
      if (oldIndexData && indexContentEquals(oldIndexData, indexData)) {
        // Content is identical, preserve old lastUpdated timestamp
        indexData.lastUpdated = oldIndexData.lastUpdated;
      } else {
        // Content has changed or this is a new index, update timestamp
        indexData.lastUpdated = new Date().toISOString();
      }

      // Write updated index
      await this.writeFileAtomic({
        filePath: indexPath,
        content: JSON.stringify(indexData, null, 2),
      });

      logger.debug("cache", "Updated directory index", {
        indexPath,
        relativePath: displayPath,
        isContainingDirectory,
        hasFiles: Object.keys(indexData.files ?? {}).length > 0,
        hasDirectories: Object.keys(indexData.directories ?? {}).length > 0,
      });
    } catch (error) {
      logError(logger, "Failed to update directory index", error);
      throw new Error(
        `Directory index update failed: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`,
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

    logger.debug("LOGGER_NAME", "DiskCacheWriter cleanup completed");
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
