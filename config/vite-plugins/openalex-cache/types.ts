export interface OpenAlexCachePluginOptions {
  /** Custom static data directory path (relative to project root) */
  staticDataPath?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Enable request caching (default: true in development) */
  enabled?: boolean;
  /**
   * Dry-run mode: Log all intended changes (file writes, index updates) without actually
   * modifying the filesystem. Useful for testing migration strategies, verifying collision
   * detection, or previewing the impact of cache regeneration without risking data loss.
   * When enabled, the plugin simulates all operations and outputs JSON previews of what
   * would be written to index files.
   */
  dryRun?: boolean;
}

export interface CachedResponse {
  data: unknown;
  headers: Record<string, string>;
  timestamp: string;
  url: string;
}

export interface CacheContext {
  staticDataDir: string;
  verbose: boolean;
  dryRun: boolean;
}

export interface IndexUpdateContext extends CacheContext {
  debounceManager: DebounceManager;
}

export interface DebounceManager {
  debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    ...args: Parameters<T>
  ): void;
  clear(key: string): void;
}
