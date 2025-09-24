/**
 * Entity Information Section
 * Displays detailed information about selected or hovered entities
 */

import React from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import { RichEntityDisplay } from "@/components/molecules/RichEntityDisplay";
import { useLayoutStore } from "@/stores/layout-store";
import { useGraphStore } from "@/stores/graph-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@academic-explorer/utils/logger";

interface EntityInfoSectionProps {
	className?: string;
}

export const EntityInfoSection: React.FC<EntityInfoSectionProps> = ({
	className = ""
}) => {
	const themeColors = useThemeColors();
	const {colors} = themeColors;

	// Get entity to display - priority: hovered > selected > preview
	const hoveredNodeId = useGraphStore((state) => state.hoveredNodeId);
	const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
	const previewEntityId = useLayoutStore((state) => state.previewEntityId);

	// Get entity data from store
	const nodesMap = useGraphStore((state) => state.nodes);

	// Determine which entity to show
	const displayEntityId = hoveredNodeId || selectedNodeId || previewEntityId;
	const entityNode = displayEntityId ? nodesMap[displayEntityId] : undefined;

	React.useEffect(() => {
		if (displayEntityId) {
			logger.debug("ui", "EntityInfoSection displaying entity", {
				entityId: displayEntityId,
				source: hoveredNodeId ? "hover" : selectedNodeId ? "selection" : "preview",
				hasNodeData: !!entityNode
			});
		}
	}, [displayEntityId, hoveredNodeId, selectedNodeId, entityNode]);

	if (!displayEntityId || !entityNode) {
		return (
			<div
				className={className}
				style={{
					padding: "24px",
					textAlign: "center",
					color: colors.text.secondary
				}}
			>
				<IconInfoCircle
					size={48}
					style={{
						opacity: 0.3,
						marginBottom: "12px"
					}}
				/>
				<div style={{
					fontSize: "14px",
					fontWeight: 500,
					marginBottom: "8px"
				}}>
					No Entity Selected
				</div>
				<div style={{
					fontSize: "12px",
					opacity: 0.7,
					lineHeight: 1.4
				}}>
					Select a node on the graph or hover over one to see detailed information
				</div>
			</div>
		);
	}

	// Use the GraphNode directly - RichEntityDisplay expects a GraphNode
	const entity = entityNode;

	return (
		<div className={className} style={{ padding: "16px" }}>
			<div style={{
				fontSize: "14px",
				fontWeight: 600,
				marginBottom: "12px",
				color: colors.text.primary,
				display: "flex",
				alignItems: "center",
				gap: "8px"
			}}>
				<IconInfoCircle size={16} />
				Entity Information
			</div>

			<RichEntityDisplay entity={entity} />
		</div>
	);
};