/**
 * Graph session management component
 * Provides UI for saving, loading, and managing graph sessions
 */

import React, { useState, useMemo } from "react"
import { useGraphPersistence } from "@/hooks/use-graph-persistence"
import { useGraphStore } from "@/stores/graph-store"
import { logError } from "@/lib/logger"
import { IconDeviceFloppy, IconFolderOpen, IconTrash, IconEdit, IconClock, IconGraph, IconX } from "@tabler/icons-react"

interface GraphSessionManagerProps {
  isOpen: boolean
  onClose: () => void
}

export const GraphSessionManager: React.FC<GraphSessionManagerProps> = ({
	isOpen,
	onClose
}) => {
	const [activeTab, setActiveTab] = useState<"load" | "save">("load")
	const [sessionName, setSessionName] = useState("")
	const [sessionDescription, setSessionDescription] = useState("")
	const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
	const [editName, setEditName] = useState("")
	const [editDescription, setEditDescription] = useState("")

	const hasGraphData = useGraphStore(React.useCallback((state) =>
		Object.keys(state.nodes).length > 0 || Object.keys(state.edges).length > 0,
		[]
	))
	const {
		loadSessions,
		saveSession,
		loadSession,
		deleteSession,
		updateSession
	} = useGraphPersistence()

	const sessions = useMemo(() => loadSessions(), [loadSessions])

	const handleSave = () => {
		if (!sessionName.trim()) return

		try {
			const _sessionId = saveSession(sessionName.trim(), sessionDescription.trim() || undefined)
			setSessionName("")
			setSessionDescription("")
			setActiveTab("load")
			// Session saved successfully - no logging needed for user actions
		} catch (error) {
			logError("Failed to save session", error, "GraphSessionManager", "ui")
			alert("Failed to save session. Please try again.")
		}
	}

	const handleLoad = (sessionId: string) => {
		const success = loadSession(sessionId)
		if (success) {
			onClose()
		} else {
			alert("Failed to load session. It may have been corrupted.")
		}
	}

	const handleDelete = (sessionId: string) => {
		if (confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
			const success = deleteSession(sessionId)
			if (!success) {
				alert("Failed to delete session. Please try again.")
			}
		}
	}

	const handleStartEdit = (sessionId: string, name: string, description?: string) => {
		setEditingSessionId(sessionId)
		setEditName(name)
		setEditDescription(description || "")
	}

	const handleSaveEdit = () => {
		if (!editingSessionId || !editName.trim()) return

		const success = updateSession(editingSessionId, {
			name: editName.trim(),
			description: editDescription.trim() || undefined
		})

		if (success) {
			setEditingSessionId(null)
			setEditName("")
			setEditDescription("")
		} else {
			alert("Failed to update session. Please try again.")
		}
	}

	const handleCancelEdit = () => {
		setEditingSessionId(null)
		setEditName("")
		setEditDescription("")
	}

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		}).format(date)
	}

	if (!isOpen) return null

	return (
		<div style={{
			position: "fixed",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: "rgba(0, 0, 0, 0.5)",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			zIndex: 1000
		}}>
			<div style={{
				backgroundColor: "white",
				borderRadius: "8px",
				width: "600px",
				maxWidth: "90vw",
				maxHeight: "80vh",
				overflow: "hidden",
				boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
				display: "flex",
				flexDirection: "column"
			}}>
				{/* Header */}
				<div style={{
					padding: "16px 20px",
					borderBottom: "1px solid #e5e7eb",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between"
				}}>
					<h2 style={{
						margin: 0,
						fontSize: "18px",
						fontWeight: 600,
						color: "#111827"
					}}>
            Graph Sessions
					</h2>
					<button
						onClick={onClose}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							padding: "4px",
							borderRadius: "4px",
							color: "#6b7280"
						}}
					>
						<IconX size={20} />
					</button>
				</div>

				{/* Tabs */}
				<div style={{
					display: "flex",
					borderBottom: "1px solid #e5e7eb"
				}}>
					<button
						onClick={() => { setActiveTab("load"); }}
						style={{
							flex: 1,
							padding: "12px 16px",
							background: "none",
							border: "none",
							cursor: "pointer",
							fontSize: "14px",
							fontWeight: 500,
							color: activeTab === "load" ? "#3b82f6" : "#6b7280",
							borderBottom: activeTab === "load" ? "2px solid #3b82f6" : "2px solid transparent",
							transition: "all 0.2s"
						}}
					>
						<IconFolderOpen size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
            Load Sessions ({sessions.length})
					</button>
					<button
						onClick={() => { setActiveTab("save"); }}
						style={{
							flex: 1,
							padding: "12px 16px",
							background: "none",
							border: "none",
							cursor: "pointer",
							fontSize: "14px",
							fontWeight: 500,
							color: activeTab === "save" ? "#3b82f6" : "#6b7280",
							borderBottom: activeTab === "save" ? "2px solid #3b82f6" : "2px solid transparent",
							transition: "all 0.2s"
						}}
						disabled={!hasGraphData}
					>
						<IconDeviceFloppy size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
            Save Current Graph
					</button>
				</div>

				{/* Content */}
				<div style={{
					flex: 1,
					padding: "20px",
					overflow: "auto"
				}}>
					{activeTab === "load" && (
						<div>
							{sessions.length === 0 ? (
								<div style={{
									textAlign: "center",
									padding: "40px 20px",
									color: "#6b7280"
								}}>
									<IconGraph size={48} style={{ marginBottom: "16px", opacity: 0.3 }} />
									<p style={{ margin: 0, fontSize: "16px" }}>No saved sessions yet</p>
									<p style={{ margin: "4px 0 0", fontSize: "14px" }}>
                    Create a graph and save it to get started
									</p>
								</div>
							) : (
								<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
									{sessions.map((session) => (
										<div
											key={session.id}
											style={{
												border: "1px solid #e5e7eb",
												borderRadius: "8px",
												padding: "16px",
												transition: "border-color 0.2s",
												cursor: "pointer"
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.borderColor = "#d1d5db"
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.borderColor = "#e5e7eb"
											}}
										>
											{editingSessionId === session.id ? (
												<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
													<input
														type="text"
														value={editName}
														onChange={(e) => { setEditName(e.target.value); }}
														placeholder="Session name"
														style={{
															padding: "6px 8px",
															border: "1px solid #d1d5db",
															borderRadius: "4px",
															fontSize: "14px"
														}}
													/>
													<textarea
														value={editDescription}
														onChange={(e) => { setEditDescription(e.target.value); }}
														placeholder="Description (optional)"
														rows={2}
														style={{
															padding: "6px 8px",
															border: "1px solid #d1d5db",
															borderRadius: "4px",
															fontSize: "13px",
															resize: "vertical",
															fontFamily: "inherit"
														}}
													/>
													<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
														<button
															onClick={handleCancelEdit}
															style={{
																padding: "6px 12px",
																background: "#f3f4f6",
																color: "#374151",
																border: "none",
																borderRadius: "4px",
																fontSize: "13px",
																cursor: "pointer"
															}}
														>
                              Cancel
														</button>
														<button
															onClick={handleSaveEdit}
															disabled={!editName.trim()}
															style={{
																padding: "6px 12px",
																background: editName.trim() ? "#3b82f6" : "#9ca3af",
																color: "white",
																border: "none",
																borderRadius: "4px",
																fontSize: "13px",
																cursor: editName.trim() ? "pointer" : "not-allowed"
															}}
														>
                              Save
														</button>
													</div>
												</div>
											) : (
												<>
													<div style={{
														display: "flex",
														alignItems: "flex-start",
														justifyContent: "space-between",
														marginBottom: "8px"
													}}>
														<h3 style={{
															margin: 0,
															fontSize: "16px",
															fontWeight: 600,
															color: "#111827"
														}}>
															{session.name}
														</h3>
														<div style={{ display: "flex", gap: "4px" }}>
															<button
																onClick={(e) => {
																	e.stopPropagation()
																	handleStartEdit(session.id, session.name, session.metadata?.description)
																}}
																style={{
																	background: "none",
																	border: "none",
																	cursor: "pointer",
																	padding: "4px",
																	borderRadius: "4px",
																	color: "#6b7280"
																}}
																title="Edit session"
															>
																<IconEdit size={14} />
															</button>
															<button
																onClick={(e) => {
																	e.stopPropagation()
																	handleDelete(session.id)
																}}
																style={{
																	background: "none",
																	border: "none",
																	cursor: "pointer",
																	padding: "4px",
																	borderRadius: "4px",
																	color: "#ef4444"
																}}
																title="Delete session"
															>
																<IconTrash size={14} />
															</button>
														</div>
													</div>

													{session.metadata?.description && (
														<p style={{
															margin: "0 0 8px",
															fontSize: "13px",
															color: "#6b7280",
															lineHeight: "1.4"
														}}>
															{session.metadata.description}
														</p>
													)}

													<div style={{
														display: "flex",
														alignItems: "center",
														justifyContent: "space-between",
														fontSize: "12px",
														color: "#9ca3af",
														marginBottom: "12px"
													}}>
														<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
															<IconClock size={12} />
															{formatDate(session.lastModified)}
														</div>
														{session.metadata?.entityCounts && (
															<div>
																{session.metadata.entityCounts.total} entities
																{" "}({session.metadata.entityCounts.works} works, {session.metadata.entityCounts.authors} authors)
															</div>
														)}
													</div>

													<button
														onClick={() => { handleLoad(session.id); }}
														style={{
															width: "100%",
															padding: "8px 12px",
															background: "#3b82f6",
															color: "white",
															border: "none",
															borderRadius: "6px",
															fontSize: "14px",
															fontWeight: 500,
															cursor: "pointer",
															transition: "background-color 0.2s"
														}}
														onMouseEnter={(e) => {
															e.currentTarget.style.backgroundColor = "#2563eb"
														}}
														onMouseLeave={(e) => {
															e.currentTarget.style.backgroundColor = "#3b82f6"
														}}
													>
                            Load Session
													</button>
												</>
											)}
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{activeTab === "save" && (
						<div>
							{!hasGraphData ? (
								<div style={{
									textAlign: "center",
									padding: "40px 20px",
									color: "#6b7280"
								}}>
									<IconGraph size={48} style={{ marginBottom: "16px", opacity: 0.3 }} />
									<p style={{ margin: 0, fontSize: "16px" }}>No graph data to save</p>
									<p style={{ margin: "4px 0 0", fontSize: "14px" }}>
                    Load some entities to create a graph first
									</p>
								</div>
							) : (
								<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
									<div>
										<label style={{
											display: "block",
											fontSize: "14px",
											fontWeight: 500,
											color: "#374151",
											marginBottom: "6px"
										}}>
                      Session Name *
										</label>
										<input
											type="text"
											value={sessionName}
											onChange={(e) => { setSessionName(e.target.value); }}
											placeholder="Enter a name for this session"
											style={{
												width: "100%",
												padding: "8px 12px",
												border: "1px solid #d1d5db",
												borderRadius: "6px",
												fontSize: "14px",
												outline: "none",
												boxSizing: "border-box"
											}}
										/>
									</div>

									<div>
										<label style={{
											display: "block",
											fontSize: "14px",
											fontWeight: 500,
											color: "#374151",
											marginBottom: "6px"
										}}>
                      Description (Optional)
										</label>
										<textarea
											value={sessionDescription}
											onChange={(e) => { setSessionDescription(e.target.value); }}
											placeholder="Describe what this graph represents"
											rows={3}
											style={{
												width: "100%",
												padding: "8px 12px",
												border: "1px solid #d1d5db",
												borderRadius: "6px",
												fontSize: "14px",
												outline: "none",
												resize: "vertical",
												fontFamily: "inherit",
												boxSizing: "border-box"
											}}
										/>
									</div>

									<div style={{
										padding: "12px",
										backgroundColor: "#f3f4f6",
										borderRadius: "6px",
										fontSize: "13px",
										color: "#6b7280"
									}}>
										<strong>Current Graph:</strong> {Object.keys(nodes).length} nodes, {Object.keys(edges).length} edges
									</div>

									<button
										onClick={handleSave}
										disabled={!sessionName.trim()}
										style={{
											width: "100%",
											padding: "12px",
											background: sessionName.trim() ? "#10b981" : "#9ca3af",
											color: "white",
											border: "none",
											borderRadius: "6px",
											fontSize: "14px",
											fontWeight: 500,
											cursor: sessionName.trim() ? "pointer" : "not-allowed",
											transition: "background-color 0.2s"
										}}
									>
										<IconDeviceFloppy size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                    Save Session
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}