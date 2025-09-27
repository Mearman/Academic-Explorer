/**
 * Disk cache module - Write intercepted OpenAlex responses to disk
 *
 * This module provides functionality for writing captured API responses
 * to a structured disk cache with atomic operations, metadata, and
 * concurrent access control.
 *
 * @example
 * ```typescript
 * import { DiskCacheWriter, writeToDiskCache } from '@academic-explorer/client/cache/disk';
 *
 * // Using the default writer instance
 * await writeToDiskCache({
 *   url: 'https://api.openalex.org/works/W123',
 *   method: 'GET',
 *   requestHeaders: { 'Accept': 'application/json' },
 *   responseData: { id: 'W123', display_name: 'Example Work' },
 *   statusCode: 200,
 *   responseHeaders: { 'content-type': 'application/json' },
 *   timestamp: new Date().toISOString(),
 * });
 *
 * // Using a custom configured writer
 * const writer = new DiskCacheWriter({
 *   basePath: '/custom/cache/path',
 *   maxConcurrentWrites: 5,
 *   lockTimeoutMs: 10000,
 * });
 *
 * await writer.writeToCache(interceptedData);
 * ```
 */

export {
  DiskCacheWriter,
  defaultDiskWriter,
  writeToDiskCache,
} from './disk-writer';

export type {
  DiskWriterConfig,
  CacheMetadata,
  InterceptedData,
} from './disk-writer';