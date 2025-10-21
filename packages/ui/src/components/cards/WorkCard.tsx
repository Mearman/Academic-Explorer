import type { Work } from "@academic-explorer/types"
import { ActionIcon, Badge, Card, Group, Stack, Text } from "@mantine/core"
import { IconExternalLink, IconLock, IconLockOpen } from "@tabler/icons-react"
import React from "react"

export type WorkCardProps = {
	work: Work
	onNavigate?: (path: string) => void
	className?: string
	showAuthors?: boolean
}

/**
 * Specialized card component for displaying Work entities
 * Shows title, authors, publication year, citations, open access status, and DOI
 */
export const WorkCard: React.FC<WorkCardProps> = ({
	work,
	onNavigate,
	className,
	showAuthors = true,
}) => {
	// Use work data directly (validation should happen at API/client level)
	const validatedWork = work

	const href = `/works/${validatedWork.id}`
	const isOA = validatedWork.open_access?.is_oa || false

	const handleClick = () => {
		if (onNavigate) {
			onNavigate(href)
		}
	}

	// Get author names from authorships
	const authorNames =
		validatedWork.authorships
			?.slice(0, 3)
			.map((a) => a.author?.display_name)
			.filter(Boolean) || []
	const hasMoreAuthors = (validatedWork.authorships?.length || 0) > 3

	return (
		<Card
			shadow="sm"
			padding="md"
			radius="md"
			withBorder
			className={className}
			style={{ cursor: "pointer" }}
			onClick={handleClick}
		>
			<Stack gap="sm">
				{/* Header with type badge and OA status */}
				<Group justify="space-between" wrap="nowrap">
					<Group gap="xs">
						<Badge color="blue" variant="light">
							Work
						</Badge>
						{isOA ? (
							<Badge color="green" variant="light" leftSection={<IconLockOpen size={12} />}>
								Open Access
							</Badge>
						) : (
							<Badge color="gray" variant="light" leftSection={<IconLock size={12} />}>
								Closed
							</Badge>
						)}
					</Group>
					<ActionIcon
						variant="subtle"
						size="sm"
						onClick={(e) => {
							e.stopPropagation()
							if (onNavigate) {
								onNavigate(href)
							}
						}}
					>
						<IconExternalLink size={16} />
					</ActionIcon>
				</Group>

				{/* Title */}
				<Text fw={600} size="md" lineClamp={2}>
					{validatedWork.title || validatedWork.display_name}
				</Text>

				{/* Authors */}
				{showAuthors && authorNames.length > 0 && (
					<Text size="sm" c="dimmed" lineClamp={1}>
						{authorNames.join(", ")}
						{hasMoreAuthors && " et al."}
					</Text>
				)}

				{/* Publication info */}
				<Group gap="md">
					{validatedWork.publication_year && (
						<Text size="sm" c="dimmed">
							<Text component="span" fw={500}>
								{validatedWork.publication_year}
							</Text>
						</Text>
					)}
					{(validatedWork.primary_location?.source as { display_name?: string } | undefined)
						?.display_name && (
						<Text size="sm" c="dimmed" lineClamp={1}>
							{(validatedWork.primary_location?.source as { display_name?: string }).display_name}
						</Text>
					)}
				</Group>

				{/* Metrics */}
				<Group gap="md">
					<Text size="sm" c="dimmed">
						<Text component="span" fw={500}>
							{validatedWork.cited_by_count?.toLocaleString() || 0}
						</Text>{" "}
						citations
					</Text>
					{validatedWork.referenced_works_count !== undefined && (
						<Text size="sm" c="dimmed">
							<Text component="span" fw={500}>
								{validatedWork.referenced_works_count.toLocaleString()}
							</Text>{" "}
							references
						</Text>
					)}
				</Group>

				{/* DOI and Type */}
				<Group gap="xs">
					{validatedWork.type && (
						<Badge color="gray" variant="dot" size="sm">
							{validatedWork.type}
						</Badge>
					)}
					{validatedWork.doi && (
						<Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
							{validatedWork.doi}
						</Text>
					)}
				</Group>

				{/* OpenAlex ID */}
				<Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
					{validatedWork.id}
				</Text>
			</Stack>
		</Card>
	)
}
