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
	Table,
	ThemeIcon
} from "@mantine/core"
import { useLayoutStore } from "@/stores/layout-store"
import { useGraphStore } from "@/stores/graph-store"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { RawApiDataSection } from "@/components/molecules/RawApiDataSection"
import {
	IconInfoCircle,
	IconExternalLink,
	IconUsers,
	IconBookmark,
	IconFile,
	IconUser,
	IconBook,
	IconBuilding,
	IconTag,
	IconBuildingStore,
	IconSearch
} from "@tabler/icons-react"

export const RightSidebar: React.FC = () => {
	const { previewEntityId } = useLayoutStore()
	const { selectedNodeId, hoveredNodeId, nodes } = useGraphStore()
	const { colors } = useThemeColors()

	// Determine which entity to show details for
	const displayEntityId = hoveredNodeId || selectedNodeId || previewEntityId
	const displayEntity = displayEntityId ? nodes.get(displayEntityId) : null

	const getEntityTypeLabel = (type: string): string => {
		switch (type) {
			case "works": return "Work"
			case "authors": return "Author"
			case "sources": return "Source"
			case "institutions": return "Institution"
			case "topics": return "Topic"
			case "publishers": return "Publisher"
			default: return "Entity"
		}
	}

	const getEntityIcon = (type: string): React.ReactNode => {
		switch (type) {
			case "works": return <IconFile size={16} />
			case "authors": return <IconUser size={16} />
			case "sources": return <IconBook size={16} />
			case "institutions": return <IconBuilding size={16} />
			case "topics": return <IconTag size={16} />
			case "publishers": return <IconBuildingStore size={16} />
			default: return <IconSearch size={16} />
		}
	}

	const getEntityColor = (type: string): string => {
		switch (type) {
			case "works": return "#e74c3c"
			case "authors": return "#3498db"
			case "sources": return "#2ecc71"
			case "institutions": return "#f39c12"
			case "topics": return "#9b59b6"
			case "publishers": return "#1abc9c"
			default: return "#95a5a6"
		}
	}

	return (
		<Stack gap="md" p="md" h="100%" style={{ overflow: "auto" }}>
			{/* Header */}
			<Group gap="xs" pb="sm" style={{ borderBottom: `1px solid ${colors.border.primary}` }}>
				<ThemeIcon variant="light" size="sm">
					<IconInfoCircle size={18} />
				</ThemeIcon>
				<Text size="lg" fw={600}>
					Entity Details
				</Text>
			</Group>

			{displayEntity ? (
				<Stack gap="md">
					{/* Entity Header */}
					<Card
						padding="md"
						radius="md"
						withBorder
						style={{ borderColor: getEntityColor(displayEntity.type), borderWidth: 2 }}
					>
						<Group align="flex-start" gap="md" mb="xs">
							<ThemeIcon
								size="xl"
								color={getEntityColor(displayEntity.type)}
								variant="light"
							>
								{getEntityIcon(displayEntity.type)}
							</ThemeIcon>
							<Stack gap="xs" style={{ flex: 1 }}>
								<Badge
									color={getEntityColor(displayEntity.type)}
									variant="light"
									size="sm"
								>
									{getEntityTypeLabel(displayEntity.type)}
								</Badge>
								<Text size="sm" fw={600} style={{ wordWrap: "break-word" }}>
									{displayEntity.label}
								</Text>
							</Stack>
						</Group>

						{/* OpenAlex ID */}
						<Text
							size="xs"
							c="dimmed"
							ff="monospace"
							p="xs"
							bg="gray.0"
							style={{ borderRadius: 4, wordBreak: "break-all" }}
						>
							{displayEntity.entityId}
						</Text>
					</Card>

					{/* External IDs */}
					{displayEntity.externalIds.length > 0 && (
						<Card padding="md" radius="md" withBorder>
							<Group gap="xs" mb="sm">
								<ThemeIcon variant="light" size="sm">
									<IconExternalLink size={16} />
								</ThemeIcon>
								<Text size="sm" fw={600}>
									External Links
								</Text>
							</Group>

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
						</Card>
					)}

					{/* Metadata */}
					{displayEntity.metadata && Object.keys(displayEntity.metadata).length > 0 && (
						<Card padding="md" radius="md" withBorder>
							<Group gap="xs" mb="sm">
								<ThemeIcon variant="light" size="sm">
									<IconInfoCircle size={16} />
								</ThemeIcon>
								<Text size="sm" fw={600}>
									Metadata
								</Text>
							</Group>

							<Table verticalSpacing="xs">
								<Table.Tbody>
									{Object.entries(displayEntity.metadata).map(([key, value]) => {
										if (value === undefined || value === null || key === "isPlaceholder") return null

										return (
											<Table.Tr key={key}>
												<Table.Td>
													<Text size="xs" c="dimmed" fw={500}>
														{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
													</Text>
												</Table.Td>
												<Table.Td style={{ textAlign: "right" }}>
													<Text size="xs" fw={600}>
														{(() => {
															if (typeof value === "boolean") {
																return value ? "Yes" : "No";
															}
															if (typeof value === "object") {
																if (Array.isArray(value)) {
																	return value.join(", ");
																}
																return "[Object]";
															}
															if (typeof value === "string" || typeof value === "number") {
																return String(value);
															}
															return "N/A";
														})()}
													</Text>
												</Table.Td>
											</Table.Tr>
										)
									})}
								</Table.Tbody>
							</Table>
						</Card>
					)}

					{/* Graph Statistics */}
					<Card padding="md" radius="md" withBorder>
						<Group gap="xs" mb="sm">
							<ThemeIcon variant="light" size="sm">
								<IconUsers size={16} />
							</ThemeIcon>
							<Text size="sm" fw={600}>
								Graph Statistics
							</Text>
						</Group>

						<Group justify="space-between" mb="xs">
							<Text size="xs" c="dimmed">Total Nodes:</Text>
							<Text size="xs" fw={600}>{nodes.size}</Text>
						</Group>
						<Group justify="space-between">
							<Text size="xs" c="dimmed">Selected:</Text>
							<Text size="xs" fw={600}>
								{selectedNodeId ? "1 node" : "None"}
							</Text>
						</Group>
					</Card>

					{/* Actions */}
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

					{/* Raw API Data */}
					<RawApiDataSection entityId={displayEntity.entityId} />
				</Stack>
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
		</Stack>
	)
}