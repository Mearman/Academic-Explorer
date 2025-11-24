import { Badge } from "@mantine/core";
import type { EntityType } from "@academic-explorer/types";
import { ENTITY_METADATA } from "@academic-explorer/types";

export interface EntityTypeBadgeProps {
	entityType: EntityType;
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	variant?: "filled" | "light" | "outline";
}

/**
 * Badge component for displaying entity types with color-coding
 *
 * @example
 * ```tsx
 * <EntityTypeBadge entityType="works" />
 * <EntityTypeBadge entityType="authors" size="md" variant="filled" />
 * ```
 */
export function EntityTypeBadge({
	entityType,
	size = "sm",
	variant = "light",
}: EntityTypeBadgeProps) {
	const metadata = ENTITY_METADATA[entityType];

	return (
		<Badge color={metadata.color} size={size} variant={variant}>
			{metadata.displayName}
		</Badge>
	);
}
