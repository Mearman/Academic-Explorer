/**
 * React Context-based state management utilities
 * Replaces Zustand with built-in React patterns
 */

import React, {
	createContext,
	useContext,
	useReducer,
	useMemo,
	type ReactNode,
	type Reducer,
	type Dispatch,
} from "react"

// Generic context store interface
export interface ContextStore<T, A> {
	state: T
	dispatch: Dispatch<A>
	actions: Record<string, (...args: unknown[]) => void>
}

// Utility for creating typed actions
export type ActionCreator<T, P extends readonly unknown[] = readonly unknown[]> = (
	...params: P
) => T

// Create a context-based store
export function createContextStore<
	T extends object,
	A extends { type: string } & Record<string, unknown>,
>(
	name: string,
	initialState: T,
	reducer: Reducer<T, A>,
	actionCreators: Record<string, ActionCreator<A>>
) {
	// Create context
	const StateContext = createContext<T | undefined>(undefined)
	const DispatchContext = createContext<Dispatch<A> | undefined>(undefined)

	// Provider component
	const Provider: React.FC<{
		children: ReactNode
		initialState?: T
	}> = ({ children, initialState: customInitialState }) => {
		const [state, dispatch] = useReducer(reducer, customInitialState || initialState)

		return (
			<StateContext.Provider value={state}>
				<DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
			</StateContext.Provider>
		)
	}

	// Hook for accessing state
	const useState = () => {
		const context = useContext(StateContext)
		if (context === undefined) {
			throw new Error(`useState must be used within ${name}Provider`)
		}
		return context
	}

	// Hook for accessing dispatch
	const useDispatch = () => {
		const context = useContext(DispatchContext)
		if (context === undefined) {
			throw new Error(`useDispatch must be used within ${name}Provider`)
		}
		return context
	}

	// Hook for accessing actions
	const useActions = () => {
		const dispatch = useDispatch()

		return useMemo(() => {
			const result: Record<string, (...args: readonly unknown[]) => void> = {}

			;(Object.entries(actionCreators) as [string, ActionCreator<A>][]).forEach(([key, creator]) => {
				result[key] = (...args: readonly unknown[]) => {
					const action = creator(...args)
					dispatch(action)
				}
			})

			return result
		}, [dispatch])
	}

	// Hook for accessing state and actions together
	const useStore = () => {
		const state = useState()
		const actions = useActions()

		return {
			...state,
			...actions,
		}
	}

	// Hook for state selector (optimized re-renders)
	const useSelector = <R,>(selector: (state: T) => R): R => {
		const state = useState()
		return useMemo(() => selector(state), [state, selector])
	}

	return {
		Provider,
		useState,
		useDispatch,
		useActions,
		useStore,
		useSelector,
	}
}

// Utility for creating async actions
export function createAsyncAction<T, A>(
	action: () => Promise<T>,
	dispatch: Dispatch<A>,
	pendingAction: () => A,
	successAction: (result: T) => A,
	errorAction: (error: Error) => A
) {
	return async () => {
		try {
			dispatch(pendingAction())
			const result = await action()
			dispatch(successAction(result))
			return result
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			dispatch(errorAction(err))
			throw err
		}
	}
}

// Utility for creating multiple contexts that can be composed
export function createCombinedContext<
	Stores extends Record<string, ReturnType<typeof createContextStore>>,
>(stores: Stores) {
	const storeEntries = Object.entries(stores)

	// Combined provider
	const CombinedProvider: React.FC<{
		children: ReactNode
	}> = ({ children }) => {
		return storeEntries.reduce(
			(acc, [name, store]) => <store.Provider key={name}>{acc}</store.Provider>,
			children
		)
	}

	// Hook for accessing multiple stores
	const useCombinedStores = () => {
		const result: Record<string, unknown> = {}

		storeEntries.forEach(([name, store]) => {
			result[name] = store.useStore()
		})

		return result as {
			[K in keyof Stores]: ReturnType<Stores[K]["useStore"]>
		}
	}

	return {
		CombinedProvider,
		useCombinedStores,
		...stores,
	}
}

// Utility for creating simple state with no actions
export function createSimpleContext<T>(name: string, initialState: T) {
	const context = createContext<T | undefined>(undefined)

	const Provider: React.FC<{
		children: ReactNode
		value?: T
	}> = ({ children, value }) => {
		const state = value !== undefined ? value : initialState
		return <context.Provider value={state}>{children}</context.Provider>
	}

	const useContextValue = () => {
		const value = useContext(context)
		if (value === undefined) {
			throw new Error(`use${name} must be used within ${name}Provider`)
		}
		return value
	}

	return {
		Provider,
		useContext: useContextValue,
	}
}

// ============================================================================
// ADDITIONAL UTILITIES
// ============================================================================

/**
 * Filter manager for managing complex filter states
 */
export interface FilterManager<T> {
	filters: Partial<Record<keyof T, unknown>>
	setFilter: <K extends keyof T>(params: { key: K; value: unknown }) => void
	clearFilter: <K extends keyof T>(key: K) => void
	clearAllFilters: () => void
	hasActiveFilters: () => boolean
	applyFilters: (items: T[]) => T[]
}

export function createFilterManager<T extends Record<string, unknown>>(
	initialFilters: Partial<Record<keyof T, unknown>> = {}
): FilterManager<T> {
	let currentFilters = { ...initialFilters }

	const manager = {
		get filters() {
			return { ...currentFilters }
		},

		setFilter: ({ key, value }: { key: keyof T; value: unknown }) => {
			if (value === undefined) {
				delete currentFilters[key]
			} else {
				currentFilters[key] = value
			}
		},

		clearFilter: (key: keyof T) => {
			delete currentFilters[key]
		},

		clearAllFilters: () => {
			currentFilters = {}
		},

		hasActiveFilters: () => Object.keys(currentFilters).length > 0,

		applyFilters: (items: T[]) => {
			if (!manager.hasActiveFilters()) return items

			return items.filter((item) => {
				return Object.entries(currentFilters).every(([key, filterValue]) => {
					const itemValue = item[key]
					if (filterValue === undefined) return true

					// Handle different filter types
					if (typeof filterValue === "function") {
						try {
							return Boolean(filterValue(itemValue))
						} catch {
							return false
						}
					}

					if (Array.isArray(filterValue)) {
						return filterValue.includes(itemValue)
					}

					if (typeof filterValue === "string" && typeof itemValue === "string") {
						return itemValue.toLowerCase().includes(filterValue.toLowerCase())
					}

					return itemValue === filterValue
				})
			})
		},
	}

	return manager
}

/**
 * Pagination utilities for computing paged items
 */
export interface PaginationState {
	page: number
	pageSize: number
	total: number
}

export interface PagedResult<T> {
	items: T[]
	pagination: PaginationState & {
		totalPages: number
		hasNextPage: boolean
		hasPrevPage: boolean
	}
}

export function computePagedItems<T>({
	items,
	page,
	pageSize,
}: {
	items: T[]
	page: number
	pageSize: number
}): PagedResult<T> {
	const total = items.length
	const totalPages = Math.ceil(total / pageSize)
	const startIndex = (page - 1) * pageSize
	const endIndex = startIndex + pageSize

	return {
		items: items.slice(startIndex, endIndex),
		pagination: {
			page,
			pageSize,
			total,
			totalPages,
			hasNextPage: page < totalPages,
			hasPrevPage: page > 1,
		},
	}
}
