/**
 * Graph component that uses real OpenAlex API data
 * Test component for API integration
 */

import React, { useState } from "react"
import { IconLoader, IconX } from "@tabler/icons-react"
import { useGraphStore } from "@/stores/graph-store"
import { useGraphData } from "@/hooks/use-graph-data"
import { GraphNavigation } from "@/components/layout/GraphNavigation"
import { GraphSessionManager } from "@/components/organisms/GraphSessionManager"
import { logError } from "@/lib/logger"

export const GraphWithRealAPI: React.FC = () => {
	const [testEntityId, setTestEntityId] = useState("W2741809807") // Known OpenAlex work ID
	const [isLoadingTest, setIsLoadingTest] = useState(false)
	const [showSessionManager, setShowSessionManager] = useState(false)
	const { loadEntity, search, expandNode: _expandNode } = useGraphData()
	const { nodes, edges, isLoading, error } = useGraphStore()

	const handleLoadTestEntity = async () => {
		setIsLoadingTest(true)
		try {
			await loadEntity(testEntityId)
		} catch (err) {
			logError("Failed to load test entity", err, "GraphWithRealAPI", "ui")
		} finally {
			setIsLoadingTest(false)
		}
	}

	const handleTestSearch = async () => {
		setIsLoadingTest(true)
		try {
			await search("machine learning", {
				entityTypes: ["works", "authors"],
				limit: 5
			})
		} catch (err) {
			logError("Failed to search", err, "GraphWithRealAPI", "ui")
		} finally {
			setIsLoadingTest(false)
		}
	}

	return (
		<div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
			{/* Test Controls */}
			<div style={{
				padding: "12px",
				background: "#f3f4f6",
				borderBottom: "1px solid #e5e7eb",
				display: "flex",
				gap: "12px",
				alignItems: "center"
			}}>
				<div style={{ fontSize: "14px", fontWeight: 600 }}>
          Real API Test:
				</div>

				<input
					type="text"
					value={testEntityId}
					onChange={(e) => { setTestEntityId(e.target.value) }}
					placeholder="Enter OpenAlex ID (e.g., W2741809807)"
					style={{
						padding: "6px 8px",
						border: "1px solid #d1d5db",
						borderRadius: "4px",
						fontSize: "13px",
						width: "200px"
					}}
				/>

				<button
					onClick={() => void handleLoadTestEntity()}
					disabled={isLoadingTest || isLoading}
					style={{
						padding: "6px 12px",
						background: "#3b82f6",
						color: "white",
						border: "none",
						borderRadius: "4px",
						fontSize: "13px",
						cursor: "pointer"
					}}
				>
					{isLoadingTest ? "Loading..." : "Load Entity"}
				</button>

				<button
					onClick={() => void handleTestSearch()}
					disabled={isLoadingTest || isLoading}
					style={{
						padding: "6px 12px",
						background: "#10b981",
						color: "white",
						border: "none",
						borderRadius: "4px",
						fontSize: "13px",
						cursor: "pointer"
					}}
				>
          Test Search
				</button>

				<button
					onClick={() => { setShowSessionManager(true) }}
					style={{
						padding: "6px 12px",
						background: "#8b5cf6",
						color: "white",
						border: "none",
						borderRadius: "4px",
						fontSize: "13px",
						cursor: "pointer"
					}}
				>
          Sessions
				</button>

				<div style={{ marginLeft: "auto", fontSize: "13px", color: "#6b7280" }}>
          Nodes: {nodes.size} | Edges: {edges.size}
				</div>
			</div>

			{/* Loading State */}
			{isLoading && (
				<div style={{
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					background: "rgba(255, 255, 255, 0.9)",
					padding: "16px",
					borderRadius: "8px",
					boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
					zIndex: 1000
				}}>
					<div style={{ textAlign: "center" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<IconLoader size={16} />
              Loading from OpenAlex API...
						</div>
						<div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
              Fetching academic data
						</div>
					</div>
				</div>
			)}

			{/* Error State */}
			{error && (
				<div style={{
					position: "absolute",
					top: "70px",
					left: "50%",
					transform: "translateX(-50%)",
					background: "#fef2f2",
					border: "1px solid #fecaca",
					color: "#dc2626",
					padding: "8px 12px",
					borderRadius: "6px",
					fontSize: "14px",
					zIndex: 1000
				}}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<IconX size={16} />
            Error: {error}
					</div>
				</div>
			)}

			{/* Graph */}
			<div style={{ flex: 1, position: "relative" }}>
				<GraphNavigation />
			</div>

			{/* Session Manager */}
			<GraphSessionManager
				isOpen={showSessionManager}
				onClose={() => { setShowSessionManager(false) }}
			/>
		</div>
	)
}