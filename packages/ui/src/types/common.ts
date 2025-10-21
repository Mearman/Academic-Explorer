import { type ReactNode } from "react"

/**
 * Base props that all components should support
 */
export type BaseComponentProps = {
	className?: string
	children?: ReactNode
	"data-testid"?: string
}

/**
 * Props for components that support forwarded refs
 */
export type ForwardedRefProps<T = HTMLElement> = {
	ref?: React.Ref<T>
} & BaseComponentProps

/**
 * Common size variants used across components
 */
export type Size = "xs" | "sm" | "md" | "lg" | "xl"

/**
 * Common color variants
 */
export type Color = "blue" | "green" | "red" | "orange" | "yellow" | "purple" | "pink" | "gray"

/**
 * Common variant types
 */
export type Variant = "filled" | "light" | "outline" | "transparent" | "subtle"

/**
 * Loading state interface
 */
export type LoadingState = {
	isLoading: boolean
	loadingText?: string
}

/**
 * Error state interface
 */
export type ErrorState = {
	hasError: boolean
	error?: Error | string
	onRetry?: () => void
}
