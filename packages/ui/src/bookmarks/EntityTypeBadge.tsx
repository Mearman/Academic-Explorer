import { Badge, type MantineColor } from "@mantine/core";
import type { EntityType } from "@academic-explorer/types";

export interface EntityTypeBadgeProps {
	entityType: EntityType;
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	variant?: "filled" | "light" | "outline";
}

/**
 * Maps entity types to their corresponding Mantine colors
 */
const ENTITY_TYPE_COLORS: Record<EntityType, MantineColor> = {
	works: "violet",
	authors: "blue",
	sources: "teal",
	institutions: "orange",
	topics: "pink",
	concepts: "yellow",
	publishers: "indigo",
	funders: "lime",
	keywords: "grape",
};

/**
 * Capitalizes the first letter of a string
 */
function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
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
	const color = ENTITY_TYPE_COLORS[entityType];
	const label = capitalize(entityType);

	return (
		<Badge color={color} size={size} variant={variant}>
			{label}
		</Badge>
	);
}
