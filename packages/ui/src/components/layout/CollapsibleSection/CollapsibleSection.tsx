import React, { useState, forwardRef } from "react"
import { useMantineTheme, useMantineColorScheme } from "@mantine/core"
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react"

export type CollapsibleSectionProps = {
	title: string
	icon: React.ReactNode
	children: React.ReactNode
	defaultExpanded?: boolean
	storageKey?: string
	onToggle?: (expanded: boolean) => void
	className?: string
	"data-testid"?: string
}

/**
 * A collapsible section component with expandable content and optional state persistence.
 * Provides a clean header with icon and title, and smooth expansion animation.
 *
 * @example
 * ```tsx
 * <CollapsibleSection
 *   title="Settings"
 *   icon={<IconSettings size={16} />}
 *   defaultExpanded={true}
 *   storageKey="settings-section"
 * >
 *   <div>Settings content here</div>
 * </CollapsibleSection>
 * ```
 */
export const CollapsibleSection = forwardRef<HTMLDivElement, CollapsibleSectionProps>(
	(props, ref) => {
		const {
			title,
			icon,
			children,
			defaultExpanded = true,
			storageKey,
			onToggle,
			className,
			...restProps
		} = props
		// Initialize state from localStorage if storageKey is provided
		const [isExpanded, setIsExpanded] = useState(() => {
			if (storageKey && typeof window !== "undefined") {
				try {
					const stored = localStorage.getItem(`collapsible-${storageKey}`)
					return stored ? JSON.parse(stored) : defaultExpanded
				} catch {
					return defaultExpanded
				}
			}

			return defaultExpanded
		})

		const theme = useMantineTheme()
		const { colorScheme } = useMantineColorScheme()

		// Resolve the actual color scheme when colorScheme is 'auto'
		const _resolvedColorScheme =
			colorScheme === "auto"
				? (() => {
						try {
							return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
						} catch {
							return "light"
						}
					})()
				: colorScheme

		// Theme-aware colors
		const colors = {
			text: {
				primary: "var(--mantine-color-text)",
			},
			border: {
				primary: "var(--mantine-color-default-border)",
			},
			primary: theme.colors.blue[5] || "#228be6",
		}

		const toggleExpanded = () => {
			const newExpanded = !isExpanded
			setIsExpanded(newExpanded)

			// Persist to localStorage if storageKey is provided
			if (storageKey && typeof window !== "undefined") {
				try {
					localStorage.setItem(`collapsible-${storageKey}`, JSON.stringify(newExpanded))
				} catch {
					// Silently fail if localStorage is not available
				}
			}

			// Call external toggle handler
			onToggle?.(newExpanded)
		}

		return (
			<div ref={ref} className={className} style={{ width: "100%" }} {...restProps}>
				{/* Section Header */}
				<button
					onClick={toggleExpanded}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						width: "100%",
						padding: "8px 0",
						backgroundColor: "transparent",
						border: "none",
						borderBottom: `1px solid ${colors.border.primary}`,
						fontSize: "13px",
						fontWeight: 600,
						color: colors.text.primary,
						cursor: "pointer",
						transition: "color 0.2s ease",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.color = colors.primary
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.color = colors.text.primary
					}}
				>
					{/* Expand/collapse chevron */}
					<span style={{ display: "flex", alignItems: "center" }}>
						{isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
					</span>

					{/* Section icon */}
					<span style={{ display: "flex", alignItems: "center" }}>{icon}</span>

					{/* Section title */}
					<span>{title}</span>
				</button>

				{/* Section Content */}
				{isExpanded && (
					<div
						style={{
							paddingTop: "12px",
							paddingBottom: "20px",
							animation: "fadeIn 0.2s ease-in-out",
						}}
					>
						{children}
					</div>
				)}

				{/* CSS for fade-in animation */}
				<style>{`
					@keyframes fadeIn {
						from {
							opacity: 0;
							transform: translateY(-8px);
						}
						to {
							opacity: 1;
							transform: translateY(0);
						}
					}
				`}</style>
			</div>
		)
	}
)

CollapsibleSection.displayName = "CollapsibleSection"
