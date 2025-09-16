/**
 * Custom node components for XYFlow provider
 * Entity-specific node rendering with academic information
 */

import React from "react";
import { Handle, Position } from "@xyflow/react";
// Note: Handles are still needed for XYFlow to register connection points, but floating edges override positioning
import {
	IconCalendar,
	IconChartBar,
	IconLockOpen,
	IconFile,
	IconUser,
	IconBook,
	IconBuilding,
	IconPin,
	IconPinFilled,
	IconArrowsMaximize,
	IconArrowsMinimize,
	IconCircleDashed,
	IconCirclePlus
} from "@tabler/icons-react";
import type { EntityType, ExternalIdentifier } from "../../types";
import { useGraphStore } from "@/stores/graph-store";
import { useGraphData } from "@/hooks/use-graph-data";


// Pin toggle button component
interface PinToggleButtonProps {
  nodeId: string;
  isPinned: boolean;
  className?: string;
}

const PinToggleButton: React.FC<PinToggleButtonProps> = ({ nodeId, isPinned, className }) => {
	const pinNode = useGraphStore((state) => state.pinNode);
	const unpinNode = useGraphStore((state) => state.unpinNode);

	const handleTogglePin = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent node selection/dragging
		if (isPinned) {
			unpinNode(nodeId);
		} else {
			pinNode(nodeId);
		}
	};

	return (
		<button
			className={`nodrag ${className || ""}`}
			onClick={handleTogglePin}
			style={{
				background: "rgba(0, 0, 0, 0.7)",
				border: "none",
				borderRadius: "0px 8px 0px 0px", // Only top-right corner rounded
				padding: "0px",
				margin: "0px",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				cursor: "pointer",
				transition: "all 0.2s ease",
				width: "20px",
				alignSelf: "stretch", // Explicitly stretch to fill parent height
				flexShrink: 0,
				boxSizing: "border-box" // Ensure proper box model
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.background = "rgba(0, 0, 0, 0.9)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
			}}
			title={isPinned ? "Unpin node" : "Pin node"}
		>
			{isPinned ? (
				<IconPinFilled size={10} style={{ color: "#ffc107" }} />
			) : (
				<IconPin size={10} style={{ color: "#ffffff" }} />
			)}
		</button>
	);
};

// Expand button component
interface ExpandButtonProps {
  nodeId: string;
  className?: string;
}

const ExpandButton: React.FC<ExpandButtonProps> = ({ nodeId, className }) => {
	const graphData = useGraphData();
	const expandNode = graphData.expandNode;

	const handleExpand = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent node selection/dragging
		void expandNode(nodeId);
	};

	return (
		<button
			className={`nodrag ${className || ""}`}
			onClick={handleExpand}
			style={{
				background: "rgba(0, 0, 0, 0.7)",
				border: "none",
				borderRadius: "0px 0px 8px 0px", // Only bottom-right corner rounded
				padding: "0px",
				margin: "0px",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				cursor: "pointer",
				transition: "all 0.2s ease",
				width: "20px",
				alignSelf: "stretch",
				flexShrink: 0,
				boxSizing: "border-box"
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.background = "rgba(0, 0, 0, 0.9)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
			}}
			title="Expand node connections"
		>
			<IconArrowsMaximize size={10} style={{ color: "#ffffff" }} />
		</button>
	);
};

// Select adjacent nodes button component
interface SelectAdjacentButtonProps {
  nodeId: string;
  className?: string;
}

