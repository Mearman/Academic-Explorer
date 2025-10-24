/**
 * Helper functions for extracting display data from GraphNode entity data on-demand
 * No artificial metadata properties - all data extracted directly from entityData
 */

import type { GraphNode } from "../types"

/**
 * Get display name for a node - extracted on-demand from entity data
 */
export function getNodeDisplayName(node: GraphNode): string {
	const displayName = node.entityData?.["display_name"]
	if (displayName && typeof displayName === "string") {
		return displayName
	}
	return node.label
}

/**
 * Get citation count for a node - extracted on-demand from entity data
 */
export function getNodeCitationCount(node: GraphNode): number | undefined {
	if (node.entityData?.["cited_by_count"] !== undefined) {
		return Number(node.entityData["cited_by_count"])
	}
	return undefined
}

/**
 * Get publication year for a node - extracted on-demand from entity data
 */
export function getNodeYear(node: GraphNode): number | undefined {
	if (node.entityData?.["publication_year"] !== undefined) {
		return Number(node.entityData["publication_year"])
	}
	return undefined
}

/**
 * Get open access status for a node - extracted on-demand from entity data
 */
export function getNodeOpenAccess(node: GraphNode): boolean | undefined {
	function isOpenAccessRecord(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object"
	}

	const openAccess = node.entityData?.["open_access"]
	if (isOpenAccessRecord(openAccess) && openAccess["is_oa"] !== undefined) {
		return Boolean(openAccess["is_oa"])
	}
	return undefined
}

/**
 * Get works count for an author node - extracted on-demand from entity data
 */
export function getNodeWorksCount(node: GraphNode): number | undefined {
	if (node.entityType === "authors" && node.entityData?.["works_count"] !== undefined) {
		return Number(node.entityData["works_count"])
	}
	return undefined
}

/**
 * Get h-index for an author node - extracted on-demand from entity data
 */
export function getNodeHIndex(node: GraphNode): number | undefined {
	if (node.entityType === "authors") {
		function isSummaryStatsRecord(value: unknown): value is Record<string, unknown> {
			return value !== null && typeof value === "object"
		}

		const summaryStats = node.entityData?.["summary_stats"]
		if (isSummaryStatsRecord(summaryStats) && summaryStats["h_index"] !== undefined) {
			return Number(summaryStats["h_index"])
		}
	}
	return undefined
}

/**
 * Get ORCID for an author node - extracted on-demand from entity data
 */
export function getNodeOrcid(node: GraphNode): string | undefined {
	if (node.entityType === "authors") {
		const orcid = node.entityData?.["orcid"]
		if (orcid && typeof orcid === "string") {
			return orcid
		}
	}
	return undefined
}

/**
 * Get institution name for an institution node - extracted on-demand from entity data
 */
export function getNodeInstitutionName(node: GraphNode): string | undefined {
	if (node.entityType === "institutions") {
		const displayName = node.entityData?.["display_name"]
		if (displayName && typeof displayName === "string") {
			return displayName
		}
	}
	return undefined
}

/**
 * Get country code for an institution node - extracted on-demand from entity data
 */
export function getNodeCountryCode(node: GraphNode): string | undefined {
	if (node.entityType === "institutions") {
		const countryCode = node.entityData?.["country_code"]
		if (countryCode && typeof countryCode === "string") {
			return countryCode
		}
	}
	return undefined
}

/**
 * Get source type for a source node - extracted on-demand from entity data
 */
export function getNodeSourceType(node: GraphNode): string | undefined {
	if (node.entityType === "sources") {
		const sourceType = node.entityData?.["type"]
		if (sourceType && typeof sourceType === "string") {
			return sourceType
		}
	}
	return undefined
}

/**
 * Check if node has specific field in entity data
 */
export function nodeHasField(node: GraphNode, field: string): boolean {
	return node.entityData?.[field] !== undefined
}

/**
 * Get any field value from node entity data with type safety
 */
export function getNodeField(node: GraphNode, field: string): unknown {
	return node.entityData?.[field]
}

/**
 * Get nested field value from node entity data
 */
export function getNodeNestedField(node: GraphNode, path: string): unknown {
	if (!node.entityData) return undefined

	function isRecord(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object"
	}

	const keys = path.split(".")
	let current: Record<string, unknown> = node.entityData

	for (const key of keys) {
		if (current[key] === undefined) return undefined
		const nextValue = current[key]
		if (!isRecord(nextValue)) {
			// If this is the last key, return the value, otherwise return undefined
			return keys[keys.length - 1] === key ? nextValue : undefined
		}
		current = nextValue
	}

	return current
}

/**
 * Check if node is currently being loaded (has pending data fetch)
 */
export function isNodeLoading(): boolean {
	// In true on-demand system, we don't track loading state artificially
	// Loading is handled at the component/hook level when data is actually needed
	return false
}

/**
 * Check if node has error in data loading
 */
export function nodeHasError(): boolean {
	// Errors are handled at the component/hook level, not stored in node
	return false
}

/**
 * Get a summary of available data fields for debugging
 */
export function getNodeDataSummary(node: GraphNode): {
	hasEntityData: boolean
	fieldCount: number
	availableFields: string[]
} {
	if (!node.entityData) {
		return {
			hasEntityData: false,
			fieldCount: 0,
			availableFields: [],
		}
	}

	const fields = Object.keys(node.entityData)
	return {
		hasEntityData: true,
		fieldCount: fields.length,
		availableFields: fields,
	}
}
