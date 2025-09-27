/**
 * Disk-based cache writing system for OpenAlex API responses
 * Handles writing intercepted responses to public/data/openalex/ structure
 * with atomic operations, file locking, and metadata generation
 */

import type { EntityType, OpenAlexResponse, OpenAlexEntity } from '../../types';
import { logger, logError } from '../../internal/logger';

// Dynamic imports for Node.js modules to avoid browser bundling issues
let fs: any;
let path: any;
let crypto: any;

/**
 * Initialize Node.js modules (required before using any file operations)
 */
async function initializeNodeModules(): Promise<void> {
  if (!fs || !path || !crypto) {
    const [fsModule, pathModule, cryptoModule] = await Promise.all([
      import('node:fs'),
      import('node:path'),
      import('node:crypto')
    ]);
    fs = fsModule.promises;
    path = pathModule;
    crypto = cryptoModule;
  }
}

/**
 * Configuration for disk cache writer
 */
export interface DiskWriterConfig {
  /** Base path for cache storage (defaults to public/data/openalex) */
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
 * Disk space information
 */
interface DiskSpaceInfo {
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
      basePath: config.basePath ?? 'public/data/openalex',
      maxConcurrentWrites: config.maxConcurrentWrites ?? 10,
      lockTimeoutMs: config.lockTimeoutMs ?? 5000,
      checkDiskSpace: config.checkDiskSpace ?? true,
      minDiskSpaceBytes: config.minDiskSpaceBytes ?? 100 * 1024 * 1024, // 100MB
    };