const SelectAdjacentButton: React.FC<SelectAdjacentButtonProps> = ({ nodeId, className }) => {
	const getNeighbors = useGraphStore((state) => state.getNeighbors);
	const clearSelection = useGraphStore((state) => state.clearSelection);
	const addToSelection = useGraphStore((state) => state.addToSelection);

	const handleSelectAdjacent = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent node selection/dragging

		// Get adjacent nodes (neighbors)
		const neighbors = getNeighbors(nodeId);
		const allNodeIds = [nodeId, ...neighbors.map(n => n.id)];

		// Clear current selection and select all adjacent nodes and the node itself
		clearSelection();
		allNodeIds.forEach(id => { addToSelection(id); });
	};

	return (
		<button
			className={`nodrag ${className || ""}`}
			onClick={handleSelectAdjacent}
			style={{
				background: "rgba(0, 0, 0, 0.7)",
				border: "none",
				borderRadius: "0px", // No rounded corners for middle buttons
				padding: "0px",
				margin: "0px",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				cursor: "pointer",
				transition: "all 0.2s ease",
				width: "20px",
				alignSelf: "stretch",
				flexShrink: 0,
				boxSizing: "border-box"
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.background = "rgba(0, 0, 0, 0.9)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
			}}
			title="Select this node and all adjacent nodes"
		>
			<IconCircleDashed size={10} style={{ color: "#ffffff" }} />
		</button>
	);
};

// Add adjacent nodes to selection button component
interface AddAdjacentButtonProps {
  nodeId: string;
  className?: string;
}

const AddAdjacentButton: React.FC<AddAdjacentButtonProps> = ({ nodeId, className }) => {
	const getNeighbors = useGraphStore((state) => state.getNeighbors);
	const addToSelection = useGraphStore((state) => state.addToSelection);

	const handleAddAdjacent = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent node selection/dragging

		// Get adjacent nodes (neighbors)
		const neighbors = getNeighbors(nodeId);
		const allNodeIds = [nodeId, ...neighbors.map(n => n.id)];

		// Add all adjacent nodes and the node itself to existing selection
		allNodeIds.forEach(id => { addToSelection(id); });
	};

	return (
		<button
			className={`nodrag ${className || ""}`}
			onClick={handleAddAdjacent}
			style={{
				background: "rgba(0, 0, 0, 0.7)",
				border: "none",
				borderRadius: "0px", // No rounded corners for middle buttons
				padding: "0px",
				margin: "0px",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				cursor: "pointer",
				transition: "all 0.2s ease",
				width: "20px",
				alignSelf: "stretch",
				flexShrink: 0,
				boxSizing: "border-box"
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.background = "rgba(0, 0, 0, 0.9)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
			}}
			title="Add this node and all adjacent nodes to selection"
		>
			<IconCirclePlus size={10} style={{ color: "#ffffff" }} />
		</button>
	);
};

// Collapse isolated adjacent nodes button component
interface CollapseIsolatedButtonProps {
  nodeId: string;
  className?: string;
}

const CollapseIsolatedButton: React.FC<CollapseIsolatedButtonProps> = ({ nodeId, className }) => {
	const getNeighbors = useGraphStore((state) => state.getNeighbors);
	const removeNode = useGraphStore((state) => state.removeNode);

	const handleCollapseIsolated = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent node selection/dragging

		// Get adjacent nodes (neighbors) of the current node
		const neighbors = getNeighbors(nodeId);

		// For each neighbor, check if it only connects to the current node
		neighbors.forEach(neighbor => {
			const neighborConnections = getNeighbors(neighbor.id);

			// If the neighbor only connects to the current node (isolated), remove it
			if (neighborConnections.length === 1 && neighborConnections[0].id === nodeId) {
				removeNode(neighbor.id);
			}
		});
	};

	return (
		<button
			className={`nodrag ${className || ""}`}
			onClick={handleCollapseIsolated}
			style={{
				background: "rgba(0, 0, 0, 0.7)",
				border: "none",
				borderRadius: "8px 0px 0px 0px", // Only top-left corner rounded
				padding: "0px",
				margin: "0px",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				cursor: "pointer",
				transition: "all 0.2s ease",
				width: "20px",
				alignSelf: "stretch",
				flexShrink: 0,
				boxSizing: "border-box"
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.background = "rgba(0, 0, 0, 0.9)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
			}}
			title="Collapse isolated adjacent nodes"
		>
			<IconArrowsMinimize size={10} style={{ color: "#ffffff" }} />
		</button>
	);
};

