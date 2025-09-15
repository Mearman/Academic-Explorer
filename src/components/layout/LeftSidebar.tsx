/**
 * Left sidebar for graph navigation
 * Contains search, filters, and entity type selection
 */

import React, { useState, useMemo } from "react"
import { LayoutControls } from "@/components/molecules/LayoutControls"
import { ExpansionSettingsDialog } from "@/components/molecules/ExpansionSettingsDialog"
import { useGraphData } from "@/hooks/use-graph-data"
import { useGraphStore } from "@/stores/graph-store"
import { useExpansionSettingsSummary } from "@/stores/expansion-settings-store"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { logError } from "@/lib/logger"
import type { EntityType } from "@/lib/openalex/types"
import { RelationType } from "@/lib/graph/types"
import type { ExpansionTarget } from "@/lib/graph/types/expansion-settings"
import {
	IconSearch,
	IconFilter,
	IconGraph,
	IconFile,
	IconUser,
	IconBook,
	IconBuilding,
	IconTag,
	IconBuildingStore,
	IconArrowRight,
	IconGitBranch,
	IconLink,
	IconCoin,
	IconDatabase,
	IconAdjustments,
	IconSettings,
	IconMapPin,
	IconKey
} from "@tabler/icons-react"

export const LeftSidebar: React.FC = () => {
	const [searchQuery, setSearchQuery] = useState("")
	const [expansionDialogTarget, setExpansionDialogTarget] = useState<ExpansionTarget | null>(null)
	const { search, isLoading, clearGraph, loadAllCachedNodes } = useGraphData()
	const { colors } = useThemeColors()

	// Graph store for statistics and visibility - use as single source of truth
	const visibleEntityTypes = useGraphStore((state) => state.visibleEntityTypes)
	const getEntityTypeStats = useGraphStore((state) => state.getEntityTypeStats)
	const toggleEntityTypeVisibility = useGraphStore((state) => state.toggleEntityTypeVisibility)
	const visibleEdgeTypes = useGraphStore((state) => state.visibleEdgeTypes)
	const getEdgeTypeStats = useGraphStore((state) => state.getEdgeTypeStats)
	const toggleEdgeTypeVisibility = useGraphStore((state) => state.toggleEdgeTypeVisibility)

	// Convert Set to Array for search functionality
	const selectedEntityTypes = useMemo(() => Array.from(visibleEntityTypes), [visibleEntityTypes])

	// Cache controls state
	const showAllCachedNodes = useGraphStore((state) => state.showAllCachedNodes)
	const setShowAllCachedNodes = useGraphStore((state) => state.setShowAllCachedNodes)
	const traversalDepth = useGraphStore((state) => state.traversalDepth)
	const setTraversalDepth = useGraphStore((state) => state.setTraversalDepth)

	// Get statistics for entity types and edge types
	const entityStats = useMemo(() => getEntityTypeStats(), [getEntityTypeStats])
	const edgeStats = useMemo(() => getEdgeTypeStats(), [getEdgeTypeStats])

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!searchQuery.trim()) return

		try {
			await search(searchQuery, {
				entityTypes: selectedEntityTypes,
				limit: 20,
			})
		} catch (error) {
			logError("Search failed", error, "LeftSidebar", "ui")
		}
	}

	const handleEntityTypeToggle = (entityType: EntityType) => {
		// Toggle visibility in graph store - this updates both search filters and graph visibility
		toggleEntityTypeVisibility(entityType)
	}

	const handleClearGraph = () => {
		clearGraph()
	}

	const handleEdgeTypeToggle = (edgeType: RelationType) => {
		toggleEdgeTypeVisibility(edgeType)
	}

	const handleShowAllCachedToggle = () => {
		const newValue = !showAllCachedNodes
		setShowAllCachedNodes(newValue)

		if (newValue) {
			// Load all cached nodes when enabling cache visibility
			try {
				loadAllCachedNodes()
			} catch (error) {
				logError("Failed to load cached nodes", error, "LeftSidebar", "ui")
			}
		}
	}

	const handleTraversalDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(e.target.value, 10)
		if (!isNaN(value) && value >= 1) {
			setTraversalDepth(value)
		}
	}

	// Component for displaying expansion settings summary
	const ExpansionSettingsSummary: React.FC<{ target: ExpansionTarget }> = ({ target }) => {
		const summary = useExpansionSettingsSummary(target);

		if (!summary) return null;

		return (
			<div style={{
				fontSize: "10px",
				color: colors.text.tertiary,
				fontStyle: "italic",
				marginTop: "2px"
			}}>
				{summary}
			</div>
		);
	};

	// Use the exact same colors as graph nodes for consistency
	const getGraphNodeColor = (entityType: EntityType): string => {
		switch (entityType) {
			case "works":
				return "#e74c3c";
			case "authors":
				return "#3498db";
			case "sources":
				return "#2ecc71";
			case "institutions":
				return "#f39c12";
			case "topics":
				return "#9b59b6";
			case "publishers":
				return "#1abc9c";
			case "funders":
				return "#e67e22";
			case "keywords":
				return "#16a085";
			case "geo":
				return "#8e44ad";
			default:
				return "#95a5a6";
		}
	};

	// Edge type colors for consistency with graph visualization
	const getGraphEdgeColor = (edgeType: RelationType): string => {
		switch (edgeType) {
			case RelationType.AUTHORED:
				return "#2980b9";
			case RelationType.AFFILIATED:
				return "#27ae60";
			case RelationType.PUBLISHED_IN:
				return "#8e44ad";
			case RelationType.FUNDED_BY:
				return "#c0392b";
			case RelationType.RELATED_TO:
				return "#f39c12";
			case RelationType.REFERENCES:
				return "#34495e";
			default:
				return "#7f8c8d";
		}
	};

	const entityTypeOptions: { type: EntityType; label: string; color: string; icon: React.ReactNode }[] = [
		{ type: "works", label: "Works", color: getGraphNodeColor("works"), icon: <IconFile size={16} /> },
		{ type: "authors", label: "Authors", color: getGraphNodeColor("authors"), icon: <IconUser size={16} /> },
		{ type: "sources", label: "Sources", color: getGraphNodeColor("sources"), icon: <IconBook size={16} /> },
		{ type: "institutions", label: "Institutions", color: getGraphNodeColor("institutions"), icon: <IconBuilding size={16} /> },
		{ type: "topics", label: "Topics", color: getGraphNodeColor("topics"), icon: <IconTag size={16} /> },
		{ type: "publishers", label: "Publishers", color: getGraphNodeColor("publishers"), icon: <IconBuildingStore size={16} /> },
		{ type: "funders", label: "Funders", color: getGraphNodeColor("funders"), icon: <IconCoin size={16} /> },
		{ type: "keywords", label: "Keywords", color: getGraphNodeColor("keywords"), icon: <IconKey size={16} /> },
		{ type: "geo", label: "Geo", color: getGraphNodeColor("geo"), icon: <IconMapPin size={16} /> },
	]

	const edgeTypeOptions: { type: RelationType; label: string; color: string; icon: React.ReactNode }[] = [
		{ type: RelationType.AUTHORED, label: "Authored", color: getGraphEdgeColor(RelationType.AUTHORED), icon: <IconUser size={16} /> },
		{ type: RelationType.AFFILIATED, label: "Affiliated", color: getGraphEdgeColor(RelationType.AFFILIATED), icon: <IconBuilding size={16} /> },
		{ type: RelationType.PUBLISHED_IN, label: "Published In", color: getGraphEdgeColor(RelationType.PUBLISHED_IN), icon: <IconBook size={16} /> },
		{ type: RelationType.FUNDED_BY, label: "Funded By", color: getGraphEdgeColor(RelationType.FUNDED_BY), icon: <IconCoin size={16} /> },
		{ type: RelationType.RELATED_TO, label: "Related To", color: getGraphEdgeColor(RelationType.RELATED_TO), icon: <IconGitBranch size={16} /> },
		{ type: RelationType.REFERENCES, label: "References", color: getGraphEdgeColor(RelationType.REFERENCES), icon: <IconArrowRight size={16} /> },
	]

	return (
		<div style={{
			display: "flex",
			flexDirection: "column",
			height: "100%",
			overflow: "auto",
			padding: "16px",
			gap: "20px"
		}}>
			{/* Header */}
			<div style={{
				display: "flex",
				alignItems: "center",
				gap: "8px",
				paddingBottom: "12px",
				borderBottom: `1px solid ${colors.border.primary}`,
				fontSize: "16px",
				fontWeight: 600,
				color: colors.text.primary
			}}>
				<IconSearch size={18} />
				Search & Filters
			</div>

			{/* Search Section */}
			<div>
				<div style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					marginBottom: "8px",
					fontSize: "13px",
					fontWeight: 600,
					color: colors.text.primary
				}}>
					<IconSearch size={16} />
            Search Academic Entities
				</div>

				<form onSubmit={(e) => { void handleSearch(e) }} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => { setSearchQuery(e.target.value) }}
						placeholder="Enter keywords, DOI, ORCID, etc..."
						style={{
							width: "100%",
							padding: "8px 12px",
							border: `1px solid ${colors.border.primary}`,
							borderRadius: "6px",
							fontSize: "14px",
							outline: "none",
							boxSizing: "border-box",
							backgroundColor: colors.background.primary,
							color: colors.text.primary,
						}}
						disabled={isLoading}
					/>
					<button
						type="submit"
						disabled={!searchQuery.trim() || isLoading}
						style={{
							padding: "8px 16px",
							backgroundColor: isLoading ? colors.text.tertiary : colors.primary,
							color: colors.text.inverse,
							border: "none",
							borderRadius: "6px",
							fontSize: "14px",
							cursor: isLoading ? "not-allowed" : "pointer",
							transition: "background-color 0.2s",
						}}
					>
						{isLoading ? "Searching..." : "Search"}
					</button>
				</form>
			</div>

			{/* Entity Type Filters & Visibility */}
			<div>
				<div style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					marginBottom: "12px",
					fontSize: "13px",
					fontWeight: 600,
					color: colors.text.primary
				}}>
					<IconFilter size={16} />
            Entity Types & Visibility
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					{entityTypeOptions.map(option => {
						const totalCount = entityStats.total.get(option.type) || 0;
						const visibleCount = entityStats.visible.get(option.type) || 0;
						const searchCount = entityStats.searchResults.get(option.type) || 0;

						return (
							<label
								key={option.type}
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "4px",
									cursor: "pointer",
									padding: "8px",
									borderRadius: "6px",
									backgroundColor: visibleEntityTypes.has(option.type) ? colors.background.tertiary : "transparent",
									border: `1px solid ${colors.border.primary}`,
									transition: "background-color 0.2s",
								}}
							>
								{/* Main row with checkbox, icon, label, and color */}
								<div style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}>
									<input
										type="checkbox"
										checked={visibleEntityTypes.has(option.type)}
										onChange={() => { handleEntityTypeToggle(option.type) }}
										style={{ margin: 0 }}
									/>
									<span>{option.icon}</span>
									<span style={{ fontSize: "14px", color: colors.text.primary, fontWeight: 500 }}>
										{option.label}
									</span>
									<span
										style={{
											width: "10px",
											height: "10px",
											borderRadius: "50%",
											backgroundColor: option.color,
											marginLeft: "auto",
										}}
									/>
								</div>

								{/* Statistics row */}
								{(totalCount > 0 || searchCount > 0) && (
									<div style={{
										display: "flex",
										alignItems: "center",
										gap: "12px",
										fontSize: "11px",
										color: colors.text.secondary,
										marginLeft: "24px",
									}}>
										{totalCount > 0 && <span>Total: {totalCount}</span>}
										{searchCount > 0 && <span>Found: {searchCount}</span>}
										{totalCount > 0 && <span>Visible: {visibleCount}</span>}
									</div>
								)}
							</label>
						);
					})}
				</div>
			</div>

			{/* Edge Types & Visibility */}
			<div>
				<div style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					marginBottom: "12px",
					fontSize: "13px",
					fontWeight: 600,
					color: colors.text.primary
				}}>
					<IconLink size={16} />
            Edge Types & Visibility
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					{edgeTypeOptions.map(option => {
						const totalCount = edgeStats.total.get(option.type) || 0;
						const visibleCount = edgeStats.visible.get(option.type) || 0;

						return (
							<div
								key={option.type}
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "4px",
									padding: "8px",
									borderRadius: "6px",
									backgroundColor: visibleEdgeTypes.has(option.type) ? colors.background.tertiary : "transparent",
									border: `1px solid ${colors.border.primary}`,
									transition: "background-color 0.2s",
								}}
							>
								{/* Main row with checkbox, icon, label, settings, and color */}
								<div style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}>
									<input
										type="checkbox"
										checked={visibleEdgeTypes.has(option.type)}
										onChange={() => { handleEdgeTypeToggle(option.type) }}
										style={{ margin: 0, cursor: "pointer" }}
									/>
									<span>{option.icon}</span>
									<span style={{ fontSize: "14px", color: colors.text.primary, fontWeight: 500 }}>
										{option.label}
									</span>

									{/* Settings button */}
									<button
										onClick={(e) => {
											e.stopPropagation();
											setExpansionDialogTarget(option.type);
										}}
										style={{
											padding: "4px",
											backgroundColor: "transparent",
											border: "none",
											cursor: "pointer",
											color: colors.text.secondary,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											borderRadius: "4px",
											transition: "background-color 0.2s"
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.backgroundColor = colors.background.secondary;
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.backgroundColor = "transparent";
										}}
										title="Configure expansion settings"
									>
										<IconSettings size={14} />
									</button>

									<span
										style={{
											width: "10px",
											height: "10px",
											borderRadius: "50%",
											backgroundColor: option.color,
											marginLeft: "auto",
										}}
									/>
								</div>

								{/* Statistics and settings summary row */}
								<div style={{
									display: "flex",
									flexDirection: "column",
									gap: "4px",
									marginLeft: "24px",
								}}>
									{totalCount > 0 && (
										<div style={{
											display: "flex",
											alignItems: "center",
											gap: "12px",
											fontSize: "11px",
											color: colors.text.secondary,
										}}>
											<span>Total: {totalCount}</span>
											<span>Visible: {visibleCount}</span>
										</div>
									)}

									{/* Expansion settings summary */}
									<ExpansionSettingsSummary target={option.type} />
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Graph Actions */}
			<div>
				<div style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					marginBottom: "8px",
					fontSize: "13px",
					fontWeight: 600,
					color: colors.text.primary
				}}>
					<IconGraph size={16} />
            Graph Actions
				</div>

				<div style={{ marginBottom: "12px" }}>
					<LayoutControls />
				</div>

				<button
					onClick={handleClearGraph}
					style={{
						width: "100%",
						padding: "8px 16px",
						backgroundColor: colors.error,
						color: colors.text.inverse,
						border: "none",
						borderRadius: "6px",
						fontSize: "14px",
						cursor: "pointer",
						transition: "background-color 0.2s",
					}}
				>
            Clear Graph
				</button>
			</div>

			{/* Cache Controls */}
			<div>
				<div style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					marginBottom: "12px",
					fontSize: "13px",
					fontWeight: 600,
					color: colors.text.primary
				}}>
					<IconDatabase size={16} />
            Cache & Traversal Settings
				</div>

				{/* Show All Cached Nodes Toggle */}
				<div style={{ marginBottom: "16px" }}>
					<label style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						fontSize: "14px",
						color: colors.text.primary,
						cursor: "pointer"
					}}>
						<input
							type="checkbox"
							checked={showAllCachedNodes}
							onChange={() => { handleShowAllCachedToggle(); }}
							style={{ margin: 0 }}
						/>
						<span>Show all cached nodes</span>
					</label>
					<div style={{
						fontSize: "11px",
						color: colors.text.secondary,
						marginLeft: "24px",
						marginTop: "4px",
						lineHeight: "1.3"
					}}>
							Display all nodes from the cache, not just currently visible ones
					</div>
				</div>

				{/* Traversal Depth Control */}
				<div>
					<label style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						marginBottom: "8px",
						fontSize: "14px",
						color: colors.text.primary
					}}>
						<IconAdjustments size={16} />
						<span>Traversal Depth: {traversalDepth === Number.MAX_SAFE_INTEGER ? "∞" : traversalDepth}</span>
					</label>
					<div style={{
						display: "flex",
						alignItems: "center",
						gap: "8px"
					}}>
						<input
							type="range"
							min={1}
							max={10}
							value={traversalDepth > 10 ? 10 : traversalDepth}
							onChange={handleTraversalDepthChange}
							style={{
								flex: 1,
								height: "4px",
								background: colors.border.primary,
								borderRadius: "2px",
								outline: "none",
								cursor: "pointer"
							}}
						/>
						<button
							onClick={() => { setTraversalDepth(Number.MAX_SAFE_INTEGER) }}
							style={{
								padding: "4px 8px",
								fontSize: "11px",
								backgroundColor: traversalDepth === Number.MAX_SAFE_INTEGER ? colors.primary : colors.background.secondary,
								color: traversalDepth === Number.MAX_SAFE_INTEGER ? colors.text.inverse : colors.text.primary,
								border: `1px solid ${colors.border.primary}`,
								borderRadius: "4px",
								cursor: "pointer",
								minWidth: "24px"
							}}
							title="Set to infinity"
						>
								∞
						</button>
					</div>
					<div style={{
						fontSize: "11px",
						color: colors.text.secondary,
						marginTop: "4px",
						lineHeight: "1.3"
					}}>
							Controls how many levels deep nodes will be displayed from pinned node
					</div>
				</div>
			</div>

			{/* Instructions */}
			<div style={{
				padding: "12px",
				backgroundColor: colors.background.secondary,
				borderRadius: "6px",
				fontSize: "12px",
				color: colors.text.secondary,
				lineHeight: "1.4",
			}}>
				<strong>Tips:</strong>
				<ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
					<li>Search for keywords, author names, paper titles</li>
					<li>Use DOI, ORCID, ROR ID for specific entities</li>
					<li>Checkboxes control search filtering AND graph visibility</li>
					<li>Click nodes to navigate, double-click to expand</li>
					<li>Statistics show: total nodes, search results, visible nodes</li>
					<li>Click <IconSettings size={12} style={{ display: "inline", verticalAlign: "middle" }} /> next to edge types to configure expansion settings</li>
				</ul>
			</div>

			{/* Expansion Settings Dialog */}
			{expansionDialogTarget && (
				<ExpansionSettingsDialog
					target={expansionDialogTarget}
					isOpen={true}
					onClose={() => { setExpansionDialogTarget(null) }}
				/>
			)}
		</div>
	)
}