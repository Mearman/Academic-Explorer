/**
 * Reusable collapsible sidebar component
 * Supports pinning and auto-collapse functionality
 */

import React, { useCallback, useRef, useEffect } from "react"
import { useLayoutStore } from "@/stores/layout-store"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { IconPin, IconPinFilled, IconChevronLeft, IconChevronRight, IconSearch, IconFile, IconEyeOff, IconEye } from "@tabler/icons-react"

interface CollapsibleSidebarProps {
  side: "left" | "right"
  title: string
  children: React.ReactNode
  className?: string
  minWidth?: number
  maxWidth?: number
}

export const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
	side,
	title,
	children,
	className = "",
	minWidth = 320,
	maxWidth = 400,
}) => {
	const {
		leftSidebarOpen,
		rightSidebarOpen,
		leftSidebarPinned,
		rightSidebarPinned,
		leftSidebarAutoHidden,
		rightSidebarAutoHidden,
		leftSidebarHovered,
		rightSidebarHovered,
		toggleLeftSidebar,
		toggleRightSidebar,
		pinLeftSidebar,
		pinRightSidebar,
		setLeftSidebarAutoHidden,
		setRightSidebarAutoHidden,
		setLeftSidebarHovered,
		setRightSidebarHovered,
	} = useLayoutStore()
	const { colors } = useThemeColors()

	const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	const isOpen = side === "left" ? leftSidebarOpen : rightSidebarOpen
	const isPinned = side === "left" ? leftSidebarPinned : rightSidebarPinned
	const isAutoHidden = side === "left" ? leftSidebarAutoHidden : rightSidebarAutoHidden
	const isHovered = side === "left" ? leftSidebarHovered : rightSidebarHovered
	const toggle = side === "left" ? toggleLeftSidebar : toggleRightSidebar
	const setPin = side === "left" ? pinLeftSidebar : pinRightSidebar
	const setAutoHidden = side === "left" ? setLeftSidebarAutoHidden : setRightSidebarAutoHidden
	const setHovered = side === "left" ? setLeftSidebarHovered : setRightSidebarHovered

	// Calculate the effective visibility
	const isEffectivelyVisible = isOpen && (!isAutoHidden || isHovered || isPinned)

	const handleToggle = () => {
		toggle()
		// Reset autohide when manually toggling
		if (isAutoHidden) {
			setAutoHidden(false)
		}
	}

	const handlePin = () => {
		setPin(!isPinned)
		// If pinning, ensure sidebar is visible
		if (!isPinned) {
			setAutoHidden(false)
		}
	}

	const handleToggleAutoHide = () => {
		if (isAutoHidden) {
			// Disable autohide mode - make sidebar visible
			setAutoHidden(false)
		} else {
			// Enable autohide mode - hide sidebar after a delay
			autoHideTimeoutRef.current = setTimeout(() => {
				setAutoHidden(true)
			}, 1500) // 1.5 second delay when manually enabling
		}
	}

	const handleMouseEnter = useCallback(() => {
		setHovered(true)
		// Clear any pending autohide timeout
		if (autoHideTimeoutRef.current) {
			clearTimeout(autoHideTimeoutRef.current)
			autoHideTimeoutRef.current = null
		}
	}, [setHovered])

	const handleMouseLeave = useCallback(() => {
		setHovered(false)
		// Only start autohide timer if sidebar was previously auto-hidden
		// This prevents aggressive auto-hiding of sidebars that user hasn't interacted with
		if (!isPinned && isOpen && isAutoHidden) {
			autoHideTimeoutRef.current = setTimeout(() => {
				setAutoHidden(true)
			}, 1000) // 1 second delay before autohiding
		}
	}, [setHovered, isPinned, isOpen, isAutoHidden, setAutoHidden])

	// Initialize autohide behavior - only start timer after user interaction
	useEffect(() => {
		// Don't auto-hide immediately on mount - only after user interactions
		// This prevents sidebars from disappearing unexpectedly on page load
		return () => {
			if (autoHideTimeoutRef.current) {
				clearTimeout(autoHideTimeoutRef.current)
				autoHideTimeoutRef.current = null
			}
		}
	}, [])

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (autoHideTimeoutRef.current) {
				clearTimeout(autoHideTimeoutRef.current)
			}
		}
	}, [])

	const sidebarStyle: React.CSSProperties = {
		position: "relative",
		height: "100%",
		backgroundColor: colors.background.primary,
		borderRight: side === "left" ? `1px solid ${colors.border.primary}` : undefined,
		borderLeft: side === "right" ? `1px solid ${colors.border.primary}` : undefined,
		transition: "width 300ms ease-in-out, opacity 200ms ease-in-out, transform 200ms ease-in-out",
		width: isEffectivelyVisible ? `${String(minWidth)}px` : "48px",
		minWidth: isEffectivelyVisible ? `${String(minWidth)}px` : "48px",
		maxWidth: isEffectivelyVisible ? `${String(maxWidth)}px` : "48px",
		opacity: isEffectivelyVisible ? 1 : 0.8,
		transform: isAutoHidden && !isHovered && !isPinned ? `translateX(${side === "left" ? "-20px" : "20px"})` : "translateX(0)",
		overflow: "hidden",
		display: "flex",
		flexDirection: "column",
		zIndex: isAutoHidden && isHovered ? 1000 : "auto", // Overlay when autohidden but hovered
		boxShadow: isAutoHidden && isHovered ? "0 4px 12px rgba(0, 0, 0, 0.15)" : "none",
	}

	const headerStyle: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: isEffectivelyVisible ? "12px 16px" : "12px 8px",
		borderBottom: `1px solid ${colors.border.primary}`,
		backgroundColor: colors.background.secondary,
		minHeight: "48px",
	}

	const contentStyle: React.CSSProperties = {
		flex: 1,
		overflow: isEffectivelyVisible ? "auto" : "hidden",
		padding: isEffectivelyVisible ? "16px" : "8px",
	}

	const CollapseIcon = side === "left"
		? (isOpen ? IconChevronLeft : IconChevronRight)
		: (isOpen ? IconChevronRight : IconChevronLeft)

	return (
		<div
			className={className}
			style={sidebarStyle}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{/* Header */}
			<div style={headerStyle}>
				{isEffectivelyVisible && (
					<>
						<h3 style={{
							margin: 0,
							fontSize: "14px",
							fontWeight: 600,
							color: colors.text.primary
						}}>
							{title}
						</h3>

						<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
							<button
								onClick={handleToggleAutoHide}
								style={{
									background: "none",
									border: "none",
									cursor: "pointer",
									padding: "4px",
									borderRadius: "4px",
									color: isAutoHidden ? colors.warning : colors.text.secondary,
									display: "flex",
									alignItems: "center",
								}}
								title={isAutoHidden ? "Show sidebar (disable auto-hide)" : "Enable auto-hide mode"}
							>
								{isAutoHidden ? <IconEyeOff size={16} /> : <IconEye size={16} />}
							</button>
							<button
								onClick={handlePin}
								style={{
									background: "none",
									border: "none",
									cursor: "pointer",
									padding: "4px",
									borderRadius: "4px",
									color: isPinned ? colors.primary : colors.text.secondary,
									display: "flex",
									alignItems: "center",
								}}
								title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
							>
								{isPinned ? <IconPinFilled size={16} /> : <IconPin size={16} />}
							</button>
						</div>
					</>
				)}

				<button
					onClick={handleToggle}
					style={{
						background: "none",
						border: "none",
						cursor: "pointer",
						padding: "4px",
						borderRadius: "4px",
						color: colors.text.secondary,
						display: "flex",
						alignItems: "center",
						marginLeft: isEffectivelyVisible ? "0" : "auto",
						marginRight: isEffectivelyVisible ? "0" : "auto",
					}}
					title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
				>
					<CollapseIcon size={16} />
				</button>
			</div>

			{/* Content */}
			<div style={contentStyle}>
				{isEffectivelyVisible ? children : (
					<div style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "8px",
						opacity: 0.5
					}}>
						<div>
							{side === "left" ? <IconSearch size={20} /> : <IconFile size={20} />}
						</div>
						{/* Autohide indicator */}
						{isAutoHidden && (
							<div style={{
								fontSize: "9px",
								color: colors.text.tertiary,
								textAlign: "center",
								textTransform: "uppercase",
								letterSpacing: "0.5px",
								marginTop: "4px"
							}}>
								Auto-hidden
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}