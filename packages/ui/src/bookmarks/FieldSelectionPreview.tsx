/**
 * Field Selection Preview Component
 *
 * Displays a preview of custom field selections for bookmarked entities.
 * Shows field count and optionally field names with smart summarization.
 *
 * Related:
 * - T030: Display field selection preview in bookmark list items
 * - User Story 2: Bookmark Custom Field Views
 */

import { Badge, Group, Text, Tooltip, Stack } from "@mantine/core";
import { IconListDetails } from "@tabler/icons-react";
import {
	generateCompactFieldSummary,
	generateDetailedFieldSummary,
	generateFieldListPreview,
	generateSmartFieldSummary,
} from "@academic-explorer/utils";

export interface FieldSelectionPreviewProps {
	/**
	 * Array of selected field names
	 */
	selectFields?: string[];

	/**
	 * Display variant: 'badge', 'text', 'detailed', 'smart'
	 * @default 'badge'
	 */
	variant?: "badge" | "text" | "detailed" | "smart";

	/**
	 * Size of the component
	 * @default 'sm'
	 */
	size?: "xs" | "sm" | "md" | "lg";

	/**
	 * Whether to show a tooltip with full field list
	 * @default true
	 */
	showTooltip?: boolean;

	/**
	 * Maximum number of fields to show in detailed view
	 * @default 3
	 */
	maxFieldsToShow?: number;

	/**
	 * Custom data-testid for testing
	 */
	"data-testid"?: string;
}

/**
 * FieldSelectionPreview Component
 *
 * Displays a visual preview of custom field selections for bookmarks.
 *
 * @example
 * ```tsx
 * // Badge variant (default)
 * <FieldSelectionPreview selectFields={['id', 'title', 'doi']} />
 *
 * // Detailed variant with field names
 * <FieldSelectionPreview
 *   selectFields={['id', 'title', 'doi', 'cited_by_count']}
 *   variant="detailed"
 * />
 *
 * // Smart variant with category highlights
 * <FieldSelectionPreview
 *   selectFields={['id', 'doi', 'works_count', 'cited_by_count']}
 *   variant="smart"
 * />
 * ```
 */
export function FieldSelectionPreview({
	selectFields = [],
	variant = "badge",
	size = "sm",
	showTooltip = true,
	maxFieldsToShow = 3,
	"data-testid": dataTestId = "field-selection-preview",
}: FieldSelectionPreviewProps) {
	// If no fields or empty array, show "default fields"
	if (!selectFields || selectFields.length === 0) {
		return (
			<Badge
				size={size}
				variant="light"
				color="gray"
				leftSection={<IconListDetails size={12} />}
				data-testid={dataTestId}
			>
				default
			</Badge>
		);
	}

	// Generate summary based on variant
	const summary =
		variant === "badge"
			? generateCompactFieldSummary(selectFields)
			: variant === "detailed"
				? generateDetailedFieldSummary(selectFields, maxFieldsToShow)
				: variant === "smart"
					? generateSmartFieldSummary(selectFields)
					: generateCompactFieldSummary(selectFields);

	// Generate tooltip content (full field list)
	const tooltipLabel = showTooltip ? (
		<Stack gap="xs">
			<Text size="sm" fw={600}>
				Custom field selection:
			</Text>
			<Text size="sm">{generateFieldListPreview(selectFields, 100)}</Text>
		</Stack>
	) : null;

	// Badge variant
	if (variant === "badge") {
		const badge = (
			<Badge
				size={size}
				variant="light"
				color="blue"
				leftSection={<IconListDetails size={12} />}
				data-testid={dataTestId}
			>
				{summary}
			</Badge>
		);

		if (showTooltip && tooltipLabel) {
			return (
				<Tooltip label={tooltipLabel} multiline w={300}>
					{badge}
				</Tooltip>
			);
		}

		return badge;
	}

	// Text variant
	if (variant === "text") {
		const textContent = (
			<Group gap="xs" data-testid={dataTestId}>
				<IconListDetails size={14} style={{ color: "var(--mantine-color-blue-6)" }} />
				<Text size={size} c="dimmed">
					{summary}
				</Text>
			</Group>
		);

		if (showTooltip && tooltipLabel) {
			return (
				<Tooltip label={tooltipLabel} multiline w={300}>
					{textContent}
				</Tooltip>
			);
		}

		return textContent;
	}

	// Detailed variant
	if (variant === "detailed") {
		const detailedContent = (
			<Group gap="xs" data-testid={dataTestId}>
				<IconListDetails size={14} style={{ color: "var(--mantine-color-blue-6)" }} />
				<Text size={size} c="dimmed">
					{summary}
				</Text>
			</Group>
		);

		if (showTooltip && tooltipLabel) {
			return (
				<Tooltip label={tooltipLabel} multiline w={300}>
					{detailedContent}
				</Tooltip>
			);
		}

		return detailedContent;
	}

	// Smart variant
	const smartContent = (
		<Group gap="xs" data-testid={dataTestId}>
			<IconListDetails size={14} style={{ color: "var(--mantine-color-blue-6)" }} />
			<Text size={size} c="dimmed">
				{summary}
			</Text>
		</Group>
	);

	if (showTooltip && tooltipLabel) {
		return (
			<Tooltip label={tooltipLabel} multiline w={300}>
				{smartContent}
			</Tooltip>
		);
	}

	return smartContent;
}

/**
 * Compact Field Badge Component
 *
 * A compact badge-only variant for displaying field count.
 * Useful for space-constrained UIs.
 *
 * @example
 * ```tsx
 * <CompactFieldBadge selectFields={['id', 'title', 'doi']} />
 * ```
 */
export function CompactFieldBadge({
	selectFields = [],
	size = "xs",
	"data-testid": dataTestId = "compact-field-badge",
}: {
	selectFields?: string[];
	size?: "xs" | "sm" | "md";
	"data-testid"?: string;
}) {
	const summary = generateCompactFieldSummary(selectFields);
	const tooltipLabel = selectFields.length > 0 ? generateFieldListPreview(selectFields, 100) : null;

	const badge = (
		<Badge
			size={size}
			variant="dot"
			color={selectFields.length > 0 ? "blue" : "gray"}
			data-testid={dataTestId}
		>
			{summary}
		</Badge>
	);

	if (tooltipLabel) {
		return (
			<Tooltip label={tooltipLabel} multiline w={300}>
				{badge}
			</Tooltip>
		);
	}

	return badge;
}
