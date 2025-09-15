/**
 * Right sidebar for graph navigation
 * Shows entity details and related information
 */

import React from "react"
import {
	Stack,
	Card,
	Group,
	Badge,
	Text,
	Anchor,
	ActionIcon,
	Alert,
	Center,
	ThemeIcon
} from "@mantine/core"
import { CollapsibleSection } from "@/components/molecules/CollapsibleSection"
import { useLayoutStore } from "@/stores/layout-store"
import { useGraphStore } from "@/stores/graph-store"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { RawApiDataSection } from "@/components/molecules/RawApiDataSection"
import { RichEntityDisplay } from "@/components/molecules/RichEntityDisplay"
import {
	IconInfoCircle,
	IconExternalLink,
	IconUsers,
	IconBookmark,
	IconSearch,
	IconStar,
	IconEye
} from "@tabler/icons-react"

export const RightSidebar: React.FC = () => {
	const { previewEntityId } = useLayoutStore()
	const { selectedNodeId, hoveredNodeId, nodes } = useGraphStore()
	const { colors } = useThemeColors()

	// Determine which entity to show details for - prioritize selectedNodeId for immediate display
	const displayEntityId = selectedNodeId || hoveredNodeId || previewEntityId
	const displayEntity = displayEntityId ? nodes.get(displayEntityId) : null

	return (
		<div style={{
			display: "flex",
			flexDirection: "column",
			minHeight: "100%",
			padding: "16px",
			gap: "8px"
		}}>
			{/* Header */}
			<div style={{
				display: "flex",
				alignItems: "center",
				paddingBottom: "12px",
				borderBottom: `1px solid ${colors.border.primary}`,
				marginBottom: "8px"
			}}>
				<Group gap="xs">
					<ThemeIcon variant="light" size="sm">
						<IconInfoCircle size={18} />
					</ThemeIcon>
					<Text size="lg" fw={600}>
						Entity Details
					</Text>
				</Group>
			</div>

			{displayEntity ? (
				<>
					{/* Entity Information Section */}
					<CollapsibleSection
						title="Entity Information"
						icon={<IconInfoCircle size={16} />}
						defaultExpanded={true}
						storageKey="entity-info"
					>
						<RichEntityDisplay entity={displayEntity} />
					</CollapsibleSection>

					{/* External Links Section */}
					{displayEntity.externalIds.length > 0 && (
						<CollapsibleSection
							title="External Links"
							icon={<IconExternalLink size={16} />}
							defaultExpanded={false}
							storageKey="external-links"
						>
							<Stack gap="xs">
								{displayEntity.externalIds.map((extId, index) => (
									<Anchor
										key={index}
										href={extId.url}
										target="_blank"
										rel="noopener noreferrer"
										style={{ textDecoration: "none" }}
									>
										<Group
											gap="sm"
											p="xs"
											style={{
												backgroundColor: "var(--mantine-color-gray-0)",
												borderRadius: "var(--mantine-radius-sm)",
												transition: "background-color 0.2s",
											}}
										>
											<Badge size="xs" variant="light" color="gray">
												{extId.type.toUpperCase()}
											</Badge>
											<Text
												size="xs"
												ff="monospace"
												style={{
													flex: 1,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap"
												}}
											>
												{extId.value}
											</Text>
											<ActionIcon size="xs" variant="subtle">
												<IconExternalLink size={12} />
											</ActionIcon>
										</Group>
									</Anchor>
								))}
							</Stack>
						</CollapsibleSection>
					)}

					{/* View Controls Section */}
					<CollapsibleSection
						title="View Options"
						icon={<IconStar size={16} />}
						defaultExpanded={false}
						storageKey="view-options"
					>
						<Alert
							icon={<IconBookmark size={16} />}
							title="Available Actions"
							color="blue"
							variant="light"
						>
							<Stack gap="xs">
								<Text size="xs">• Click to navigate to entity page</Text>
								<Text size="xs">• Double-click to expand relationships</Text>
								<Text size="xs">• Hover to preview details</Text>
							</Stack>
						</Alert>
					</CollapsibleSection>

					{/* Graph Statistics Section */}
					<CollapsibleSection
						title="Graph Statistics"
						icon={<IconUsers size={16} />}
						defaultExpanded={true}
						storageKey="graph-stats"
					>
						<Card padding="md" radius="md" withBorder>
							<Group justify="space-between" mb="xs">
								<Text size="xs" c="dimmed">Total Nodes:</Text>
								<Text size="xs" fw={600}>{nodes.size}</Text>
							</Group>
							<Group justify="space-between" mb="xs">
								<Text size="xs" c="dimmed">Selected:</Text>
								<Text size="xs" fw={600}>
									{selectedNodeId ? "1 node" : "None"}
								</Text>
							</Group>
							<Group justify="space-between">
								<Text size="xs" c="dimmed">Current Entity:</Text>
								<Text size="xs" fw={600}>
									{"Showing details"}
								</Text>
							</Group>
						</Card>
					</CollapsibleSection>

					{/* Raw API Data Section */}
					<CollapsibleSection
						title="Raw API Data"
						icon={<IconEye size={16} />}
						defaultExpanded={false}
						storageKey="raw-api-data"
					>
						<RawApiDataSection entityId={displayEntity.entityId} />
					</CollapsibleSection>
				</>
			) : (
				/* Empty State */
				<Center h={200}>
					<Stack align="center" gap="md">
						<ThemeIcon size="xl" variant="light" color="gray">
							<IconSearch size={32} />
						</ThemeIcon>
						<Stack align="center" gap="xs">
							<Text size="sm" fw={500}>
								No Entity Selected
							</Text>
							<Text size="xs" c="dimmed" ta="center" maw={200}>
								Hover over or click on a node in the graph to see detailed information here.
							</Text>
						</Stack>
					</Stack>
				</Center>
			)}
		</div>
	)
}