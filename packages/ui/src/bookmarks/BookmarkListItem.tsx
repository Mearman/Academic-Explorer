import type { Bookmark, EntityType } from "@academic-explorer/types";
import { ActionIcon, Badge, Card, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { FieldSelectionPreview } from "./FieldSelectionPreview";

/**
 * Props for the BookmarkListItem component
 */
export interface BookmarkListItemProps {
	/**
	 * The bookmark to display
	 */
	bookmark: Bookmark;

	/**
	 * Callback fired when the delete button is clicked
	 * @param bookmarkId - ID of the bookmark to delete
	 */
	onDelete: (bookmarkId: string) => void | Promise<void>;

	/**
	 * Callback fired when the bookmark is clicked
	 * @param url - URL to navigate to
	 */
	onNavigate: (url: string) => void;

	/**
	 * Optional test ID for E2E testing
	 */
	"data-testid"?: string;
}

/**
 * Get a display-friendly label for entity type
 */
function getEntityTypeLabel(entityType: EntityType): string {
	// Capitalize first letter and return
	return entityType.charAt(0).toUpperCase() + entityType.slice(1);
}

/**
 * Get a color for entity type badges
 */
function getEntityTypeColor(entityType: EntityType): string {
	const colorMap: Record<EntityType, string> = {
		works: "blue",
		authors: "green",
		sources: "orange",
		institutions: "purple",
		topics: "pink",
		concepts: "cyan",
		publishers: "grape",
		funders: "yellow",
		keywords: "teal",
	};
	return colorMap[entityType] || "gray";
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 */
function formatRelativeTime(date: Date): string {
	// Handle invalid dates
	if (!date || isNaN(date.getTime())) {
		return "Invalid date";
	}

	const now = Date.now();
	const timestamp = date.getTime();
	const diffMs = now - timestamp;

	// Handle future dates
	if (diffMs < 0) {
		return "in the future";
	}

	const SECOND = 1000;
	const MINUTE = 60 * SECOND;
	const HOUR = 60 * MINUTE;
	const DAY = 24 * HOUR;
	const WEEK = 7 * DAY;
	const MONTH = 30 * DAY;
	const YEAR = 365 * DAY;

	// Just now (< 10 seconds)
	if (diffMs < 10 * SECOND) {
		return "just now";
	}

	// Seconds (< 1 minute)
	if (diffMs < MINUTE) {
		const seconds = Math.floor(diffMs / SECOND);
		return `${seconds} ${seconds === 1 ? "second" : "seconds"} ago`;
	}

	// Minutes (< 1 hour)
	if (diffMs < HOUR) {
		const minutes = Math.floor(diffMs / MINUTE);
		return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
	}

	// Hours (< 1 day)
	if (diffMs < DAY) {
		const hours = Math.floor(diffMs / HOUR);
		return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
	}

	// Days (< 1 week)
	if (diffMs < WEEK) {
		const days = Math.floor(diffMs / DAY);
		return `${days} ${days === 1 ? "day" : "days"} ago`;
	}

	// Weeks (< 1 month)
	if (diffMs < MONTH) {
		const weeks = Math.floor(diffMs / WEEK);
		return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
	}

	// Months (< 1 year)
	if (diffMs < YEAR) {
		const months = Math.floor(diffMs / MONTH);
		return `${months} ${months === 1 ? "month" : "months"} ago`;
	}

	// Years
	const years = Math.floor(diffMs / YEAR);
	return `${years} ${years === 1 ? "year" : "years"} ago`;
}

/**
 * Component for displaying individual bookmarks in a list
 *
 * Features:
 * - Entity type badge with color coding
 * - Bookmark title and timestamp
 * - Optional notes display (truncated)
 * - Delete button with confirmation tooltip
 * - Clickable card to navigate to bookmarked page
 * - Hover effects for interactivity
 *
 * @example
 * ```tsx
 * <BookmarkListItem
 *   bookmark={bookmark}
 *   onDelete={(id) => handleDelete(id)}
 *   onNavigate={(url) => navigate(url)}
 * />
 * ```
 */
export function BookmarkListItem({
	bookmark,
	onDelete,
	onNavigate,
	...restProps
}: BookmarkListItemProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	// Handle card click (navigate to bookmark)
	const handleCardClick = () => {
		onNavigate(bookmark.metadata.url);
	};

	// Handle delete button click (prevent card click propagation)
	const handleDeleteClick = async (event: React.MouseEvent) => {
		event.stopPropagation();

		if (!bookmark.id) {
			return;
		}

		setIsDeleting(true);
		try {
			await onDelete(bookmark.id);
		} finally {
			setIsDeleting(false);
		}
	};

	// Format timestamp
	const timestampText = formatRelativeTime(bookmark.metadata.timestamp);

	// Truncate notes if they exist and are too long
	const maxNotesLength = 150;
	const truncatedNotes =
		bookmark.notes && bookmark.notes.length > maxNotesLength
			? `${bookmark.notes.slice(0, maxNotesLength)}...`
			: bookmark.notes;

	return (
		<Card
			shadow="sm"
			padding="md"
			radius="md"
			withBorder
			style={{
				cursor: "pointer",
				transition: "transform 0.1s ease, box-shadow 0.1s ease",
			}}
			onClick={handleCardClick}
			{...restProps}
			__vars={{
				"--card-hover-transform": "translateY(-2px)",
				"--card-hover-shadow": "md",
			}}
			styles={{
				root: {
					"&:hover": {
						transform: "var(--card-hover-transform)",
						boxShadow: "var(--mantine-shadow-md)",
					},
				},
			}}
		>
			<Stack gap="xs">
				{/* Header: Entity type badge and delete button */}
				<Group justify="space-between" align="flex-start">
					<Badge
						color={getEntityTypeColor(bookmark.entityType)}
						variant="light"
						size="sm"
					>
						{getEntityTypeLabel(bookmark.entityType)}
					</Badge>

					<Tooltip label="Delete bookmark" withinPortal>
						<ActionIcon
							variant="subtle"
							color="red"
							size="sm"
							onClick={handleDeleteClick}
							disabled={isDeleting}
							loading={isDeleting}
							aria-label="Delete bookmark"
						>
							<IconTrash size={16} />
						</ActionIcon>
					</Tooltip>
				</Group>

				{/* Title */}
				<Text fw={500} size="md" lineClamp={2}>
					{bookmark.metadata.title}
				</Text>

				{/* Notes (if available) */}
				{truncatedNotes && (
					<Text size="sm" c="dimmed" lineClamp={3} fs="italic">
						{truncatedNotes}
					</Text>
				)}

				{/* Footer: Timestamp and field selection preview */}
				<Group gap="xs" mt="xs" justify="space-between" wrap="wrap">
					<Text size="xs" c="dimmed">
						{timestampText}
					</Text>

					{/* Field selection preview - only show if custom fields are selected */}
					{bookmark.metadata.selectFields && bookmark.metadata.selectFields.length > 0 && (
						<FieldSelectionPreview
							selectFields={bookmark.metadata.selectFields}
							variant="badge"
							size="xs"
						/>
					)}
				</Group>
			</Stack>
		</Card>
	);
}
