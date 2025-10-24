import { Alert, Anchor, Button, Group, Loader, Stack, Text } from "@mantine/core"
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react"
import React from "react"

export interface LoadingStateProps {
	message?: string
	size?: "xs" | "sm" | "md" | "lg"
	showSpinner?: boolean
}

export interface ErrorStateProps {
	error: string | Error | null
	onRetry?: () => void
	showDetails?: boolean
	retryLabel?: string
	size?: "xs" | "sm" | "md" | "lg"
}

export interface EmptyStateProps {
	message?: string
	action?: {
		label: string
		onClick: () => void
	}
	icon?: React.ReactNode
}

/**
 * Standardized loading state component
 */
export function LoadingState({
	message = "Loading...",
	size = "md",
	showSpinner = true,
}: LoadingStateProps) {
	const loaderSize = { xs: 16, sm: 20, md: 24, lg: 32 }[size]
	const textSize = { xs: "xs", sm: "sm", md: "md", lg: "lg" }[size]

	return (
		<Stack align="center" gap="md" p="xl">
			{showSpinner && <Loader size={loaderSize} />}
			<Text size={textSize} c="dimmed">
				{message}
			</Text>
		</Stack>
	)
}

/**
 * Standardized error state component with retry functionality
 */
export function ErrorState({
	error,
	onRetry,
	showDetails = false,
	retryLabel = "Retry",
	size = "md",
}: ErrorStateProps) {
	const iconSize = { xs: 16, sm: 20, md: 24, lg: 32 }[size]
	const textSize = { xs: "xs", sm: "sm", md: "md", lg: "lg" }[size]

	if (!error) return null

	const errorMessage = error instanceof Error ? error.message : error
	const errorStack = error instanceof Error ? error.stack : undefined

	return (
		<Alert icon={<IconAlertTriangle size={iconSize} />} title="Error" color="red" variant="light">
			<Stack gap="sm">
				<Text size={textSize}>{errorMessage}</Text>

				{showDetails && errorStack && (
					<Text
						size="xs"
						c="dimmed"
						style={{
							fontFamily: "monospace",
							whiteSpace: "pre-wrap",
							maxHeight: "200px",
							overflow: "auto",
						}}
					>
						{errorStack}
					</Text>
				)}

				<Group gap="sm">
					{onRetry && (
						<Button variant="outline" size="sm" leftSection={<IconRefresh size={14} />} onClick={onRetry}>
							{retryLabel}
						</Button>
					)}

					{showDetails && errorStack && (
						<Anchor
							size="sm"
							onClick={() => {
								// Copy error details to clipboard
								navigator.clipboard.writeText(`Error: ${errorMessage}\n\nStack:\n${errorStack}`)
							}}
						>
							Copy Details
						</Anchor>
					)}
				</Group>
			</Stack>
		</Alert>
	)
}

/**
 * Standardized empty state component
 */
export function EmptyState({ message = "No data available", action, icon }: EmptyStateProps) {
	return (
		<Stack align="center" gap="md" p="xl">
			{icon && <div style={{ opacity: 0.5 }}>{icon}</div>}
			<Text size="lg" c="dimmed" ta="center">
				{message}
			</Text>
			{action && (
				<Button variant="outline" onClick={action.onClick}>
					{action.label}
				</Button>
			)}
		</Stack>
	)
}

/**
 * Combined loading/error/empty state component for common patterns
 */
export interface DataStateProps<T> {
	loading: boolean
	error: string | Error | null
	data: T[] | null | undefined
	emptyMessage?: string
	loadingMessage?: string
	onRetry?: () => void
	showEmptyState?: boolean
	children: (data: NonNullable<T[]>) => React.ReactNode
}

export function DataState<T>({
	loading,
	error,
	data,
	emptyMessage = "No items to display",
	loadingMessage,
	onRetry,
	showEmptyState = true,
	children,
}: DataStateProps<T>) {
	if (loading) {
		return <LoadingState message={loadingMessage} />
	}

	if (error) {
		return <ErrorState error={error} onRetry={onRetry} />
	}

	if (!data || data.length === 0) {
		if (showEmptyState) {
			return <EmptyState message={emptyMessage} />
		}
		return null
	}

	return <>{children(data)}</>
}
