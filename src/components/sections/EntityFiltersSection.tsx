/**
 * Entity filters section component
 * Extracted from LeftSidebar for dynamic section system
 */

import React, { useMemo } from "react";
import { useGraphStore } from "@/stores/graph-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@/lib/logger";
import type { EntityType } from "@/lib/openalex/types";
import {
	IconFile,
	IconUser,
	IconBook,
	IconBuilding,
	IconTag,
	IconBuildingStore,
	IconCoin,
	IconBulb,
} from "@tabler/icons-react";

const entityTypeOptions = [
	{ type: "works" as EntityType, label: "Works", icon: IconFile },
	{ type: "authors" as EntityType, label: "Authors", icon: IconUser },
	{ type: "sources" as EntityType, label: "Sources", icon: IconBook },
	{ type: "institutions" as EntityType, label: "Institutions", icon: IconBuilding },
	{ type: "topics" as EntityType, label: "Topics", icon: IconTag },
	{ type: "publishers" as EntityType, label: "Publishers", icon: IconBuildingStore },
	{ type: "funders" as EntityType, label: "Funders", icon: IconCoin },
	{ type: "concepts" as EntityType, label: "Concepts", icon: IconBulb },
];

export const EntityFiltersSection: React.FC = () => {
	const themeColors = useThemeColors();
	const colors = themeColors.colors;
	const nodesMap = useGraphStore((state) => state.nodes);
	const setEntityTypeVisibility = useGraphStore((state) => state.setEntityTypeVisibility);
	const visibleEntityTypes = useGraphStore((state) => state.visibleEntityTypes);

	const entityStats = useMemo(() => {
		try {
			const nodeValues = Object.values(nodesMap);
			const nodes = Array.isArray(nodeValues) ? nodeValues : [];

			// Initialize counters for all entity types
			const total: Record<EntityType, number> = {
				works: 0,
				authors: 0,
				sources: 0,
				institutions: 0,
				topics: 0,
				concepts: 0,
				publishers: 0,
				funders: 0,
				keywords: 0
			};
			const visible: Record<EntityType, number> = {
				works: 0,
				authors: 0,
				sources: 0,
				institutions: 0,
				topics: 0,
				concepts: 0,
				publishers: 0,
				funders: 0,
				keywords: 0
			};

			// Count nodes by type
			for (const node of nodes) {
				if (node && node.type in total) {
					total[node.type]++;
					// Note: visibility is handled at the graph level, not per-node
					// For now, count all nodes as visible
					visible[node.type]++;
				}
			}

			return { total, visible };
		} catch (error) {
			logger.warn("ui", "Failed to calculate entity stats", { error });
			const emptyTotal: Record<EntityType, number> = {
				works: 0,
				authors: 0,
				sources: 0,
				institutions: 0,
				topics: 0,
				concepts: 0,
				publishers: 0,
				funders: 0,
				keywords: 0
			};
			const emptyVisible: Record<EntityType, number> = {
				works: 0,
				authors: 0,
				sources: 0,
				institutions: 0,
				topics: 0,
				concepts: 0,
				publishers: 0,
				funders: 0,
				keywords: 0
			};

			return {
				total: emptyTotal,
				visible: emptyVisible,
			};
		}
	}, [nodesMap]);

	const handleToggleEntityType = (entityType: EntityType) => {
		const currentVisibility = visibleEntityTypes[entityType];
		logger.info("ui", `Toggling entity type visibility`, {
			entityType,
			fromVisible: currentVisibility,
			toVisible: !currentVisibility
		});
		setEntityTypeVisibility(entityType, !currentVisibility);
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
			{entityTypeOptions.map(option => {
				const totalCount = entityStats.total[option.type] || 0;
				const visibleCount = entityStats.visible[option.type] || 0;
				const isVisible = visibleEntityTypes[option.type];
				const Icon = option.icon;

				return (
					<div
						key={option.type}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							padding: "6px 8px",
							borderRadius: "4px",
							backgroundColor: isVisible ? "transparent" : colors.background.secondary,
							opacity: isVisible ? 1 : 0.6,
							transition: "all 0.2s ease",
							cursor: "pointer",
						}}
						onClick={() => { handleToggleEntityType(option.type); }}
					>
						<input
							type="checkbox"
							checked={isVisible}
							onChange={() => { handleToggleEntityType(option.type); }}
							style={{ cursor: "pointer" }}
						/>
						<Icon size={16} style={{ color: colors.text.secondary }} />
						<span style={{
							flex: 1,
							fontSize: "14px",
							color: colors.text.primary
						}}>
							{option.label}
						</span>
						<span style={{
							fontSize: "12px",
							color: colors.text.secondary,
							fontWeight: 500
						}}>
							{visibleCount}/{totalCount}
						</span>
					</div>
				);
			})}
		</div>
	);
};