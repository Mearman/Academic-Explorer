import type { ResolvedConfig } from "vite";
import { join } from "path";
import { DebounceManager } from "./debounce-manager";
import type { OpenAlexCachePluginOptions, CacheContext } from "./types";

export class PluginState {
  private config?: ResolvedConfig;
  private staticDataDir?: string;
  private debounceManager = new DebounceManager();
  private options?: OpenAlexCachePluginOptions;

  setConfig(config: ResolvedConfig, options: OpenAlexCachePluginOptions): void {
    this.config = config;
    this.options = options;

    const staticDataPath = options.staticDataPath || "public/data/openalex";

    // If path starts with "apps/", treat as absolute from workspace root
    // Otherwise, treat as relative to project root
    if (staticDataPath.startsWith("apps/")) {
      // Find workspace root (parent of apps/ directory)
      const workspaceRoot = config.root.includes("/apps/")
        ? config.root.substring(0, config.root.indexOf("/apps/") + 1)
        : config.root;
      this.staticDataDir = join(workspaceRoot, staticDataPath);
    } else {
      this.staticDataDir = join(config.root, staticDataPath);
    }
  }

  getConfig(): ResolvedConfig | undefined {
    return this.config;
  }

  getOptions(): OpenAlexCachePluginOptions | undefined {
    return this.options;
  }

  getContext(): CacheContext {
    if (!this.staticDataDir || !this.options) {
      throw new Error("Plugin state not initialized");
    }
    return {
      staticDataDir: this.staticDataDir,
      verbose: this.options.verbose || false,
      dryRun: this.options.dryRun || false,
    };
  }

  getDebounceManager(): DebounceManager {
    return this.debounceManager;
  }

  getStaticDataDir(): string | undefined {
    return this.staticDataDir;
  }
}
