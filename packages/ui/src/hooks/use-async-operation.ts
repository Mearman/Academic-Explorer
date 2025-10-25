import { useState, useCallback } from "react"

export interface AsyncOperationState<T = unknown> {
  data: T | null
  loading: boolean
  error: Error | null
}

export interface AsyncOperationResult<T = unknown> extends AsyncOperationState<T> {
  execute: (operation: () => Promise<T>) => Promise<void>
  reset: () => void
}

export interface UseAsyncOperationOptions {
  retryCount?: number
  retryDelay?: number
  onError?: (error: Error) => void
  onSuccess?: (data: unknown) => void
}

export function useAsyncOperation<T = unknown>(
  options: UseAsyncOperationOptions = {}
): AsyncOperationResult<T> {
  const { retryCount = 0, retryDelay = 0, onError, onSuccess } = options

  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async (operation: () => Promise<T>) => {
      setState(prev => ({ ...prev, loading: true, error: null }))

      let lastError: Error | null = null

      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          const result = await operation()
          setState({ data: result, loading: false, error: null })
          onSuccess?.(result)
          return
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))

          if (attempt < retryCount && retryDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, retryDelay))
          }
        }
      }

      setState(prev => ({ ...prev, loading: false, error: lastError }))
      onError?.(lastError!)
    },
    [retryCount, retryDelay, onError, onSuccess]
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    execute,
    reset,
  }
}