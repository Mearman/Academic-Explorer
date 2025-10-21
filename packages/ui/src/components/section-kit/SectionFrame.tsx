import React from "react"
import { Paper, Title, Text, Box, Group, Button, Collapse } from "@mantine/core"
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react"

export type SectionFrameProps = {
	children: React.ReactNode
	title?: string
	subtitle?: string
	icon?: React.ReactNode
	actions?: React.ReactNode
	defaultExpanded?: boolean
	storageKey?: string
	onToggle?: (expanded: boolean) => void
	withShadow?: boolean
	withBorder?: boolean
	padding?: "xs" | "sm" | "md" | "lg" | "xl"
	className?: string
	"data-testid"?: string
}

/**
 * A framed section component that provides a structured container for content
 * with optional title, subtitle, icon, actions, and collapsible functionality.
 *
 * @example
 * ```tsx
 * <SectionFrame
 *   title="Recent Works"
 *   subtitle="Latest publications"
 *   icon={<IconBook size={16} />}
 *   actions={<Button>Add Work</Button>}
 *   defaultExpanded={true}
 * >
 *   <EntityCollectionList entities={works} />
 * </SectionFrame>
 * ```
 */
export const SectionFrame: React.FC<SectionFrameProps> = ({
	children,
	title,
	subtitle,
	icon,
	actions,
	defaultExpanded = true,
	storageKey,
	onToggle,
	withShadow = false,
	withBorder = true,
	padding = "md",
	className,
	...restProps
}) => {
	const [isExpanded, setIsExpanded] = React.useState(() => {
		if (storageKey && typeof window !== "undefined") {
			try {
				const stored = localStorage.getItem(`section-frame-${storageKey}`)
				return stored ? JSON.parse(stored) : defaultExpanded
			} catch {
				return defaultExpanded
			}
		}

		return defaultExpanded
	})

	const toggleExpanded = () => {
		const newExpanded = !isExpanded
		setIsExpanded(newExpanded)

		// Persist to localStorage if storageKey is provided
		if (storageKey && typeof window !== "undefined") {
			try {
				localStorage.setItem(`section-frame-${storageKey}`, JSON.stringify(newExpanded))
			} catch {
				// Silently fail if localStorage is not available
			}
		}

		// Call external toggle handler
		onToggle?.(newExpanded)
	}

	const hasHeader = title || subtitle || icon || actions

	return (
		<Paper
			withBorder={withBorder}
			shadow={withShadow ? "sm" : undefined}
			className={className}
			{...restProps}
		>
			{hasHeader && (
				<Box p={padding}>
					<Group justify="space-between" wrap="nowrap">
						<Button
							variant="subtle"
							onClick={toggleExpanded}
							leftSection={
								<span style={{ display: "flex", alignItems: "center" }}>
									{isExpanded ? <IconChevronDown size={14} />
: <IconChevronRight size={14} />}
								</span>
							}
							styles={{
								inner: { justifyContent: "flex-start" },
								label: { flex: 1 },
							}}
							fullWidth
						>
							<Group gap="xs" wrap="nowrap" style={{ width: "100%" }}>
								{icon && <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>}
								<Box style={{ flex: 1, minWidth: 0 }}>
									{title && (
										<Title order={4} mb={subtitle ? 4 : 0}>
											{title}
										</Title>
									)}
									{subtitle && (
										<Text size="sm" c="dimmed">
											{subtitle}
										</Text>
									)}
								</Box>
							</Group>
						</Button>

						{actions && <Box style={{ flexShrink: 0 }}>{actions}</Box>}
					</Group>
				</Box>
			)}

			<Collapse in={isExpanded}>
				<Box p={hasHeader ? 0 : padding} pt={hasHeader ? padding : 0}>
					{children}
				</Box>
			</Collapse>
		</Paper>
	)
}
