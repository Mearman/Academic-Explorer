/**
 * Right sidebar for graph navigation
 * Shows entity details and related information
 */

import React, { useState } from "react"
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
	ThemeIcon,
	Switch,
	Tooltip
} from "@mantine/core"
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
	IconTarget
} from "@tabler/icons-react"

export const RightSidebar: React.FC = () => {
	const { previewEntityId } = useLayoutStore()
	const { selectedNodeId, hoveredNodeId, nodes } = useGraphStore()
	const { colors } = useThemeColors()
	const [richView, setRichView] = useState(true)

	// Determine which entity to show details for
	const displayEntityId = hoveredNodeId || selectedNodeId || previewEntityId
	const displayEntity = displayEntityId ? nodes.get(displayEntityId) : null

	return (
		<Stack gap="md" p="md" h="100%" style={{ overflow: "auto" }}>
			{/* Header */}
			<Group justify="space-between" pb="sm" style={{ borderBottom: `1px solid ${colors.border.primary}` }}>
				<Group gap="xs">
					<ThemeIcon variant="light" size="sm">
						<IconInfoCircle size={18} />
					</ThemeIcon>
					<Text size="lg" fw={600}>
						Entity Details
					</Text>
				</Group>
				<Tooltip label={richView ? "Switch to simple view" : "Switch to rich view"}>
					<Switch
						size="sm"
						checked={richView}
						onChange={(event) => { setRichView(event.currentTarget.checked); }}
						color="blue"
						thumbIcon={
							richView ? (
								<IconStar size={12} />
							) : (
								<IconTarget size={12} />
							)
						}
					/>
				</Tooltip>
			</Group>

			{displayEntity ? (
				<Stack gap="md">
					{richView ? (
						<>
							{/* Rich Entity Display */}
							<RichEntityDisplay entity={displayEntity} isExpanded={true} />

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
						</>
					) : (
						<>
							{/* Simple Entity Display */}
							<RichEntityDisplay entity={displayEntity} isExpanded={false} />

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
						</>
					)}

					{/* Raw API Data - Always show */}
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