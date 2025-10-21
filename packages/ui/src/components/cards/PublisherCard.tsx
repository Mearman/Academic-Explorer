import type { Publisher } from "@academic-explorer/types"
import { isPublisher } from "@academic-explorer/types"
import { ActionIcon, Badge, Card, Group, Stack, Text } from "@mantine/core"
import { IconExternalLink } from "@tabler/icons-react"
import React from "react"

export type PublisherCardProps = {
	publisher: Publisher
	onNavigate?: (path: string) => void
	className?: string
}

/**
 * Specialized card component for displaying Publisher entities
 * Shows name, sources count, works count, and hierarchy level
 */
export const PublisherCard: React.FC<PublisherCardProps> = ({
	publisher,
	onNavigate,
	className,
}) => {
	// Type guard to ensure publisher is valid
	if (!isPublisher(publisher)) {
		return (
			<Card className={className}>
				<Text c="red">Invalid publisher data</Text>
			</Card>
		)
	}

	// Use publisher data directly (validation should happen at API/client level)
	const validatedPublisher = publisher

	const href = `/publishers/${validatedPublisher.id}`

	const handleClick = () => {
		if (onNavigate) {
			onNavigate(href)
		}
	}

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
				{/* Header with type badge */}
				<Group justify="space-between" wrap="nowrap">
					<Badge color="pink" variant="light">
						Publisher
					</Badge>
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

				{/* Name */}
				<Text fw={600} size="md" lineClamp={2}>
					{validatedPublisher.display_name}
				</Text>

				{/* Hierarchy level */}
				{validatedPublisher.hierarchy_level !== undefined && (
					<Badge color="gray" variant="dot" size="sm">
						Level {validatedPublisher.hierarchy_level}
					</Badge>
				)}

				{/* Country codes */}
				{validatedPublisher.country_codes && validatedPublisher.country_codes.length > 0 && (
					<Group gap="xs">
						{validatedPublisher.country_codes.slice(0, 3).map((code, index) => (
							<Badge key={index} color="gray" variant="outline" size="sm">
								{code}
							</Badge>
						))}
						{validatedPublisher.country_codes.length > 3 && (
							<Text size="xs" c="dimmed">
								+{validatedPublisher.country_codes.length - 3} more
							</Text>
						)}
					</Group>
				)}

				{/* Metrics */}
				<Group gap="md">
					<Text size="sm" c="dimmed">
						<Text component="span" fw={500}>
							{validatedPublisher.sources_count?.toLocaleString() || 0}
						</Text>{" "}
						sources
					</Text>
					<Text size="sm" c="dimmed">
						<Text component="span" fw={500}>
							{validatedPublisher.works_count?.toLocaleString() || 0}
						</Text>{" "}
						works
					</Text>
				</Group>

				<Text size="sm" c="dimmed">
					<Text component="span" fw={500}>
						{validatedPublisher.cited_by_count?.toLocaleString() || 0}
					</Text>{" "}
					citations
				</Text>

				{/* OpenAlex ID */}
				<Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
					{validatedPublisher.id}
				</Text>
			</Stack>
		</Card>
	)
}
