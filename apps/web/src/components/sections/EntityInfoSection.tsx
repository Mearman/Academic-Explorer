/**
 * Entity Information Section
 * Displays detailed information about selected or hovered entities
 * Now also detects current entity from route when no graph selection is available
 */

import React from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import { RichEntityDisplay } from "@/components/molecules/RichEntityDisplay";
import { useLayoutStore } from "@/stores/layout-store";
import { useGraphStore } from "@/stores/graph-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { logger } from "@academic-explorer/utils/logger";

interface EntityInfoSectionProps {
	className?: string;
}

export const EntityInfoSection: React.FC<EntityInfoSectionProps> = ({
	className = ""
}) => {
	const themeColors = useThemeColors();
	const {colors} = themeColors;

	// Get entity to display - priority: hovered > selected > preview > route
	const hoveredNodeId = useGraphStore((state) => state.hoveredNodeId);
	const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
	const previewEntityId = useLayoutStore((state) => state.previewEntityId);

	// Get entity data from store
	const nodesMap = useGraphStore((state) => state.nodes);

	// Extract entity ID from current URL hash (reactive to hash changes)
	const [routeEntityId, setRouteEntityId] = React.useState<string | null>(null);

	React.useEffect(() => {
		const updateRouteEntity = () => {
			const currentHash = window.location.hash || '';
			const entityRouteMatch = currentHash.match(/\/(?:authors|works|sources|institutions|topics|publishers|funders)\/([^\/]+)/);
			const entityId = entityRouteMatch ? entityRouteMatch[1] : null;
			setRouteEntityId(entityId);
		};

		// Initial check
		updateRouteEntity();

		// Listen for hash changes
		window.addEventListener('hashchange', updateRouteEntity);

		return () => {
			window.removeEventListener('hashchange', updateRouteEntity);
		};
	}, []);

	// Determine which entity to show - now includes route fallback
	const displayEntityId = hoveredNodeId || selectedNodeId || previewEntityId || routeEntityId;
	const entityNode = displayEntityId ? nodesMap[displayEntityId] : undefined;

	// Fetch raw entity data if we have a route entity but no graph node
	const rawEntityData = useRawEntityData({
		entityId: routeEntityId,
		enabled: !!routeEntityId && !entityNode
	});

	React.useEffect(() => {
		if (displayEntityId) {
			logger.debug("ui", "EntityInfoSection displaying entity", {
				entityId: displayEntityId,
				source: hoveredNodeId ? "hover" : selectedNodeId ? "selection" : previewEntityId ? "preview" : "route",
				hasNodeData: !!entityNode,
				hasRawData: !!rawEntityData.data,
				routeEntityId
			});
		}
	}, [displayEntityId, hoveredNodeId, selectedNodeId, previewEntityId, entityNode, rawEntityData.data, routeEntityId]);

	// Show loading state if fetching route entity
	if (routeEntityId && rawEntityData.isLoading && !entityNode) {
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
					Loading Entity...
				</div>
			</div>
		);
	}

	// Show error state if route entity fetch failed
	if (routeEntityId && rawEntityData.error && !entityNode) {
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
					marginBottom: "8px",
					color: "red"
				}}>
					Error Loading Entity
				</div>
				<div style={{
					fontSize: "12px",
					opacity: 0.7,
					lineHeight: 1.4
				}}>
					{String(rawEntityData.error)}
				</div>
			</div>
		);
	}

	if (!displayEntityId || (!entityNode && !rawEntityData.data)) {
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

	// Use graph node if available, otherwise create a minimal GraphNode from raw data
	let entity: any = entityNode;

	if (!entityNode && rawEntityData.data) {
		// Convert raw OpenAlex entity to minimal GraphNode format for RichEntityDisplay
		const rawEntity = rawEntityData.data;
		entity = {
			entityId: rawEntity.id,
			entityType: rawEntity.id.charAt(0) === 'A' ? 'authors' :
						rawEntity.id.charAt(0) === 'W' ? 'works' :
						rawEntity.id.charAt(0) === 'S' ? 'sources' :
						rawEntity.id.charAt(0) === 'I' ? 'institutions' :
						rawEntity.id.charAt(0) === 'T' ? 'topics' :
						rawEntity.id.charAt(0) === 'P' ? 'publishers' : 'works',
			// Add any other required GraphNode properties
			x: 0,
			y: 0,
		};
	}

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