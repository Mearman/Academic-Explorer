import React from "react"
import {
	Stack,
	Group,
	Text,
	Title,
	Badge,
	Button,
	Card,
	Divider,
	ActionIcon,
	Tooltip,
} from "@mantine/core"
import {
	IconRefresh,
	IconSettings as _IconSettings,
	IconInfoCircle as _IconInfoCircle,
	IconChevronDown,
	IconChevronUp,
} from "@tabler/icons-react"

export interface BaseSectionProps {
	/** Section title */
	title: string
	/** Section description */
	description?: string
	/** Whether section is collapsible */
	collapsible?: boolean
	/** Initial collapsed state */
	initiallyCollapsed?: boolean
	/** Whether section is loading */
	loading?: boolean
	/** Error message */
	error?: string | null
	/** Badge to show in header */
	badge?: string | number
	/** Badge color */
	badgeColor?: string
	/** Actions to show in header */
	actions?: React.ReactNode
	/** Section content */
	children: React.ReactNode
	/** Footer content */
	footer?: React.ReactNode
	/** Custom icon for header */
	icon?: React.ReactNode
	/** Section variant */
	variant?: "default" | "compact" | "card"
	/** Additional CSS classes */
	className?: string
	/** Padding size */
	padding?: "xs" | "sm" | "md" | "lg" | "xl"
	/** On refresh callback */
	onRefresh?: () => void
	/** Whether refresh is loading */
	refreshLoading?: boolean
}

/**
 * Base section component that provides consistent layout and behavior
 * across all sidebar sections in the application
 */
export function BaseSection({
	title,
	description,
	collapsible = false,
	initiallyCollapsed = false,
	loading = false,
	error = null,
	badge,
	badgeColor = "blue",
	actions,
	children,
	footer,
	icon,
	variant = "default",
	className = "",
	padding = "md",
	onRefresh,
	refreshLoading = false,
}: BaseSectionProps) {
	const [collapsed, setCollapsed] = React.useState(initiallyCollapsed)

	const toggleCollapsed = () => {
		setCollapsed(!collapsed)
	}

	const renderHeader = () => (
		<Group justify="space-between" wrap="nowrap" gap="xs">
			<Group gap="sm" wrap="nowrap">
				{icon && <div style={{ opacity: 0.7 }}>{icon}</div>}
				<div>
					<Group gap="xs" wrap="nowrap">
						<Title order={6} size="sm">
							{title}
						</Title>
						{badge !== undefined && (
							<Badge size="xs" color={badgeColor} variant="light">
								{typeof badge === "number" ? badge.toLocaleString() : badge}
							</Badge>
						)}
					</Group>
					{description && (
						<Text size="xs" c="dimmed" lineClamp={1}>
							{description}
						</Text>
					)}
				</div>
			</Group>

			<Group gap="xs" wrap="nowrap">
				{actions}
				{onRefresh && (
					<Tooltip label="Refresh">
						<ActionIcon
							size="sm"
							variant="subtle"
							onClick={onRefresh}
							loading={refreshLoading}
							disabled={loading}
						>
							<IconRefresh size={14} />
						</ActionIcon>
					</Tooltip>
				)}
				{collapsible && (
					<ActionIcon size="sm" variant="subtle" onClick={toggleCollapsed}>
						{collapsed ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
					</ActionIcon>
				)}
			</Group>
		</Group>
	)

	const renderContent = () => {
		if (error) {
			return (
				<Card withBorder p="sm" mt="sm">
					<Text size="sm" c="red" ta="center">
						{error}
					</Text>
				</Card>
			)
		}

		if (loading) {
			return (
				<Card withBorder p="sm" mt="sm">
					<Text size="sm" c="dimmed" ta="center">
						Loading...
					</Text>
				</Card>
			)
		}

		if (collapsed) {
			return null
		}

		return <>{children}</>
	}

	const renderFooter = () => {
		if (!footer || collapsed) return null

		return (
			<>
				<Divider />
				{footer}
			</>
		)
	}

	const content = (
		<Stack gap="sm" p={padding} className={className}>
			{renderHeader()}
			{renderContent()}
			{renderFooter()}
		</Stack>
	)

	// Apply variant-specific styling
	switch (variant) {
		case "card":
			return <Card withBorder>{content}</Card>

		case "compact":
			return (
				<Stack gap="xs" className={className}>
					{content}
				</Stack>
			)

		default:
			return content
	}
}

/**
 * Section with loading state wrapper
 */
export interface SectionWithLoadingProps extends Omit<BaseSectionProps, "loading" | "children"> {
	children: React.ReactNode
	isLoading?: boolean
}

export function SectionWithLoading({
	isLoading = false,
	children,
	...props
}: SectionWithLoadingProps) {
	return (
		<BaseSection {...props} loading={isLoading}>
			{children}
		</BaseSection>
	)
}

/**
 * Section with error handling wrapper
 */
export interface SectionWithErrorProps extends Omit<BaseSectionProps, "error" | "children"> {
	children: React.ReactNode
	error?: string | null
	onRetry?: () => void
}

export function SectionWithError({
	error = null,
	onRetry,
	children,
	...props
}: SectionWithErrorProps) {
	const actions = onRetry ? (
		<Button size="xs" variant="outline" onClick={onRetry}>
			Retry
		</Button>
	) : undefined

	return (
		<BaseSection {...props} error={error} actions={actions}>
			{children}
		</BaseSection>
	)
}
