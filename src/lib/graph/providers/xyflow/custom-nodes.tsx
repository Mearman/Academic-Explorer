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
	IconPinFilled
} from "@tabler/icons-react";
import type { EntityType, ExternalIdentifier } from "../../types";
import { useGraphStore } from "@/stores/graph-store";

// Helper function for safe metadata access
const _renderMetadataValue = (value: unknown): React.ReactNode => {
	if (typeof value === "number" || typeof value === "string") {
		return value;
	}
	return null;
};

// Pin toggle button component
interface PinToggleButtonProps {
  nodeId: string;
  isPinned: boolean;
  className?: string;
}

const PinToggleButton: React.FC<PinToggleButtonProps> = ({ nodeId, isPinned, className }) => {
	const { pinNode, unpinNode } = useGraphStore();

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
		case "geo":
			return "#16a085";
		default:
			return "#95a5a6";
	}
};

// Get entity type label
const getEntityTypeLabel = (entityType: EntityType): string => {
	switch (entityType) {
		case "works":
			return "Work";
		case "authors":
			return "Author";
		case "sources":
			return "Source";
		case "institutions":
			return "Institution";
		case "topics":
			return "Topic";
		case "publishers":
			return "Publisher";
		case "funders":
			return "Funder";
		case "keywords":
			return "Keyword";
		case "geo":
			return "Location";
		default:
			return "Entity";
	}
};

// Custom node component
export const CustomNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
	const { isPinned } = useGraphStore();
	const backgroundColor = getEntityColor(data.entityType);
	const typeLabel = getEntityTypeLabel(data.entityType);

	// Get current pin state from store
	const isNodePinned = isPinned(data.entityId);

	// Get primary external ID for display
	const primaryExternalId = data.externalIds.length > 0 ? data.externalIds[0] : undefined;

	const nodeStyle: React.CSSProperties = {
		...baseNodeStyle,
		backgroundColor,
		boxShadow: selected
			? "0 0 0 2px rgba(52, 152, 219, 0.5)"
			: isNodePinned
				? "0 0 0 3px rgba(255, 193, 7, 0.8), 0 0 15px rgba(255, 193, 7, 0.4)"
				: "none",
		border: isNodePinned ? "2px solid #ffc107" : "none",
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
		</div>
	);
};

// Work-specific node
export const WorkNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
	const { isPinned } = useGraphStore();

	// Get current pin state from store
	const isNodePinned = isPinned(data.entityId);

	const nodeStyle: React.CSSProperties = {
		...baseNodeStyle,
		backgroundColor: "#e74c3c",
		boxShadow: selected
			? "0 0 0 2px rgba(52, 152, 219, 0.5)"
			: isNodePinned
				? "0 0 0 3px rgba(255, 193, 7, 0.8), 0 0 15px rgba(255, 193, 7, 0.4)"
				: "none",
		border: isNodePinned ? "2px solid #ffc107" : "none",
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
		</div>
	);
};

// Author-specific node
export const AuthorNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
	const { isPinned } = useGraphStore();

	// Get current pin state from store
	const isNodePinned = isPinned(data.entityId);

	const nodeStyle: React.CSSProperties = {
		...baseNodeStyle,
		backgroundColor: "#3498db",
		boxShadow: selected
			? "0 0 0 2px rgba(52, 152, 219, 0.5)"
			: isNodePinned
				? "0 0 0 3px rgba(255, 193, 7, 0.8), 0 0 15px rgba(255, 193, 7, 0.4)"
				: "none",
		border: isNodePinned ? "2px solid #ffc107" : "none",
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
		</div>
	);
};

// Source-specific node
export const SourceNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
	const { isPinned } = useGraphStore();

	// Get current pin state from store
	const isNodePinned = isPinned(data.entityId);

	const nodeStyle: React.CSSProperties = {
		...baseNodeStyle,
		backgroundColor: "#2ecc71",
		boxShadow: selected
			? "0 0 0 2px rgba(52, 152, 219, 0.5)"
			: isNodePinned
				? "0 0 0 3px rgba(255, 193, 7, 0.8), 0 0 15px rgba(255, 193, 7, 0.4)"
				: "none",
		border: isNodePinned ? "2px solid #ffc107" : "none",
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
		</div>
	);
};

// Institution-specific node
export const InstitutionNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
	const { isPinned } = useGraphStore();

	// Get current pin state from store
	const isNodePinned = isPinned(data.entityId);

	const nodeStyle: React.CSSProperties = {
		...baseNodeStyle,
		backgroundColor: "#f39c12",
		boxShadow: selected
			? "0 0 0 2px rgba(52, 152, 219, 0.5)"
			: isNodePinned
				? "0 0 0 3px rgba(255, 193, 7, 0.8), 0 0 15px rgba(255, 193, 7, 0.4)"
				: "none",
		border: isNodePinned ? "2px solid #ffc107" : "none",
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

