/**
 * Left sidebar for graph navigation
 * Contains search, filters, and entity type selection
 */

import React, { useState } from "react"
import { CollapsibleSidebar } from "./CollapsibleSidebar"
import { LayoutControls } from "@/components/molecules/LayoutControls"
import { useGraphData } from "@/hooks/use-graph-data"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { logError } from "@/lib/logger"
import type { EntityType } from "@/lib/openalex/types"
import {
	IconSearch,
	IconFilter,
	IconGraph,
	IconFile,
	IconUser,
	IconBook,
	IconBuilding,
	IconTag,
	IconBuildingStore
} from "@tabler/icons-react"

export const LeftSidebar: React.FC = () => {
	const [searchQuery, setSearchQuery] = useState("")
	const [selectedEntityTypes, setSelectedEntityTypes] = useState<EntityType[]>([
		"works", "authors", "sources", "institutions"
	])
	const { search, isLoading, clearGraph } = useGraphData()
	const { colors } = useThemeColors()

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
		setSelectedEntityTypes(prev =>
			prev.includes(entityType)
				? prev.filter(type => type !== entityType)
				: [...prev, entityType]
		)
	}

	const handleClearGraph = () => {
		clearGraph()
	}

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
			default:
				return "#95a5a6";
		}
	};

	const entityTypeOptions: { type: EntityType; label: string; color: string; icon: React.ReactNode }[] = [
		{ type: "works", label: "Works", color: getGraphNodeColor("works"), icon: <IconFile size={16} /> },
		{ type: "authors", label: "Authors", color: getGraphNodeColor("authors"), icon: <IconUser size={16} /> },
		{ type: "sources", label: "Sources", color: getGraphNodeColor("sources"), icon: <IconBook size={16} /> },
		{ type: "institutions", label: "Institutions", color: getGraphNodeColor("institutions"), icon: <IconBuilding size={16} /> },
		{ type: "topics", label: "Topics", color: getGraphNodeColor("topics"), icon: <IconTag size={16} /> },
		{ type: "publishers", label: "Publishers", color: getGraphNodeColor("publishers"), icon: <IconBuildingStore size={16} /> },
	]

	return (
		<CollapsibleSidebar side="left" title="Search & Filters">
			<div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

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

				{/* Entity Type Filters */}
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
            Entity Types
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
						{entityTypeOptions.map(option => (
							<label
								key={option.type}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									cursor: "pointer",
									padding: "6px",
									borderRadius: "4px",
									backgroundColor: selectedEntityTypes.includes(option.type) ? colors.background.tertiary : "transparent",
									transition: "background-color 0.2s",
								}}
							>
								<input
									type="checkbox"
									checked={selectedEntityTypes.includes(option.type)}
									onChange={() => { handleEntityTypeToggle(option.type) }}
									style={{ margin: 0 }}
								/>
								<span>{option.icon}</span>
								<span style={{ fontSize: "14px", color: colors.text.primary }}>{option.label}</span>
								<span
									style={{
										width: "12px",
										height: "12px",
										borderRadius: "50%",
										backgroundColor: option.color,
										marginLeft: "auto",
									}}
								/>
							</label>
						))}
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
						<li>Click nodes to navigate, double-click to expand</li>
						<li>Use filters to focus on specific entity types</li>
					</ul>
				</div>
			</div>
		</CollapsibleSidebar>
	)
}