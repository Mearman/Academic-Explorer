/**
 * Right sidebar for graph navigation
 * Shows entity details and related information
 */

import React from "react"
import { CollapsibleSidebar } from "./CollapsibleSidebar"
import { useLayoutStore } from "@/stores/layout-store"
import { useGraphStore } from "@/stores/graph-store"
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
		<CollapsibleSidebar side="right" title="Entity Details">
			{displayEntity ? (
				<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

					{/* Entity Header */}
					<div style={{
						padding: "16px",
						backgroundColor: "#f9fafb",
						borderRadius: "8px",
						border: "2px solid",
						borderColor: getEntityColor(displayEntity.type),
					}}>
						<div style={{
							display: "flex",
							alignItems: "flex-start",
							gap: "12px",
							marginBottom: "8px"
						}}>
							<span style={{ fontSize: "24px" }}>
								{getEntityIcon(displayEntity.type)}
							</span>
							<div style={{ flex: 1 }}>
								<div style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									marginBottom: "4px"
								}}>
									<span style={{
										fontSize: "12px",
										fontWeight: 600,
										color: getEntityColor(displayEntity.type),
										textTransform: "uppercase",
										letterSpacing: "0.5px"
									}}>
										{getEntityTypeLabel(displayEntity.type)}
									</span>
								</div>
								<h4 style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: 600,
									color: "#111827",
									lineHeight: "1.3",
									wordWrap: "break-word"
								}}>
									{displayEntity.label}
								</h4>
							</div>
						</div>

						{/* OpenAlex ID */}
						<div style={{
							fontSize: "11px",
							color: "#6b7280",
							fontFamily: "monospace",
							backgroundColor: "#ffffff",
							padding: "4px 6px",
							borderRadius: "4px",
							wordBreak: "break-all"
						}}>
							{displayEntity.entityId}
						</div>
					</div>

					{/* External IDs */}
					{displayEntity.externalIds.length > 0 && (
						<div>
							<div style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								marginBottom: "8px",
								fontSize: "13px",
								fontWeight: 600,
								color: "#374151"
							}}>
								<IconExternalLink size={16} />
                External Links
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
								{displayEntity.externalIds.map((extId, index) => (
									<a
										key={index}
										href={extId.url}
										target="_blank"
										rel="noopener noreferrer"
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											padding: "6px 8px",
											backgroundColor: "#f3f4f6",
											borderRadius: "4px",
											textDecoration: "none",
											color: "#374151",
											fontSize: "12px",
											transition: "background-color 0.2s",
										}}
									>
										<span style={{
											fontWeight: 600,
											textTransform: "uppercase",
											color: "#6b7280",
											minWidth: "40px"
										}}>
											{extId.type}
										</span>
										<span style={{
											fontFamily: "monospace",
											flex: 1,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										}}>
											{extId.value}
										</span>
										<IconExternalLink size={12} style={{ opacity: 0.5 }} />
									</a>
								))}
							</div>
						</div>
					)}

					{/* Metadata */}
					{displayEntity.metadata && Object.keys(displayEntity.metadata).length > 0 && (
						<div>
							<div style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								marginBottom: "8px",
								fontSize: "13px",
								fontWeight: 600,
								color: "#374151"
							}}>
								<IconInfoCircle size={16} />
                Metadata
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
								{Object.entries(displayEntity.metadata).map(([key, value]) => {
									if (value === undefined || value === null || key === "isPlaceholder") return null

									return (
										<div key={key} style={{
											display: "flex",
											justifyContent: "space-between",
											padding: "4px 0",
											borderBottom: "1px solid #f3f4f6",
											fontSize: "12px"
										}}>
											<span style={{ color: "#6b7280", fontWeight: 500 }}>
												{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}:
											</span>
											<span style={{ color: "#111827", fontWeight: 600, textAlign: "right" }}>
												{(() => {
													if (typeof value === "boolean") {
														return value ? "Yes" : "No";
													}
													if (typeof value === "object" && value !== null) {
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
											</span>
										</div>
									)
								})}
							</div>
						</div>
					)}

					{/* Graph Statistics */}
					<div>
						<div style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							marginBottom: "8px",
							fontSize: "13px",
							fontWeight: 600,
							color: "#374151"
						}}>
							<IconUsers size={16} />
              Graph Statistics
						</div>

						<div style={{
							padding: "12px",
							backgroundColor: "#f9fafb",
							borderRadius: "6px",
							fontSize: "12px"
						}}>
							<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
								<span style={{ color: "#6b7280" }}>Total Nodes:</span>
								<span style={{ color: "#111827", fontWeight: 600 }}>{nodes.size}</span>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span style={{ color: "#6b7280" }}>Selected:</span>
								<span style={{ color: "#111827", fontWeight: 600 }}>
									{selectedNodeId ? "1 node" : "None"}
								</span>
							</div>
						</div>
					</div>

					{/* Actions */}
					<div style={{
						padding: "12px",
						backgroundColor: "#f0f9ff",
						borderRadius: "6px",
						fontSize: "12px",
						color: "#1e40af"
					}}>
						<div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
							<IconBookmark size={14} />
							<strong>Available Actions:</strong>
						</div>
						<ul style={{ margin: "4px 0", paddingLeft: "16px", lineHeight: "1.4" }}>
							<li>Click to navigate to entity page</li>
							<li>Double-click to expand relationships</li>
							<li>Hover to preview details</li>
						</ul>
					</div>
				</div>
			) : (
			/* Empty State */
				<div style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					height: "200px",
					textAlign: "center",
					color: "#6b7280"
				}}>
					<div style={{ marginBottom: "12px", opacity: 0.5 }}>
						<IconSearch size={48} />
					</div>
					<div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>
            No Entity Selected
					</div>
					<div style={{ fontSize: "12px", lineHeight: "1.4", maxWidth: "200px" }}>
            Hover over or click on a node in the graph to see detailed information here.
					</div>
				</div>
			)}
		</CollapsibleSidebar>
	)
}