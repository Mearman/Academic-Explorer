/**
 * Environment detection utilities for Academic Explorer
 *
 * Detects development vs production mode using NODE_ENV, process.env, and build context.
 * Provides robust environment detection for both browser and Node.js environments.
 */

/**
 * Environment mode enumeration
 */
export enum EnvironmentMode {
  DEVELOPMENT = "development",
  PRODUCTION = "production",
  TEST = "test",
}

/**
 * Build context information
 */
export interface BuildContext {
  /** Whether this is a development build */
  isDevelopment: boolean;
  /** Whether this is a production build */
  isProduction: boolean;
  /** Whether this is a test environment */
  isTest: boolean;
  /** Current environment mode */
  mode: EnvironmentMode;
  /** Build timestamp if available */
  buildTimestamp?: string;
  /** Commit hash if available */
  commitHash?: string;
  /** Whether running in browser context */
  isBrowser: boolean;
  /** Whether running in Node.js context */
  isNode: boolean;
  /** Whether running in worker context */
  isWorker: boolean;
  /** Whether development server is detected */
  isDevServer: boolean;
  /** Whether this is a GitHub Pages deployment */
  isGitHubPages: boolean;
  /** Current hostname (browser only) */
  hostname?: string;
  /** Current protocol (browser only) */
  protocol?: string;
}

/**
 * Runtime environment detection utilities
 */
export class EnvironmentDetector {
  private static _cachedContext: BuildContext | undefined;

  /**
   * Detect the current environment mode from NODE_ENV and other indicators
   */
  static detectMode(): EnvironmentMode {
    // Check NODE_ENV first (most reliable)
    const nodeEnvMode = this.getModeFromNodeEnv();
    if (nodeEnvMode) return nodeEnvMode;

    // Check Vite environment variables
    const viteMode = this.getModeFromViteEnv();
    if (viteMode) return viteMode;

    // Check global __DEV__ flag (from Vite define)
    const devFlagMode = this.getModeFromDevFlag();
    if (devFlagMode) return devFlagMode;

    // Browser-based detection
    const browserMode = this.getModeFromBrowser();
    if (browserMode) return browserMode;

    // Default to development if uncertain
    return EnvironmentMode.DEVELOPMENT;
  }

  private static getModeFromNodeEnv(): EnvironmentMode | null {
    if (
      globalThis.process?.env?.NODE_ENV
    ) {
      const nodeEnv = globalThis.process.env.NODE_ENV.toLowerCase();
      switch (nodeEnv) {
        case "production":
          return EnvironmentMode.PRODUCTION;
        case "test":
          return EnvironmentMode.TEST;
        case "development":
          return EnvironmentMode.DEVELOPMENT;
      }
    }
    return null;
  }

  private static getModeFromViteEnv(): EnvironmentMode | null {
    if (typeof import.meta !== "undefined") {
      try {
        const viteEnv = (import.meta as { env?: Record<string, unknown> }).env;
        if (viteEnv) {
          const viteMode = (viteEnv.MODE as string | undefined)?.toLowerCase();
          switch (viteMode) {
            case "production":
              return EnvironmentMode.PRODUCTION;
            case "test":
              return EnvironmentMode.TEST;
            case "development":
              return EnvironmentMode.DEVELOPMENT;
          }

          // Check Vite's DEV flag
          if ((viteEnv.DEV as boolean | undefined) === true)
            return EnvironmentMode.DEVELOPMENT;
          if ((viteEnv.PROD as boolean | undefined) === true)
            return EnvironmentMode.PRODUCTION;
        }
      } catch {
        // Ignore errors if import.meta.env is not available
      }
    }
    return null;
  }

  private static getModeFromDevFlag(): EnvironmentMode | null {
    if (typeof globalThis !== "undefined" && "__DEV__" in globalThis) {
      try {
        const devFlag = (globalThis as unknown as { __DEV__?: boolean })
          .__DEV__;
        return devFlag
          ? EnvironmentMode.DEVELOPMENT
          : EnvironmentMode.PRODUCTION;
      } catch {
        // Ignore errors if __DEV__ is not accessible
      }
    }
    return null;
  }