    logger.debug('DiskCacheWriter initialized', { config: this.config });
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
   */
  private async _writeToCache(data: InterceptedData): Promise<void> {
    try {
      // Initialize Node.js modules
      await initializeNodeModules();

      // Validate input data
      this.validateInterceptedData(data);

      // Check disk space if enabled
      if (this.config.checkDiskSpace) {
        await this.ensureSufficientDiskSpace();
      }

      // Extract entity information from URL or response
      const entityInfo = await this.extractEntityInfo(data);

      // Generate file paths
      const filePaths = this.generateFilePaths(entityInfo);

      // Acquire file lock
      const lockId = await this.acquireFileLock(filePaths.dataFile);

      try {
        // Ensure directory structure exists
        await this.ensureDirectoryStructure(path.dirname(filePaths.dataFile));

        // Prepare content and metadata
        const content = JSON.stringify(data.responseData, null, 2);
        const contentHash = await this.generateContentHash(content);

        const metadata: CacheMetadata = {
          url: data.url,
          method: data.method,
          requestHeaders: data.requestHeaders,
          statusCode: data.statusCode,
          responseHeaders: data.responseHeaders,
          timestamp: data.timestamp,
          contentType: data.responseHeaders['content-type'],
          cacheWriteTime: new Date().toISOString(),
          entityType: entityInfo.entityType,
          entityId: entityInfo.entityId,
          fileSizeBytes: Buffer.byteLength(content, 'utf8'),
          contentHash,
        };

        // Write files atomically
        await this.writeFileAtomic(filePaths.dataFile, content);
        await this.writeFileAtomic(filePaths.metadataFile, JSON.stringify(metadata, null, 2));

        logger.debug('Cache write successful', {
          entityType: entityInfo.entityType,
          entityId: entityInfo.entityId,
          dataFile: filePaths.dataFile,
          metadataFile: filePaths.metadataFile,
          fileSizeBytes: metadata.fileSizeBytes,
        });

      } finally {
        // Always release the lock
        await this.releaseFileLock(lockId, filePaths.dataFile);
      }

    } catch (error) {
      logError('Failed to write cache data', error);
      throw new Error(`Cache write failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract entity type and ID from URL or response data
   */
  private async extractEntityInfo(data: InterceptedData): Promise<{
    entityType?: EntityType;
    entityId?: string;
  }> {
    try {
      // Try to extract from URL first
      const urlInfo = this.extractEntityInfoFromUrl(data.url);
      if (urlInfo.entityType && urlInfo.entityId) {
        return urlInfo;
      }

      // Try to extract from response data
      const responseInfo = this.extractEntityInfoFromResponse(data.responseData);
      if (responseInfo.entityType && responseInfo.entityId) {
        return responseInfo;
      }

      // Default fallback - use URL hash
      const urlHash = await this.generateContentHash(data.url);
      return {
        entityType: 'works', // Default entity type
        entityId: `unknown_${urlHash.substring(0, 8)}`,
      };

    } catch (error) {
      logError('Failed to extract entity info', error);
      throw new Error(`Entity info extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract entity info from URL path
   */
  private extractEntityInfoFromUrl(url: string): {
    entityType?: EntityType;
    entityId?: string;
  } {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      // OpenAlex API URL pattern: /entity_type/entity_id
      if (pathParts.length >= 2) {
        const entityType = pathParts[0] as EntityType;
        const entityId = pathParts[1];

        // Validate entity type
        const validEntityTypes: EntityType[] = [
          'works', 'authors', 'sources', 'institutions',
          'topics', 'concepts', 'publishers', 'funders', 'keywords'
        ];

        if (validEntityTypes.includes(entityType) && entityId) {
          return { entityType, entityId };
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
  } {
    try {
      // Single entity response
      if (this.isOpenAlexEntity(responseData)) {
        const entityType = this.detectEntityType(responseData);
        return {
          entityType,
          entityId: responseData.id,
        };
      }

      // Collection response
      if (this.isOpenAlexResponse(responseData) && responseData.results.length > 0) {
        const firstResult = responseData.results[0];
        if (this.isOpenAlexEntity(firstResult)) {
          const entityType = this.detectEntityType(firstResult);
          return {
            entityType,
            entityId: `collection_${Date.now()}`,
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
    return typeof data === 'object' &&
           data !== null &&
           typeof (data as { id?: unknown }).id === 'string' &&
           typeof (data as { display_name?: unknown }).display_name === 'string';
  }

  /**
   * Type guard for OpenAlex response
   */
  private isOpenAlexResponse(data: unknown): data is OpenAlexResponse<OpenAlexEntity> {
    return typeof data === 'object' &&
           data !== null &&
           Array.isArray((data as { results?: unknown }).results) &&
           typeof (data as { meta?: unknown }).meta === 'object';
  }

  /**
   * Detect entity type from entity data
   */
  private detectEntityType(entity: OpenAlexEntity): EntityType {
    // Try to detect based on specific properties
    if ('doi' in entity || 'publication_year' in entity) return 'works';
    if ('orcid' in entity || 'last_known_institutions' in entity) return 'authors';
    if ('issn_l' in entity || 'publisher' in entity) return 'sources';
    if ('ror' in entity || 'country_code' in entity) return 'institutions';
    if ('description' in entity && 'keywords' in entity) return 'topics';
    if ('wikidata' in entity && 'level' in entity) return 'concepts';
    if ('hierarchy_level' in entity || 'parent_publisher' in entity) return 'publishers';
    if ('grants_count' in entity) return 'funders';

    // Default fallback
    return 'works';
  }

  /**
   * Generate file paths for data and metadata
   */
  private generateFilePaths(entityInfo: {
    entityType?: EntityType;
    entityId?: string;
  }): {
    dataFile: string;
    metadataFile: string;
  } {
    const entityType = entityInfo.entityType ?? 'unknown';
    const entityId = entityInfo.entityId ?? 'unknown';

    // Sanitize entity ID for filesystem
    const sanitizedId = this.sanitizeFilename(entityId);

    const dataFile = path.join(this.config.basePath, entityType, `${sanitizedId}.json`);
    const metadataFile = path.join(this.config.basePath, entityType, `${sanitizedId}.meta.json`);

    return { dataFile, metadataFile };
  }

  /**
   * Sanitize filename to be filesystem-safe
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 200); // Limit length
  }

  /**
   * Ensure directory structure exists
   */
  private async ensureDirectoryStructure(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logError('Failed to create directory structure', error);
      throw new Error(`Directory creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Write file atomically using temporary file
   */
  private async writeFileAtomic(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp.${crypto.randomUUID()}`;

    try {
      // Write to temporary file first
      await fs.writeFile(tempPath, content, 'utf8');

      // Atomically move to final location
      await fs.rename(tempPath, filePath);

    } catch (error) {
      // Clean up temporary file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }

      logError('Atomic file write failed', error);
      throw new Error(`Atomic write failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Acquire file lock for concurrent access control
   */
  private async acquireFileLock(filePath: string): Promise<string> {
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

        logger.debug('File lock acquired', { filePath, lockId });
        return lockId;
      }

      // Check for stale locks (older than timeout)
      const existingLock = this.activeLocks.get(filePath);
      if (existingLock && Date.now() - existingLock.timestamp > maxWaitTime) {
        // Remove stale lock
        this.activeLocks.delete(filePath);
        logger.warn('Removed stale file lock', { filePath, staleLockId: existingLock.lockId });
        continue;
      }

      // Wait before retrying
      await this.sleep(50);
    }

    throw new Error(`Failed to acquire file lock for ${filePath} within ${maxWaitTime}ms`);
  }

  /**
   * Release file lock
   */
  private async releaseFileLock(lockId: string, filePath: string): Promise<void> {
    const existingLock = this.activeLocks.get(filePath);

    if (existingLock && existingLock.lockId === lockId) {
      this.activeLocks.delete(filePath);
      logger.debug('File lock released', { filePath, lockId });
    } else {
      logger.warn('Attempted to release non-existent or mismatched lock', { filePath, lockId });
    }
  }

  /**
   * Generate content hash for integrity verification
   */
  private async generateContentHash(content: string): Promise<string> {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Check available disk space
   */
  private async ensureSufficientDiskSpace(): Promise<void> {
    try {
      const stats = await fs.statfs(this.config.basePath);
      const availableBytes = stats.bavail * stats.bsize;

      if (availableBytes < this.config.minDiskSpaceBytes) {
        throw new Error(
          `Insufficient disk space: ${this.formatBytes(availableBytes)} available, ` +
          `${this.formatBytes(this.config.minDiskSpaceBytes)} required`
        );
      }

      logger.debug('Disk space check passed', {
        availableBytes,
        requiredBytes: this.config.minDiskSpaceBytes,
      });

    } catch (error) {
      // If statfs is not available, skip the check
      if (error instanceof Error && error.message.includes('ENOSYS')) {
        logger.warn('Disk space checking not available on this platform');
        return;
      }

      throw error;
    }
  }

  /**
   * Format bytes for human-readable display
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
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
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid intercepted data: must be an object');
    }

    const requiredFields = ['url', 'method', 'responseData', 'statusCode', 'timestamp'];
    const missingFields = requiredFields.filter(field => !(field in data));

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (typeof data.url !== 'string' || !data.url) {
      throw new Error('Invalid URL: must be a non-empty string');
    }

    if (typeof data.statusCode !== 'number' || data.statusCode < 100 || data.statusCode > 599) {
      throw new Error('Invalid status code: must be a number between 100-599');
    }

    if (!data.responseData) {
      throw new Error('Invalid response data: must be present');
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current cache statistics
   */
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

    logger.debug('DiskCacheWriter cleanup completed');
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