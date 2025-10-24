import { useCallback, useState } from "react"
import { logger } from "../logger"

export interface AsyncOperationState<T = unknown> {
	data: T | null
	loading: boolean
	error: string | Error | null
	lastUpdated: Date | null
}

export interface UseAsyncOperationOptions<T> {
	initialData?: T | null
	onSuccess?: (data: T) => void
	onError?: (error: string | Error) => void
	retryCount?: number
	retryDelay?: number
}

export interface AsyncOperationResult<T = unknown> extends AsyncOperationState<T> {
	execute: (operation: () => Promise<T>) => Promise<T | null>
	reset: () => void
	retry: () => Promise<T | null>
	canRetry: boolean
	retryCount: number
}

/**
 * Standardized hook for handling async operations with loading/error states
 */
export function useAsyncOperation<T = unknown>(
	options: UseAsyncOperationOptions<T> = {}
): AsyncOperationResult<T> {
	const {
		initialData = null,
		onSuccess,
		onError,
		retryCount: maxRetries = 3,
		retryDelay = 1000,
	} = options

	const [state, setState] = useState<AsyncOperationState<T>>({
		data: initialData,
		loading: false,
		error: null,
		lastUpdated: null,
	})

	const [currentRetryCount, setCurrentRetryCount] = useState(0)

	const execute = useCallback(
		async (operation: () => Promise<T>): Promise<T | null> => {
			setState((prev) => ({ ...prev, loading: true, error: null }))

			try {
				const result = await operation()

				setState({
					data: result,
					loading: false,
					error: null,
					lastUpdated: new Date(),
				})

				setCurrentRetryCount(0)
				onSuccess?.(result)

				return result
			} catch (err) {
				const error = err instanceof Error ? err : String(err)

				setState((prev) => ({
					...prev,
					loading: false,
					error,
				}))

				onError?.(error)

				logger.error("useAsyncOperation", "Operation failed", {
					error: err,
					retryCount: currentRetryCount,
				})

				return null
			}
		},
		[onSuccess, onError, currentRetryCount]
	)

	const retry = useCallback(async (): Promise<T | null> => {
		if (currentRetryCount >= maxRetries) {
			return null
		}

		setCurrentRetryCount((prev) => prev + 1)

		// Add delay before retry
		if (retryDelay > 0) {
			await new Promise((resolve) => setTimeout(resolve, retryDelay))
		}

		return execute(async () => {
			throw new Error("Retry operation requires original operation")
		})
	}, [currentRetryCount, maxRetries, retryDelay, execute])

	const reset = useCallback(() => {
		setState({
			data: initialData,
			loading: false,
			error: null,
			lastUpdated: null,
		})
		setCurrentRetryCount(0)
	}, [initialData])

	return {
		...state,
		execute,
		reset,
		retry,
		canRetry: currentRetryCount < maxRetries && !!state.error,
		retryCount: currentRetryCount,
	}
}
