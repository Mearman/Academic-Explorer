/**
 * Global type declarations for build-time constants
 * These are injected by bundlers like Vite during the build process
 */

interface BuildInfo {
  buildTimestamp: string;
  commitHash: string;
  shortCommitHash: string;
  commitTimestamp: string;
  branchName: string;
  version: string;
  repositoryUrl: string;
}

// Build-time constants replaced by bundler (e.g., Vite's define option)
// These may not be available in all environments (e.g., Node.js/CLI)
declare const __BUILD_INFO__: BuildInfo | undefined;
declare const __DEV__: boolean | undefined;