interface NodeData {
  label: string;
  entityId: string;
  entityType: EntityType;
  externalIds: ExternalIdentifier[];
  isPinned?: boolean;
  metadata?: {
    year?: number;
    citationCount?: number;
    openAccess?: boolean;
    [key: string]: unknown;
  };
}

interface CustomNodeProps {
  data: NodeData;
  selected?: boolean;
}

// Base node styles
const baseNodeStyle: React.CSSProperties = {
	padding: "0px", // Remove padding so top bar can extend to edges
	borderRadius: "8px",
	border: "none",
	fontSize: "11px",
	fontWeight: "bold",
	color: "white",
	textAlign: "center",
	minWidth: "120px",
	maxWidth: "200px",
	cursor: "pointer",
	wordWrap: "break-word",
	lineHeight: "1.2",
	width: "fit-content",
	height: "fit-content",
	position: "relative", // Keep relative for handle positioning
};

// Entity-specific colors
const getEntityColor = (entityType: EntityType): string => {
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
			return "#34495e";
		default:
			return "#95a5a6";
	}
};

// Convert hex color to rgba format for glow effects
const hexToRgba = (hex: string, alpha: number): string => {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r.toString()}, ${g.toString()}, ${b.toString()}, ${alpha.toString()})`;
};

// Get entity-specific glow colors
const getEntityGlowColors = (entityType: EntityType): { border: string; glow: string; solidBorder: string } => {
	const baseColor = getEntityColor(entityType);
	return {
		border: hexToRgba(baseColor, 0.5),     // Semi-transparent for inner border
		glow: hexToRgba(baseColor, 0.3),       // More transparent for outer glow
		solidBorder: baseColor                  // Solid color for selected border
	};
};


// Custom node component
export const CustomNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
	const isPinned = useGraphStore((state) => state.isPinned);
	const backgroundColor = getEntityColor(data.entityType);
	const glowColors = getEntityGlowColors(data.entityType);

	// Get current pin state from store
	const isNodePinned = isPinned(data.entityId);

	// Get primary external ID for display
	const primaryExternalId = data.externalIds.length > 0 ? data.externalIds[0] : undefined;

	const nodeStyle: React.CSSProperties = {
		...baseNodeStyle,
		backgroundColor,
		// Only selected nodes get glow effect in their entity color
		boxShadow: selected
			? `0 0 0 2px ${glowColors.border}, 0 0 15px ${glowColors.glow}`
			: "none",
		// Only selected nodes get border styling
		border: selected ? `2px solid ${glowColors.solidBorder}` : "none",
		// No opacity changes for pinned nodes
		opacity: 1,
	};

	return (
		<div style={nodeStyle}>
			{/* Connection handles - XYFlow automatically positions at node edges */}
			<Handle
				type="target"
				position={Position.Top}
				id="top"
				style={{ background: "#555", width: "8px", height: "8px" }}
			/>
			<Handle
				type="target"
				position={Position.Right}
				id="right"
				style={{ background: "#555", width: "8px", height: "8px" }}
			/>
			<Handle
				type="target"
				position={Position.Bottom}
				id="bottom"
				style={{ background: "#555", width: "8px", height: "8px" }}
			/>
			<Handle
				type="target"
				position={Position.Left}
				id="left"
				style={{ background: "#555", width: "8px", height: "8px" }}
			/>
			<Handle
				type="source"
				position={Position.Top}
				id="top-source"
				style={{ background: "#555", width: "8px", height: "8px" }}
			/>
			<Handle
				type="source"
				position={Position.Right}
				id="right-source"
				style={{ background: "#555", width: "8px", height: "8px" }}
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				id="bottom-source"
				style={{ background: "#555", width: "8px", height: "8px" }}
			/>
			<Handle
				type="source"
				position={Position.Left}
				id="left-source"
				style={{ background: "#555", width: "8px", height: "8px" }}
			/>

			{/* Top bar with node ID and pin button - flush to edges */}
			<div style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "stretch", // Stretch children to full height
				backgroundColor: "rgba(0,0,0,0.2)",
				padding: "0px", // Remove all padding
				borderRadius: "8px 8px 0 0", // Only top corners rounded
				fontSize: "9px",
				opacity: 0.8,
				minHeight: "24px" // Set explicit height
			}}>
				<span style={{
					display: "flex",
					alignItems: "center",
					paddingLeft: "8px", // Only the text gets padding
					fontFamily: "monospace",
					fontSize: "8px"
				}}>{data.entityId}</span>
				<PinToggleButton nodeId={data.entityId} isPinned={isNodePinned} />
			</div>

			{/* Title centered across full width with proper padding */}
			<div style={{
				textAlign: "center",
				wordWrap: "break-word",
				lineHeight: "1.2",
				padding: "8px 12px 4px 12px" // Add padding that was removed from parent
			}}>
				{data.label}
			</div>

			{/* External ID (if available) */}
			{primaryExternalId && (
				<div
					style={{
						fontSize: "8px",
						opacity: 0.7,
						fontFamily: "monospace",
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						padding: "0 12px" // Add horizontal padding
					}}
				>
					{primaryExternalId.type.toUpperCase()}: {primaryExternalId.value}
				</div>
			)}

			{/* Metadata indicators */}
			{data.metadata && (
				<div style={{
					fontSize: "8px",
					opacity: 0.6,
					marginTop: "2px",
					padding: "0 12px 8px 12px" // Add padding and bottom spacing
				}}>
					{data.metadata.year && (
						<span style={{ marginRight: "4px", display: "inline-flex", alignItems: "center", gap: "2px" }}>
							<IconCalendar size={12} /> {data.metadata.year}
						</span>
					)}
					{data.metadata.citationCount && (
						<span style={{ marginRight: "4px", display: "inline-flex", alignItems: "center", gap: "2px" }}>
							<IconChartBar size={12} /> {data.metadata.citationCount}
						</span>
					)}
					{data.metadata.openAccess && (
						<span>
							<IconLockOpen size={12} />
						</span>
					)}
				</div>
			)}

			{/* Bottom bar with action buttons - flush to edges */}
			<div style={{
				display: "flex",
				justifyContent: "flex-end",
				alignItems: "stretch", // Stretch children to full height
				backgroundColor: "rgba(0,0,0,0.2)",
				padding: "0px", // Remove all padding
				borderRadius: "0 0 8px 8px", // Only bottom corners rounded
				fontSize: "9px",
				opacity: 0.8,
				minHeight: "20px" // Slightly smaller than top bar
			}}>
				<CollapseIsolatedButton nodeId={data.entityId} />
				<SelectAdjacentButton nodeId={data.entityId} />
				<AddAdjacentButton nodeId={data.entityId} />
				<ExpandButton nodeId={data.entityId} />
			</div>

		</div>
	);
};

// Work-specific node
export const WorkNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
	const isPinned = useGraphStore((state) => state.isPinned);
	const glowColors = getEntityGlowColors("works");

	// Get current pin state from store
	const isNodePinned = isPinned(data.entityId);

	const nodeStyle: React.CSSProperties = {
		...baseNodeStyle,
		backgroundColor: "#e74c3c",
		// Only selected nodes get glow effect in their entity color
		boxShadow: selected
			? `0 0 0 2px ${glowColors.border}, 0 0 15px ${glowColors.glow}`
			: "none",
		// Only selected nodes get border styling
		border: selected ? `2px solid ${glowColors.solidBorder}` : "none",
		// No opacity changes for pinned nodes
		opacity: 1,
	};

	return (
		<div style={nodeStyle}>
			{/* Connection handles - XYFlow automatically positions at node edges */}
			<Handle type="target" position={Position.Top} id="top" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="target" position={Position.Right} id="right" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="target" position={Position.Bottom} id="bottom" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="target" position={Position.Left} id="left" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Top} id="top-source" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Right} id="right-source" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Bottom} id="bottom-source" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Left} id="left-source" style={{ background: "#555", width: "8px", height: "8px" }} />

			{/* Top bar with node ID and pin button - flush to edges */}
			<div style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "stretch", // Stretch children to full height
				backgroundColor: "rgba(0,0,0,0.2)",
				padding: "0px", // Remove all padding
				borderRadius: "8px 8px 0 0", // Only top corners rounded
				fontSize: "9px",
				opacity: 0.8,
				minHeight: "24px" // Set explicit height
			}}>
				<span style={{
					display: "flex",
					alignItems: "center",
					paddingLeft: "8px", // Only the text gets padding
					fontFamily: "monospace",
					fontSize: "8px"
				}}>{data.entityId}</span>
				<PinToggleButton nodeId={data.entityId} isPinned={isNodePinned} />
			</div>

			{/* Title with icon centered across full width with proper padding */}
			<div style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				gap: "4px",
				wordWrap: "break-word",
				lineHeight: "1.2",
				padding: "8px 12px 4px 12px" // Add padding that was removed from parent
			}}>
				<IconFile size={14} /> {data.label}
			</div>

			{data.metadata?.year && (
				<div style={{
					fontSize: "9px",
					opacity: 0.8,
					padding: "0 12px"
				}}>
					{data.metadata.year}
				</div>
			)}

			{data.metadata?.citationCount && (
				<div style={{
					fontSize: "8px",
					opacity: 0.7,
					padding: "0 12px 8px 12px"
				}}>
					{data.metadata.citationCount} citations
				</div>
			)}

			{/* Bottom bar with action buttons - flush to edges */}
			<div style={{
				display: "flex",
				justifyContent: "flex-end",
				alignItems: "stretch", // Stretch children to full height
				backgroundColor: "rgba(0,0,0,0.2)",
				padding: "0px", // Remove all padding
				borderRadius: "0 0 8px 8px", // Only bottom corners rounded
				fontSize: "9px",
				opacity: 0.8,
				minHeight: "20px" // Slightly smaller than top bar
			}}>
				<CollapseIsolatedButton nodeId={data.entityId} />
				<SelectAdjacentButton nodeId={data.entityId} />
				<AddAdjacentButton nodeId={data.entityId} />
				<ExpandButton nodeId={data.entityId} />
			</div>

		</div>
	);
};

// Author-specific node
export const AuthorNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
	const isPinned = useGraphStore((state) => state.isPinned);
	const glowColors = getEntityGlowColors("authors");

	// Get current pin state from store
	const isNodePinned = isPinned(data.entityId);

	const nodeStyle: React.CSSProperties = {
		...baseNodeStyle,
		backgroundColor: "#3498db",
		// Only selected nodes get glow effect in their entity color
		boxShadow: selected
			? `0 0 0 2px ${glowColors.border}, 0 0 15px ${glowColors.glow}`
			: "none",
		// Only selected nodes get border styling
		border: selected ? `2px solid ${glowColors.solidBorder}` : "none",
		// No opacity changes for pinned nodes
		opacity: 1,
	};

	const orcid = data.externalIds.find(id => id.type === "orcid");

	return (
		<div style={nodeStyle}>
			{/* Connection handles - XYFlow automatically positions at node edges */}
			<Handle type="target" position={Position.Top} id="top" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="target" position={Position.Right} id="right" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="target" position={Position.Bottom} id="bottom" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="target" position={Position.Left} id="left" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Top} id="top-source" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Right} id="right-source" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Bottom} id="bottom-source" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Left} id="left-source" style={{ background: "#555", width: "8px", height: "8px" }} />

			{/* Top bar with node ID and pin button - flush to edges */}
			<div style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "stretch", // Stretch children to full height
				backgroundColor: "rgba(0,0,0,0.2)",
				padding: "0px", // Remove all padding
				borderRadius: "8px 8px 0 0", // Only top corners rounded
				fontSize: "9px",
				opacity: 0.8,
				minHeight: "24px" // Set explicit height
			}}>
				<span style={{
					display: "flex",
					alignItems: "center",
					paddingLeft: "8px", // Only the text gets padding
					fontFamily: "monospace",
					fontSize: "8px"
				}}>{data.entityId}</span>
				<PinToggleButton nodeId={data.entityId} isPinned={isNodePinned} />
			</div>

			{/* Title with icon centered across full width with proper padding */}
			<div style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				gap: "4px",
				wordWrap: "break-word",
				lineHeight: "1.2",
				padding: "8px 12px 4px 12px" // Add padding that was removed from parent
			}}>
				<IconUser size={14} /> {data.label}
			</div>

			{orcid && (
				<div style={{ fontSize: "8px", opacity: 0.7, fontFamily: "monospace" }}>
          ORCID: {orcid.value}
				</div>
			)}

			{/* Bottom bar with action buttons - flush to edges */}
			<div style={{
				display: "flex",
				justifyContent: "flex-end",
				alignItems: "stretch", // Stretch children to full height
				backgroundColor: "rgba(0,0,0,0.2)",
				padding: "0px", // Remove all padding
				borderRadius: "0 0 8px 8px", // Only bottom corners rounded
				fontSize: "9px",
				opacity: 0.8,
				minHeight: "20px" // Slightly smaller than top bar
			}}>
				<CollapseIsolatedButton nodeId={data.entityId} />
				<SelectAdjacentButton nodeId={data.entityId} />
				<AddAdjacentButton nodeId={data.entityId} />
				<ExpandButton nodeId={data.entityId} />
			</div>

		</div>
	);
};

// Source-specific node
export const SourceNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
	const isPinned = useGraphStore((state) => state.isPinned);
	const glowColors = getEntityGlowColors("sources");

	// Get current pin state from store
	const isNodePinned = isPinned(data.entityId);

	const nodeStyle: React.CSSProperties = {
		...baseNodeStyle,
		backgroundColor: "#2ecc71",
		// Only selected nodes get glow effect in their entity color
		boxShadow: selected
			? `0 0 0 2px ${glowColors.border}, 0 0 15px ${glowColors.glow}`
			: "none",
		// Only selected nodes get border styling
		border: selected ? `2px solid ${glowColors.solidBorder}` : "none",
		// No opacity changes for pinned nodes
		opacity: 1,
	};

	const issn = data.externalIds.find(id => id.type === "issn_l");

	return (
		<div style={nodeStyle}>
			{/* Connection handles - XYFlow automatically positions at node edges */}
			<Handle type="target" position={Position.Top} id="top" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="target" position={Position.Right} id="right" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="target" position={Position.Bottom} id="bottom" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="target" position={Position.Left} id="left" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Top} id="top-source" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Right} id="right-source" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Bottom} id="bottom-source" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Left} id="left-source" style={{ background: "#555", width: "8px", height: "8px" }} />

			{/* Top bar with node ID and pin button - flush to edges */}
			<div style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "stretch", // Stretch children to full height
				backgroundColor: "rgba(0,0,0,0.2)",
				padding: "0px", // Remove all padding
				borderRadius: "8px 8px 0 0", // Only top corners rounded
				fontSize: "9px",
				opacity: 0.8,
				minHeight: "24px" // Set explicit height
			}}>
				<span style={{
					display: "flex",
					alignItems: "center",
					paddingLeft: "8px", // Only the text gets padding
					fontFamily: "monospace",
					fontSize: "8px"
				}}>{data.entityId}</span>
				<PinToggleButton nodeId={data.entityId} isPinned={isNodePinned} />
			</div>

			{/* Title with icon centered across full width with proper padding */}
			<div style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				gap: "4px",
				wordWrap: "break-word",
				lineHeight: "1.2",
				padding: "8px 12px 4px 12px" // Add padding that was removed from parent
			}}>
				<IconBook size={14} /> {data.label}
			</div>

			{issn && (
				<div style={{ fontSize: "8px", opacity: 0.7, fontFamily: "monospace" }}>
          ISSN: {issn.value}
				</div>
			)}

			{/* Bottom bar with action buttons - flush to edges */}
			<div style={{
				display: "flex",
				justifyContent: "flex-end",
				alignItems: "stretch", // Stretch children to full height
				backgroundColor: "rgba(0,0,0,0.2)",
				padding: "0px", // Remove all padding
				borderRadius: "0 0 8px 8px", // Only bottom corners rounded
				fontSize: "9px",
				opacity: 0.8,
				minHeight: "20px" // Slightly smaller than top bar
			}}>
				<CollapseIsolatedButton nodeId={data.entityId} />
				<SelectAdjacentButton nodeId={data.entityId} />
				<AddAdjacentButton nodeId={data.entityId} />
				<ExpandButton nodeId={data.entityId} />
			</div>

		</div>
	);
};

// Institution-specific node
export const InstitutionNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
	const isPinned = useGraphStore((state) => state.isPinned);
	const glowColors = getEntityGlowColors("institutions");

	// Get current pin state from store
	const isNodePinned = isPinned(data.entityId);

	const nodeStyle: React.CSSProperties = {
		...baseNodeStyle,
		backgroundColor: "#f39c12",
		// Only selected nodes get glow effect in their entity color
		boxShadow: selected
			? `0 0 0 2px ${glowColors.border}, 0 0 15px ${glowColors.glow}`
			: "none",
		// Only selected nodes get border styling
		border: selected ? `2px solid ${glowColors.solidBorder}` : "none",
		// No opacity changes for pinned nodes
		opacity: 1,
	};

	const ror = data.externalIds.find(id => id.type === "ror");

	return (
		<div style={nodeStyle}>
			{/* Connection handles - XYFlow automatically positions at node edges */}
			<Handle type="target" position={Position.Top} id="top" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="target" position={Position.Right} id="right" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="target" position={Position.Bottom} id="bottom" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="target" position={Position.Left} id="left" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Top} id="top-source" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Right} id="right-source" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Bottom} id="bottom-source" style={{ background: "#555", width: "8px", height: "8px" }} />
			<Handle type="source" position={Position.Left} id="left-source" style={{ background: "#555", width: "8px", height: "8px" }} />

			{/* Top bar with node ID and pin button - flush to edges */}
			<div style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "stretch", // Stretch children to full height
				backgroundColor: "rgba(0,0,0,0.2)",
				padding: "0px", // Remove all padding
				borderRadius: "8px 8px 0 0", // Only top corners rounded
				fontSize: "9px",
				opacity: 0.8,
				minHeight: "24px" // Set explicit height
			}}>
				<span style={{
					display: "flex",
					alignItems: "center",
					paddingLeft: "8px", // Only the text gets padding
					fontFamily: "monospace",
					fontSize: "8px"
				}}>{data.entityId}</span>
				<PinToggleButton nodeId={data.entityId} isPinned={isNodePinned} />
			</div>

			{/* Title with icon centered across full width with proper padding */}
			<div style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				gap: "4px",
				wordWrap: "break-word",
				lineHeight: "1.2",
				padding: "8px 12px 4px 12px" // Add padding that was removed from parent
			}}>
				<IconBuilding size={14} /> {data.label}
			</div>

			{ror && (
				<div style={{ fontSize: "8px", opacity: 0.7, fontFamily: "monospace" }}>
          ROR: {ror.value}
				</div>
			)}
		</div>
	);
};

