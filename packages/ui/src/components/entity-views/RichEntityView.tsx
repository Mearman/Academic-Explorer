import React from "react"
import { Card, Title, Badge, Group, Stack } from "@mantine/core"
import type { OpenAlexEntity } from "@academic-explorer/types"
import { getEntityType } from "@academic-explorer/types"
import { EntityFieldRenderer } from "./FieldRenderer"

type RichEntityViewProps = {
	entity: OpenAlexEntity
	entityType?: string
	onNavigate?: (path: string) => void
}

const RichEntityView: React.FC<RichEntityViewProps> = ({ entity, entityType, onNavigate }) => {
	const detectedType = entityType || getEntityType(entity)

	// Get the primary display name/title for the header
	const getDisplayName = (entity: OpenAlexEntity | Record<string, unknown>): string => {
		const entityRecord = entity as Record<string, unknown>
		return (
			(entityRecord.display_name as string) ||
			(entityRecord.title as string) ||
			(entityRecord.name as string) ||
			`${detectedType} Entity`
		)
	}

	// Get key metrics for the header badges
	const getHeaderMetrics = (
		entity: OpenAlexEntity | Record<string, unknown>
	): Array<{ label: string; value: string | number; color?: string }> => {
		const metrics: Array<{
			label: string
			value: string | number
			color?: string
		}> = []
		const entityRecord = entity as Record<string, unknown>

		if (entityRecord.works_count !== undefined && entityRecord.works_count !== null) {
			metrics.push({
				label: "Works",
				value: (entityRecord.works_count as number).toLocaleString(),
				color: "green",
			})
		}

		if (entityRecord.cited_by_count !== undefined && entityRecord.cited_by_count !== null) {
			metrics.push({
				label: "Citations",
				value: (entityRecord.cited_by_count as number).toLocaleString(),
				color: "orange",
			})
		}

		if (entityRecord.publication_year) {
			metrics.push({
				label: "Year",
				value: entityRecord.publication_year as number,
				color: "blue",
			})
		}

		if (entityRecord.type) {
			metrics.push({
				label: "Type",
				value: entityRecord.type as string,
				color: "purple",
			})
		}

		return metrics
	}

	return (
		<Stack gap="md">
			{/* Header Card */}
			<Card shadow="sm" padding="lg" radius="md" withBorder>
				<Title order={2} mb="md">
					{getDisplayName(entity)}
				</Title>

				{getHeaderMetrics(entity).length > 0 && (
					<Group mb="md">
						{getHeaderMetrics(entity).map((metric, index) => (
							<Badge key={index} color={metric.color || "gray"} variant="light" size="lg">
								{metric.label}: {metric.value}
							</Badge>
						))}
					</Group>
				)}
			</Card>

			{/* Intelligent Field Rendering */}
			<EntityFieldRenderer entity={entity} onNavigate={onNavigate} />
		</Stack>
	)
}

export { RichEntityView }
