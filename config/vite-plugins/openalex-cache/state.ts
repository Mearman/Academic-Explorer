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
    this.staticDataDir = join(
      config.root,
      options.staticDataPath || "public/data/openalex",
    );
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