  private static getModeFromBrowser(): EnvironmentMode | null {
    if (typeof window !== "undefined") {
      const hostname = window.location?.hostname;

      // Local development indicators
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname?.endsWith(".local")
      ) {
        return EnvironmentMode.DEVELOPMENT;
      }

      // Development port indicators
      const port = window.location?.port;
      if (port && ["3000", "5173", "8080", "4173"].includes(port)) {
        return EnvironmentMode.DEVELOPMENT;
      }

      // GitHub Pages or custom domain = production
      if (
        hostname === "academic-explorer.joenash.uk" ||
        hostname?.endsWith(".github.io")
      ) {
        return EnvironmentMode.PRODUCTION;
      }
    }
    return null;
  }

  /**
   * Detect if running in browser context
   */
  static isBrowser(): boolean {
    return typeof window !== "undefined" && typeof document !== "undefined";
  }

  /**
   * Detect if running in Node.js context
   */
  static isNode(): boolean {
    return (
      globalThis.process?.versions?.node !== undefined
    );
  }

  /**
   * Detect if running in Web Worker context
   */
  static isWorker(): boolean {
    return (
      typeof globalThis !== "undefined" &&
      "importScripts" in globalThis &&
      typeof window === "undefined"
    );
  }

  /**
   * Detect if development server is running
   */
  static isDevServer(): boolean {
    if (!this.isBrowser()) return false;

    const hostname = window.location?.hostname;
    const port = window.location?.port;
    const protocol = window.location?.protocol;

    // Local development indicators
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return true;
    }

    // Development ports
    if (port && ["3000", "5173", "8080", "4173"].includes(port)) {
      return true;
    }

    // HTTP in development (vs HTTPS in production)
    if (protocol === "http:" && hostname !== "localhost") {
      return true;
    }

    return false;
  }

  /**
   * Detect if running on GitHub Pages
   */
  static isGitHubPages(): boolean {
    if (!this.isBrowser()) return false;

    const hostname = window.location?.hostname;
    return (
      hostname === "academic-explorer.joenash.uk" ||
      hostname?.endsWith(".github.io") ||
      false
    );
  }

  /**
   * Get build information from injected metadata
   */
  static getBuildInfo(): { buildTimestamp?: string; commitHash?: string } {
    try {
      // Check for Vite-injected build info
      if (typeof globalThis !== "undefined" && "__BUILD_INFO__" in globalThis) {
        try {
          const buildInfo = (
            globalThis as unknown as {
              __BUILD_INFO__?: {
                buildTimestamp?: string;
                commitHash?: string;
                shortCommitHash?: string;
              };
            }
          ).__BUILD_INFO__;
          if (buildInfo && typeof buildInfo === "object") {
            return {
              buildTimestamp: buildInfo.buildTimestamp,
              commitHash: buildInfo.commitHash || buildInfo.shortCommitHash,
            };
          }
        } catch {
          // Ignore errors if __BUILD_INFO__ is not accessible
        }
      }
    } catch {
      // Ignore errors in build info detection
    }

    return {};
  }

  /**
   * Get current hostname (browser only)
   */
  static getHostname(): string | undefined {
    if (this.isBrowser()) {
      return window.location?.hostname;
    }
    return undefined;
  }

  /**
   * Get current protocol (browser only)
   */
  static getProtocol(): string | undefined {
    if (this.isBrowser()) {
      return window.location?.protocol;
    }
    return undefined;
  }

  /**
   * Get complete build context with caching
   */
  static getBuildContext(): BuildContext {
    if (this._cachedContext) {
      return this._cachedContext;
    }

    const mode = this.detectMode();
    const buildInfo = this.getBuildInfo();
    const isBrowser = this.isBrowser();
    const isNode = this.isNode();
    const isWorker = this.isWorker();
    const isDevServer = this.isDevServer();
    const isGitHubPages = this.isGitHubPages();

    this._cachedContext = {
      isDevelopment: mode === EnvironmentMode.DEVELOPMENT,
      isProduction: mode === EnvironmentMode.PRODUCTION,
      isTest: mode === EnvironmentMode.TEST,
      mode,
      buildTimestamp: buildInfo.buildTimestamp,
      commitHash: buildInfo.commitHash,
      isBrowser,
      isNode,
      isWorker,
      isDevServer,
      isGitHubPages,
      hostname: this.getHostname(),
      protocol: this.getProtocol(),
    };

    return this._cachedContext;
  }

  /**
   * Clear cached context (useful for testing)
   */
  static clearCache(): void {
    this._cachedContext = undefined;
  }

  /**
   * Get a human-readable environment description
   */
  static getEnvironmentDescription(): string {
    const context = this.getBuildContext();

    if (context.isTest) {
      return "Test Environment";
    }

    if (context.isDevelopment) {
      if (context.isDevServer) {
        return `Development Server (${context.hostname}:${window.location?.port || "unknown"})`;
      }
      return "Development Build";
    }

    if (context.isProduction) {
      if (context.isGitHubPages) {
        return `Production (GitHub Pages: ${context.hostname})`;
      }
      return "Production Build";
    }

    return "Unknown Environment";
  }
}

/**
 * Convenience function to get current environment mode
 */
export function getCurrentEnvironmentMode(): EnvironmentMode {
  return EnvironmentDetector.detectMode();
}

/**
 * Convenience function to check if in development mode
 */
export function isDevelopment(): boolean {
  return EnvironmentDetector.detectMode() === EnvironmentMode.DEVELOPMENT;
}

/**
 * Convenience function to check if in production mode
 */
export function isProduction(): boolean {
  return EnvironmentDetector.detectMode() === EnvironmentMode.PRODUCTION;
}

/**
 * Convenience function to check if in test mode
 */
export function isTest(): boolean {
  return EnvironmentDetector.detectMode() === EnvironmentMode.TEST;
}

/**
 * Convenience function to get complete build context
 */
export function getBuildContext(): BuildContext {
  return EnvironmentDetector.getBuildContext();
}
