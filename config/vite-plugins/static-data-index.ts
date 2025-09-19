import type { Plugin } from "vite";
import { join, basename } from "path";
import { watch } from "chokidar";
import { generateAllIndexes, generateIndexWithAutoDownload, generateIndexForEntityType } from "../../src/lib/utils/static-data-index-generator";

/**
 * Vite plugin for auto-generating static data indexes with hot reload support
 */
export function staticDataIndexPlugin(options: { autoDownload?: boolean } = {}): Plugin {
  let staticDataDir: string;
  let watcher: ReturnType<typeof watch> | null = null;

  return {
    name: "static-data-index",
    configResolved(config) {
      staticDataDir = join(config.root, "public", "data", "openalex");
    },
    async buildStart() {
      // Generate indexes at build start
      console.log("🔄 Generating static data indexes...");
      if (options.autoDownload) {
        console.log("🔄 Auto-download enabled for build");
      }
      await generateAllIndexes(staticDataDir, { autoDownload: options.autoDownload });
    },
    async configureServer(server) {
      // Set up file watcher for development
      console.log("👀 Setting up static data file watcher...");

      watcher = watch(join(staticDataDir, "**/*.json"), {
        ignored: "**/index.json", // Don't watch the generated index files
        ignoreInitial: true,
        persistent: true
      });

      const handleFileChange = async (filePath: string, action: string) => {
        const entityType = basename(join(filePath, ".."));
        const entityDir = join(staticDataDir, entityType);
        console.log(`${getActionIcon(action)} File ${action}: ${basename(filePath)} in ${entityType}`);

        if (options.autoDownload) {
          await generateIndexWithAutoDownload(entityDir, entityType, staticDataDir);
        } else {
          await generateIndexForEntityType(entityDir, entityType);
        }

        // Trigger HMR for any modules that might depend on the index
        server.ws.send({
          type: "full-reload"
        });
      };

      watcher.on("add", (filePath: string) => void handleFileChange(filePath, "added"));
      watcher.on("unlink", (filePath: string) => void handleFileChange(filePath, "removed"));
      watcher.on("change", (filePath: string) => void handleFileChange(filePath, "changed"));

      // Generate initial indexes
      if (options.autoDownload) {
        console.log("🔄 Auto-download enabled for development");
      }
      await generateAllIndexes(staticDataDir, { autoDownload: options.autoDownload });
    },
    async closeBundle() {
      // Clean up watcher
      if (watcher) {
        await watcher.close();
        watcher = null;
      }
    }
  };
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