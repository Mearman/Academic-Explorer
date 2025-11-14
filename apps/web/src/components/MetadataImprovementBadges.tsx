/**
 * MetadataImprovementBadges Component
 *
 * Displays badge indicators for works with improved metadata in OpenAlex Data Version 2.
 * Shows badges for improvements in references, locations, and other metadata fields.
 *
 * Related:
 * - T014: Badge Integration
 * - T015: Visual Styling
 * - 013-metadata-improvement-badges
 */

import { Group } from "@mantine/core";
import { Badge } from "@academic-explorer/ui";
import {
	detectMetadataImprovements,
	type WorkMetadata,
	type MetadataImprovement,
} from "@academic-explorer/utils";

export interface MetadataImprovementBadgesProps {
	/**
	 * Work data containing metadata fields for improvement detection
	 */
	work: WorkMetadata;

	/**
	 * Test ID for E2E testing
	 */
	"data-testid"?: string;
}

/**
 * Maps improvement types to badge variants
 * Uses semantic colors for different improvement types
 */
const IMPROVEMENT_VARIANT_MAP: Record<
	MetadataImprovement["type"],
	"success" | "info" | "warning"
> = {
	references: "info", // Blue for references
	locations: "success", // Green for locations
	language: "info",
	topics: "info",
	keywords: "info",
	license: "info",
};

/**
 * MetadataImprovementBadges Component
 *
 * Displays badges for detected metadata improvements in academic works.
 * Returns null if no improvements are detected or if the work is an XPAC work.
 *
 * Features:
 * - Automatic improvement detection using utility function
 * - Semantic color coding based on improvement type
 * - Horizontal layout with consistent spacing
 * - Returns null for cleaner rendering when no improvements exist
 *
 * @example
 * ```tsx
 * // In a work detail page
 * <MetadataImprovementBadges
 *   work={{
 *     referenced_works_count: 15,
 *     locations_count: 3,
 *     is_xpac: false
 *   }}
 * />
 * // Renders: [Improved references data] [Improved locations data]
 *
 * // For XPAC works (returns null)
 * <MetadataImprovementBadges
 *   work={{ is_xpac: true }}
 * />
 * // Renders: null
 * ```
 */
export function MetadataImprovementBadges({
	work,
	"data-testid": dataTestId = "metadata-improvement-badges",
}: MetadataImprovementBadgesProps) {
	// Detect improvements using utility function
	const improvements = detectMetadataImprovements(work);

	// Return null if no improvements detected
	if (improvements.length === 0) {
		return null;
	}

	return (
		<Group gap="xs" data-testid={dataTestId}>
			{improvements.map((improvement, index) => (
				<Badge
					key={`${improvement.type}-${index}`}
					variant={IMPROVEMENT_VARIANT_MAP[improvement.type]}
					size="sm"
					style="light"
					data-testid={`improvement-badge-${improvement.type}`}
				>
					{improvement.description}
				</Badge>
			))}
		</Group>
	);
}
