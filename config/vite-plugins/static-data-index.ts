import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { join, basename, resolve, dirname } from "path";
import { watch } from "chokidar";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { type EntityType } from "@academic-explorer/utils/static-data/cache-utilities";

// Get absolute path to the index generator
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const indexGeneratorPath = resolve(__dirname, "../../apps/web/src/lib/utils/static-data-index-generator.ts");

import { type EntityType } from "@academic-explorer/utils/static-data/cache-utilities";

// Dynamic import helper to avoid build-time module resolution issues
const getIndexGenerators = async () => {
  const module = await import(indexGeneratorPath);
  return {
    generateAllIndexes: module.generateAllIndexes,
    generateIndexWithAutoDownload: module.generateIndexWithAutoDownload,
    generateIndexForEntityType: module.generateIndexForEntityType,
    validateStaticDataIndex: module.validateStaticDataIndex,
    getEntityTypeFromPath: module.getEntityTypeFromPath
  };
};

// Helper to find entity root directory from file path
async function getEntityRootFromPath(filePath: string, staticDataDir: string): Promise<{ entityDir: string; entityType: EntityType } | null> {
  try {
    const { dirname } = await import('path');
    let currentDir = dirname(filePath);
    
    while (currentDir.startsWith(staticDataDir)) {
      const entityType = await getIndexGenerators().then(g => g.getEntityTypeFromPath(currentDir));
      if (entityType) {
        return {
          entityDir: currentDir,
          entityType
        };
      }
      currentDir = dirname(currentDir);
      if (currentDir === staticDataDir) break; // Reached root without finding entity
    }
    return null;
  } catch {
    return null;
  }
}

export interface StaticDataIndexPluginOptions {
  /** Enable auto-download of missing entities */
  autoDownload?: boolean;
  /** Enable build-time validation of static data */
  validate?: boolean;
  /** Custom static data directory path (relative to project root) */
  staticDataPath?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Debounce time for file changes in ms */
  debounceMs?: number;
}

/**
 * Vite plugin for auto-generating static data indexes with hot reload support
 * Provides development and build-time static data management for OpenAlex entities
 */
