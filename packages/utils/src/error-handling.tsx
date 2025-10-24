import React from "react"
import { logger, logError } from "./logger"

export interface ErrorContext {
	component?: string
	operation?: string
	category?: string
	additionalData?: Record<string, unknown>
}

export interface ErrorHandlerOptions {
	context: ErrorContext
	fallbackValue?: unknown
	rethrow?: boolean
}

/**
 * Standardized error handling utility to eliminate repetitive try-catch patterns
 * throughout the application. Provides consistent logging and error context.
 */
export class ErrorHandler {
	/**
	 * Wraps an async operation with standardized error handling
	 */
	static async withErrorHandling<T>(
		operation: () => Promise<T>,
		options: ErrorHandlerOptions
	): Promise<T> {
		const { context, fallbackValue, rethrow = false } = options

		try {
			return await operation()
		} catch (error) {
			this.logError(error, context)

			if (rethrow) {
				throw error
			}

			return fallbackValue
		}
	}

	/**
	 * Wraps a sync operation with standardized error handling
	 */
	static withSyncErrorHandling<T>(operation: () => T, options: ErrorHandlerOptions): T {
		const { context, fallbackValue, rethrow = false } = options

		try {
			return operation()
		} catch (error) {
			this.logError(error, context)

			if (rethrow) {
				throw error
			}

			return fallbackValue
		}
	}

	/**
	 * Standardized error logging with context
	 */
	static logError(error: unknown, context: ErrorContext): void {
		const { component, operation, category = "general" } = context

		if (component && operation) {
			logError(logger, `Failed to ${operation}`, error, component, category)
		} else if (operation) {
			logError(logger, `Failed to ${operation}`, error, "UnknownComponent", category)
		} else {
			logError(logger, "Operation failed", error, component || "UnknownComponent", category)
		}
	}

	/**
	 * Create a state setter with error handling
	 */
	static createStateSetter<T>(
		setState: (value: T | ((prev: T) => T)) => void,
		errorValue: T,
		context: ErrorContext
	): (value: T) => void {
		return (value: T) => {
			try {
				setState(value)
			} catch (error) {
				this.logError(error, context)
				setState(errorValue)
			}
		}
	}

	/**
	 * Handle navigation errors consistently
	 */
	static handleNavigationError(
		error: unknown,
		navigationContext: { from: string; to: string; fallback?: () => void }
	): void {
		const { from, to, fallback } = navigationContext

		this.logError(error, {
			component: "Navigation",
			operation: `navigate from ${from} to ${to}`,
			category: "routing",
			additionalData: { from, to },
		})

		fallback?.()
	}

	/**
	 * Handle API errors consistently
	 */
	static handleApiError(
		error: unknown,
		apiContext: { endpoint: string; method?: string; params?: Record<string, unknown> }
	): void {
		const { endpoint, method = "GET", params } = apiContext

		this.logError(error, {
			component: "APIClient",
			operation: `${method} ${endpoint}`,
			category: "api",
			additionalData: { endpoint, method, params },
		})
	}

	/**
	 * Handle React Query errors consistently
	 */
	static handleQueryError(
		error: unknown,
		queryContext: { queryKey: string[]; variables?: Record<string, unknown> }
	): void {
		const { queryKey, variables } = queryContext

		this.logError(error, {
			component: "ReactQuery",
			operation: `query: ${queryKey.join(".")}`,
			category: "data-fetching",
			additionalData: { queryKey, variables },
		})
	}
}

/**
 * Convenience function for creating error handlers with predefined context
 */
export function createErrorHandler(context: ErrorContext) {
	return {
		withErrorHandling: <T,>(operation: () => Promise<T>, options?: Partial<ErrorHandlerOptions>) =>
			ErrorHandler.withErrorHandling(operation, { context: { ...context, ...options?.context } }),

		withSyncErrorHandling: <T,>(operation: () => T, options?: Partial<ErrorHandlerOptions>) =>
			ErrorHandler.withSyncErrorHandling(operation, { context: { ...context, ...options?.context } }),

		logError: (error: unknown, additionalContext?: Partial<ErrorContext>) =>
			ErrorHandler.logError(error, { ...context, ...additionalContext }),
	}
}

/**
 * Higher-order component wrapper for error boundaries
 */
export function withErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
	errorContext: ErrorContext
): React.ComponentType<P> {
	return function WithErrorBoundary(props: P) {
		try {
			return <Component {...props} />
		} catch (error) {
			ErrorHandler.logError(error, errorContext)

			// You could render a fallback UI here
			throw error
		}
	}
}
