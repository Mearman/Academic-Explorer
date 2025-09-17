/**
 * Version manager for cache invalidation on application updates
 * Automatically clears cache when application version changes
 */

import { logger } from "@/lib/logger";
import { getBuildInfo, type BuildInfo } from "@/lib/build-info";

/**
 * Application metadata stored in cache
 */
export interface AppMetadata {
  version: string;
  buildTimestamp?: string;
  commitHash?: string;
  lastCacheInvalidation: string;
  installationTime: string;
}

/**
 * Get current application version from build metadata
 */
export function getCurrentAppVersion(): string {
	try {
		const buildInfo = getBuildInfo();
		return buildInfo.version;
	} catch {
		// Fallback for development or if build info is unavailable
		return "dev";
	}
}

/**
 * Get full build information
 */
export function getCurrentBuildInfo(): BuildInfo | null {
	try {
		return getBuildInfo();
	} catch {
		return null;
	}
}

/**
 * Create app metadata for storage
 */
export function createAppMetadata(): AppMetadata {
	const buildInfo = getCurrentBuildInfo();
	const now = new Date().toISOString();

	return {
		version: getCurrentAppVersion(),
		buildTimestamp: buildInfo?.buildTimestamp,
		commitHash: buildInfo?.commitHash,
		lastCacheInvalidation: now,
		installationTime: now,
	};
}

/**
 * Check if two versions are different
 * Handles semantic versioning and development versions
 */
export function isVersionChange(oldVersion: string, newVersion: string): boolean {
	// Always invalidate for development versions
	if (oldVersion === "dev" || newVersion === "dev") {
		return oldVersion !== newVersion;
	}

	// For production versions, compare directly
	return oldVersion !== newVersion;
}

/**
 * Compare versions and determine if cache should be invalidated
 */
export function shouldInvalidateCache(
	storedMetadata: AppMetadata | null,
	currentVersion: string
): { shouldInvalidate: boolean; reason?: string } {
	// No stored metadata - first run or corrupted storage
	if (!storedMetadata) {
		return {
			shouldInvalidate: true,
			reason: "No stored version metadata found (first run or corrupted storage)"
		};
	}

	// Version change detection
	if (isVersionChange(storedMetadata.version, currentVersion)) {
		return {
			shouldInvalidate: true,
			reason: `Version changed from ${storedMetadata.version} to ${currentVersion}`
		};
	}

	// For development builds, also check commit hash if available
	if (currentVersion === "dev" || currentVersion.includes("dev")) {
		const buildInfo = getCurrentBuildInfo();
		if (buildInfo?.commitHash &&
        storedMetadata.commitHash &&
        buildInfo.commitHash !== storedMetadata.commitHash) {
			return {
				shouldInvalidate: true,
				reason: `Development build commit changed from ${storedMetadata.commitHash.slice(0, 7)} to ${buildInfo.commitHash.slice(0, 7)}`
			};
		}
	}

	return { shouldInvalidate: false };
}

/**
 * Log version comparison information
 */
export function logVersionComparison(
	storedMetadata: AppMetadata | null,
	currentVersion: string,
	shouldInvalidate: boolean,
	reason?: string
): void {
	if (shouldInvalidate) {
		logger.warn("cache", "Cache invalidation triggered by version change", {
			oldVersion: storedMetadata?.version || "none",
			newVersion: currentVersion,
			reason,
			oldCommit: storedMetadata?.commitHash?.slice(0, 7),
			newCommit: getCurrentBuildInfo()?.commitHash?.slice(0, 7)
		});
	} else {
		logger.info("cache", "Version check passed - cache preserved", {
			version: currentVersion,
			buildTime: getCurrentBuildInfo()?.buildTimestamp
		});
	}
}