/**
 * Build metadata utilities
 * Provides access to build-time information like version, commit hash, and timestamps
 */

export interface BuildInfo {
	buildTimestamp: string
	commitHash: string
	shortCommitHash: string
	commitTimestamp: string
	branchName: string
	version: string
	repositoryUrl: string
}

// Type declaration for global build info
declare global {
	// eslint-disable-next-line no-var
	var __BUILD_INFO__: BuildInfo
}

/**
 * Get build information injected at build time
 */
export function getBuildInfo(): BuildInfo {
	// In development, provide fallback values
	if (typeof __BUILD_INFO__ === "undefined") {
		return {
			buildTimestamp: new Date().toISOString(),
			commitHash: "dev-local",
			shortCommitHash: "dev",
			commitTimestamp: new Date().toISOString(),
			branchName: "local",
			version: "0.0.0-dev",
			repositoryUrl: "https://github.com/Mearman/Academic-Explorer"
		}
	}

	return __BUILD_INFO__
}

/**
 * Format a timestamp for display
 */
export function formatBuildTimestamp(timestamp: string): string {
	try {
		const date = new Date(timestamp)
		return date.toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			timeZoneName: "short"
		})
	} catch {
		return timestamp
	}
}

/**
 * Get GitHub commit URL
 */
export function getCommitUrl(repositoryUrl: string, commitHash: string): string {
	if (commitHash === "unknown" || commitHash === "dev-local") {
		return repositoryUrl
	}
	return `${repositoryUrl}/commit/${commitHash}`
}

/**
 * Get GitHub release URL for a version
 */
export function getReleaseUrl(repositoryUrl: string, version: string): string {
	if (version === "unknown" || version.includes("dev")) {
		return `${repositoryUrl}/releases`
	}
	return `${repositoryUrl}/releases/tag/v${version}`
}

/**
 * Get relative time description for build timestamp
 */
export function getRelativeBuildTime(buildTimestamp: string): string {
	try {
		const buildDate = new Date(buildTimestamp)
		const now = new Date()
		const diffMs = now.getTime() - buildDate.getTime()

		const diffMinutes = Math.floor(diffMs / (1000 * 60))
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

		if (diffMinutes < 1) {
			return "Just now"
		} else if (diffMinutes < 60) {
			return `${String(diffMinutes)}m ago`
		} else if (diffHours < 24) {
			return `${String(diffHours)}h ago`
		} else if (diffDays < 7) {
			return `${String(diffDays)}d ago`
		} else {
			return formatBuildTimestamp(buildTimestamp)
		}
	} catch {
		return "Unknown"
	}
}