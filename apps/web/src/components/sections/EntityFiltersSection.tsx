/**
 * Entity filters section component
 * Extracted from LeftSidebar for dynamic section system
 */

import React, { useMemo } from "react";
import { useGraphStore } from "@/stores/graph-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@academic-explorer/utils/logger";
import type { EntityType } from "@academic-explorer/client";
import { Checkbox, Badge, Stack } from "@mantine/core";
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

// Properly typed entity options without type assertions
const entityTypeOptions: Array<{ type: EntityType; label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }> = [
	{ type: "works", label: "Works", icon: IconFile },
	{ type: "authors", label: "Authors", icon: IconUser },
	{ type: "sources", label: "Sources", icon: IconBook },
	{ type: "institutions", label: "Institutions", icon: IconBuilding },
	{ type: "topics", label: "Topics", icon: IconTag },
	{ type: "publishers", label: "Publishers", icon: IconBuildingStore },
	{ type: "funders", label: "Funders", icon: IconCoin },
	{ type: "concepts", label: "Concepts", icon: IconBulb },
];

export const EntityFiltersSection: React.FC = () => {
	const themeColors = useThemeColors();
	const {colors} = themeColors;
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
				if (node?.type && node.entityType in total) {
					const nodeType = node.entityType as EntityType;
					total[nodeType]++;
					// Note: visibility is handled at the graph level, not per-node
					// For now, count all nodes as visible
					visible[nodeType]++;
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
		const currentVisibility = visibleEntityTypes[entityType] ?? false;
		logger.debug("ui", `Toggling entity type visibility`, {
			entityType,
			fromVisible: currentVisibility,
			toVisible: !currentVisibility
		});
		setEntityTypeVisibility(entityType, !currentVisibility);
	};

	return (
		<Stack gap="xs">
			{entityTypeOptions.map(option => {
				const totalCount = entityStats.total[option.type] || 0;
				const visibleCount = entityStats.visible[option.type] || 0;
				const isVisible = visibleEntityTypes[option.type] ?? false;
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
						}}
					>
						<Checkbox
							checked={isVisible}
							onChange={() => { handleToggleEntityType(option.type); }}
							size="sm"
							aria-label={`Toggle ${option.label} visibility`}
						/>
						<Icon size={16} style={{ color: colors.text.secondary }} />
						<span style={{
							flex: 1,
							fontSize: "14px",
							color: colors.text.primary
						}}>
							{option.label}
						</span>
						<Badge size="xs" variant="light" color={isVisible ? "blue" : "gray"}>
							{visibleCount}/{totalCount}
						</Badge>
					</div>
				);
			})}
		</Stack>
	);
};