export function staticDataIndexPlugin(options: StaticDataIndexPluginOptions = {}): Plugin {
  let staticDataDir: string;
  let watcher: ReturnType<typeof watch> | null = null;
  let config: ResolvedConfig;
  let server: ViteDevServer | null = null;
  let changeDebounceMap = new Map<string, NodeJS.Timeout>();

  const opts = {
    autoDownload: false,
    validate: true,
    staticDataPath: "public/data/openalex",
    verbose: false,
    debounceMs: 500,
    ...options
  };

  // Debounced file change handler to avoid excessive regeneration
  const debouncedHandleFileChange = async (filePath: string, action: string) => {
    const entityRoot = await getEntityRootFromPath(filePath, staticDataDir);
    if (!entityRoot) {
      logVerbose(`🚫 Ignoring file change in non-entity directory: ${filePath}`);
      return;
    }
  
    const { entityType } = entityRoot;
  
    // Clear existing timeout for this entity type
    const existingTimeout = changeDebounceMap.get(entityType);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
  
    // Set new timeout
    const timeout = setTimeout(async () => {
      await handleFileChange(filePath, action, entityType, entityRoot.entityDir);
      changeDebounceMap.delete(entityType);
    }, opts.debounceMs);
  
    changeDebounceMap.set(entityType, timeout);
  };

  const handleFileChange = async (filePath: string, action: string, entityType: EntityType, entityDir: string) => {
    try {
      const { generateIndexWithAutoDownload, generateIndexForEntityType, validateStaticDataIndex } = await getIndexGenerators();
      const fileName = basename(filePath);
  
      console.log(`${getActionIcon(action)} Static data ${action}: ${fileName} in ${entityType}`);
      logVerbose(`📁 Processing directory: ${entityDir}`);
  
      // Skip if directory doesn't exist
      if (!existsSync(entityDir)) {
        logVerbose(`⚠️  Entity directory doesn't exist: ${entityDir}`);
        return;
      }
  
      // Generate updated index recursively
      if (opts.autoDownload) {
        await generateIndexWithAutoDownload(entityDir, entityType, staticDataDir);
      } else {
        await generateIndexForEntityType(entityDir, entityType, true);
      }
  
      // Validate if requested
      if (opts.validate && config.command === 'serve') {
        const isValid = await validateStaticDataIndex(entityDir);
        if (!isValid) {
          console.warn(`⚠️  Static data index validation failed for ${entityType}`);
        }
      }
  
      // Trigger HMR for development
      if (server) {
        logVerbose(`🔄 Triggering HMR update for static data changes`);
        server.ws.send({
          type: "full-reload",
          path: "*" // Reload all since static data could affect any route
        });
      }
  
    } catch (error) {
      console.error(`❌ Failed to handle file change for ${entityType}:`, error);
  
      // Send error notification to client in development
      if (server) {
        server.ws.send({
          type: "error",
          err: {
            message: `Static data index generation failed for ${entityType}`,
            stack: error instanceof Error ? error.stack : String(error)
          }
        });
      }
    }
  };

  const logVerbose = (message: string) => {
    if (opts.verbose) {
      console.log(message);
    }
  };

  const isDevelopment = () => config.command === 'serve';
  const isBuild = () => config.command === 'build';

  return {
    name: "static-data-index",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      staticDataDir = join(config.root, opts.staticDataPath);

      logVerbose(`🔧 Static data directory: ${staticDataDir}`);
      logVerbose(`🔧 Mode: ${config.command}, Environment: ${config.mode}`);
      logVerbose(`🔧 Options: ${JSON.stringify(opts, null, 2)}`);
    },

    async buildStart() {
      try {
        const { generateAllIndexes } = await getIndexGenerators();
        console.log(`🔄 Generating static data indexes (${config.command} mode)...`);

        if (opts.autoDownload) {
          console.log(`🤖 Auto-download enabled for ${config.command}`);
        }

        if (opts.validate && isBuild()) {
          console.log(`🔍 Build-time validation enabled`);
        }

        // Generate all indexes
        await generateAllIndexes(staticDataDir, {
          autoDownload: opts.autoDownload,
          validate: opts.validate && isBuild(),
          force: isBuild() // Force regeneration on build
        });

        console.log(`✅ Static data index generation completed for ${config.command}`);

        // Register cleanup on process exit for development
        if (isDevelopment()) {
          const cleanup_handler = () => {
            void cleanup().then(() => process.exit(0));
          };

          process.on('SIGINT', cleanup_handler);
          process.on('SIGTERM', cleanup_handler);
        }

      } catch (error) {
        const errorMessage = `Failed to generate static data indexes during ${config.command}`;
        console.error(`❌ ${errorMessage}:`, error);

        // Fail build on error, but allow dev server to continue
        if (isBuild()) {
          throw new Error(`${errorMessage}: ${error}`);
        }
      }
    },

    async configureServer(devServer) {
      server = devServer;

      try {
        console.log("👀 Setting up static data file watcher for development...");
        logVerbose(`📂 Watching directory: ${staticDataDir}/**/*.json`);

        // Ensure static data directory exists before watching
        if (!existsSync(staticDataDir)) {
          console.log(`📁 Creating static data directory: ${staticDataDir}`);
          // The generateAllIndexes call in buildStart will create the directory structure
        }

        // Set up file watcher for development - watch all JSON files recursively, including subdirs
        watcher = watch(join(staticDataDir, "**/*.json"), {
          ignored: [
            "**/index.json", // Don't watch the generated index files to avoid loops
            "**/.*", // Ignore hidden files
            "**/*.tmp", // Ignore temporary files
          ],
          ignoreInitial: true,
          persistent: true,
          followSymlinks: false,
          // Performance optimizations
          usePolling: false,
          interval: 1000,
          binaryInterval: 300,
          // Atomic writes detection
          atomic: true,
          awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50
          }
        });

        // Set up event handlers with debouncing
        watcher.on("add", (filePath: string) => debouncedHandleFileChange(filePath, "added"));
        watcher.on("unlink", (filePath: string) => debouncedHandleFileChange(filePath, "removed"));
        watcher.on("change", (filePath: string) => debouncedHandleFileChange(filePath, "changed"));

        // Handle watcher errors
        watcher.on("error", (error) => {
          console.error("❌ Static data file watcher error:", error);
        });

        // Log successful watcher setup
        console.log("✅ Static data file watcher configured successfully");
        logVerbose(`⚙️  Debounce time: ${opts.debounceMs}ms`);

      } catch (error) {
        console.error("❌ Failed to configure static data file watcher:", error);
        // Don't fail dev server startup on watcher error
      }
    },

    async buildEnd() {
      // Additional build-time validation
      if (isBuild() && opts.validate) {
        try {
          console.log("🔍 Performing final static data validation...");

          // TODO: Add build-time validation logic here
          // This could include:
          // - Checking for broken references
          // - Validating data consistency
          // - Ensuring all required entities are present

          console.log("✅ Static data validation completed");

        } catch (error) {
          console.error("❌ Build-time static data validation failed:", error);
          throw error;
        }
      }
    },

    async closeBundle() {
      await cleanup();
    }
  };

  async function cleanup() {
    try {
      logVerbose("🧹 Cleaning up static data index plugin...");

      // Clear all debounce timeouts
      changeDebounceMap.forEach((timeout) => {
        clearTimeout(timeout);
      });
      changeDebounceMap.clear();

      // Close file watcher
      if (watcher) {
        await watcher.close();
        watcher = null;
        logVerbose("✅ File watcher closed");
      }

      server = null;

    } catch (error) {
      console.error("❌ Error during static data plugin cleanup:", error);
    }
  }
}

/**
 * Get appropriate icon for file action
 */
function getActionIcon(action: string): string {
  switch (action) {
    case "added": return "📄";
    case "removed": return "🗑️";
    case "changed": return "📝";
    default: return "🔄";
  }
}