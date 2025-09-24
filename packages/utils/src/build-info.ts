/**
 * Build information utilities
 * Provides functions to work with build metadata and generate links
 */

import { getRelativeTime } from "./date-helpers.js";

export interface BuildInfo {
  buildTimestamp: string;
  commitHash: string;
  shortCommitHash: string;
  commitTimestamp: string;
  branchName: string;
  version: string;
  repositoryUrl: string;
}

/**
 * Get build information from global metadata injected during build
 * This relies on build-time metadata injection via Vite or similar bundler
 */
export function getBuildInfo(): BuildInfo {
  // Check if build metadata is available globally (injected by build process)
  const globalBuildInfo = (globalThis as Record<string, unknown>)['__BUILD_INFO__'] as BuildInfo | undefined;

  if (globalBuildInfo) {
    return globalBuildInfo;
  }

  // Fallback for development or when build info is not available
  return {
    buildTimestamp: new Date().toISOString(),
    commitHash: 'unknown',
    shortCommitHash: 'unknown',
    commitTimestamp: new Date().toISOString(),
    branchName: 'unknown',
    version: '0.0.0-dev',
    repositoryUrl: 'https://github.com/Mearman/Academic-Explorer'
  };
}

/**
 * Format build timestamp to human-readable string
 */
export function formatBuildTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch {
    return 'Unknown';
  }
}

/**
 * Generate GitHub commit URL
 */
export function getCommitUrl(repositoryUrl: string, commitHash: string): string {
  if (commitHash === 'unknown' || !repositoryUrl) {
    return repositoryUrl || '#';
  }

  // Handle both github.com and raw GitHub URLs
  const baseUrl = repositoryUrl.replace(/\.git$/, '');
  return `${baseUrl}/commit/${commitHash}`;
}

/**
 * Generate GitHub release URL
 */
export function getReleaseUrl(repositoryUrl: string, version: string): string {
  if (version === '0.0.0-dev' || !repositoryUrl) {
    return repositoryUrl || '#';
  }

  // Handle both github.com and raw GitHub URLs
  const baseUrl = repositoryUrl.replace(/\.git$/, '');

  // Check if version starts with 'v', if not add it
  const tagVersion = version.startsWith('v') ? version : `v${version}`;

  return `${baseUrl}/releases/tag/${tagVersion}`;
}

/**
 * Get relative time since build
 */
export function getRelativeBuildTime(buildTimestamp: string): string {
  try {
    const buildDate = new Date(buildTimestamp);
    return getRelativeTime(buildDate);
  } catch {
    return 'unknown time ago';
  }
}