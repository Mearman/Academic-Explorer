/**
 * Right-click context menu for graph nodes
 * Provides actions like expand, view details, copy URL, etc.
 */

import React, { useCallback } from "react"
import { useGraphData } from "@/hooks/use-graph-data"
import { useGraphStore } from "@/stores/graph-store"
import { logError, logger } from "@academic-explorer/utils/logger";
import type { GraphNode } from "@academic-explorer/graph";
import { IconExternalLink, IconCopy, IconGitBranch, IconInfoCircle, IconPin, IconPinned } from "@tabler/icons-react"

interface NodeContextMenuProps {
  node: GraphNode
  x: number
  y: number
  onClose: () => void
  onViewDetails?: (node: GraphNode) => void
}

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
	node,
	x,
	y,
	onClose,
	onViewDetails
}) => {
	const graphData = useGraphData()
	const {expandNode} = graphData
	const pinNode = useGraphStore((state) => state.pinNode)
	const unpinNode = useGraphStore((state) => state.unpinNode)
	const isPinned = useGraphStore((state) => state.isPinned)

	// Check if node exists in store
	const isExpanded = useGraphStore(React.useCallback((state) => Boolean(state.nodes[node.id]), [node.id]))
	const isNodePinned = isPinned(node.id)

	const handleExpand = useCallback(async () => {
		await expandNode(node.id, { limit: 8 })
		onClose()
	}, [node.id, expandNode, onClose])

	const handlePin = useCallback(() => {
		if (isNodePinned) {
			unpinNode(node.id)
		} else {
			pinNode(node.id)
		}
		onClose()
	}, [node.id, isNodePinned, pinNode, unpinNode, onClose])

	const handleViewDetails = useCallback(() => {
		if (onViewDetails) {
			onViewDetails(node)
		}
		onClose()
	}, [node, onViewDetails, onClose])

	const handleCopyUrl = useCallback(async () => {
		// Try to create a URL with external ID if available
		let url = window.location.origin

		if (node.externalIds.length > 0) {
			const extId = node.externalIds[0]
			if (extId?.type && extId.value) {
				switch (extId.type) {
					case "doi":
						url += `/works/doi/${encodeURIComponent(extId.value)}`
						break
					case "orcid":
						url += `/authors/orcid/${extId.value}`
						break
					case "ror":
						url += `/institutions/ror/${extId.value}`
						break
					case "issn_l":
						url += `/sources/issn/${extId.value}`
						break
					default:
						url += `/${node.entityId}`
						break
				}
			} else {
				url += `/${node.entityId}`
			}
		} else {
			url += `/${node.entityId}`
		}

		try {
			await navigator.clipboard.writeText(url)
			// Simple visual feedback
			const {activeElement} = document
			if (activeElement && activeElement instanceof HTMLElement) {
				const originalText = activeElement.textContent
				activeElement.textContent = "Copied!"
				setTimeout(() => {
					activeElement.textContent = originalText
				}, 1000)
			}
		} catch (error) {
			logError(logger, "Failed to copy URL", error, "NodeContextMenu", "ui")
		}

		onClose()
	}, [node, onClose])

	const handleOpenExternal = useCallback(() => {
		if (node.externalIds.length > 0) {
			const extId = node.externalIds[0]
			if (extId?.url) {
				window.open(extId.url, "_blank")
			} else {
				// Open OpenAlex page
				window.open(node.entityId, "_blank")
			}
		} else {
			// Open OpenAlex page
			window.open(node.entityId, "_blank")
		}
		onClose()
	}, [node, onClose])

	const menuItems = [
		{
			id: "expand",
			label: isExpanded ? "Already Expanded" : "Expand Node",
			icon: <IconGitBranch size={14} />,
			action: handleExpand,
			disabled: isExpanded
		},
		{
			id: "pin",
			label: isNodePinned ? "Unpin Node" : "Pin Node",
			icon: isNodePinned ? <IconPinned size={14} /> : <IconPin size={14} />,
			action: handlePin
		},
		{
			id: "details",
			label: "View Details",
			icon: <IconInfoCircle size={14} />,
			action: handleViewDetails
		},
		{
			id: "copy",
			label: "Copy URL",
			icon: <IconCopy size={14} />,
			action: handleCopyUrl
		},
		{
			id: "external",
			label: node.externalIds.length > 0 ? "Open External Link" : "Open in OpenAlex",
			icon: <IconExternalLink size={14} />,
			action: handleOpenExternal
		}
	]

	return (
		<>
			{/* Overlay to close menu when clicking outside */}
			<div
				role="button"
				tabIndex={0}
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					width: "100vw",
					height: "100vh",
					zIndex: 999,
				}}
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
						onClose()
					}
				}}
				aria-label="Close context menu"
			/>

			{/* Context menu */}
			<div
				style={{
					position: "fixed",
					left: x,
					top: y,
					background: "white",
					border: "1px solid #e5e7eb",
					borderRadius: "8px",
					boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
					zIndex: 1000,
					minWidth: "180px",
					padding: "6px",
				}}
			>
				{/* Node info header */}
				<div style={{
					padding: "8px 12px",
					borderBottom: "1px solid #f3f4f6",
					marginBottom: "4px"
				}}>
					<div style={{
						fontSize: "12px",
						fontWeight: 600,
						color: "#374151",
						marginBottom: "2px"
					}}>
						{node.type.charAt(0).toUpperCase() + node.type.slice(1, -1)} {/* Remove 's' and capitalize */}
					</div>
					<div style={{
						fontSize: "11px",
						color: "#6b7280",
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						maxWidth: "160px"
					}}>
						{node.label}
					</div>
				</div>

				{/* Menu items */}
				{menuItems.map((item) => (
					<button
						key={item.id}
						onClick={() => void item.action()}
						disabled={item.disabled}
						style={{
							display: "flex",
							alignItems: "center",
							width: "100%",
							padding: "8px 12px",
							border: "none",
							background: item.disabled ? "#f9fafb" : "transparent",
							color: item.disabled ? "#9ca3af" : "#374151",
							fontSize: "13px",
							borderRadius: "6px",
							cursor: item.disabled ? "not-allowed" : "pointer",
							transition: "background-color 0.15s",
						}}
						onMouseEnter={(e) => {
							if (!item.disabled) {
								e.currentTarget.style.backgroundColor = "#f3f4f6"
							}
						}}
						onMouseLeave={(e) => {
							if (!item.disabled) {
								e.currentTarget.style.backgroundColor = "transparent"
							}
						}}
					>
						<span style={{ marginRight: "8px", display: "flex", alignItems: "center" }}>
							{item.icon}
						</span>
						{item.label}
					</button>
				))}
			</div>
		</>
	)
}