import { useCallback, useState } from "react"
import { normalizeSearchQuery, isValidSearchQuery } from "../data"

export interface SearchFilters {
	query: string
	startDate?: Date | null
	endDate?: Date | null
	[key: string]: unknown
}

export interface UseSearchStateOptions<T extends SearchFilters = SearchFilters> {
	initialFilters?: Partial<T>
	onSearch?: (filters: T) => void
	validateQuery?: (query: string) => boolean
	normalizeQuery?: (query: string) => string
}

export interface UseSearchStateResult<T extends SearchFilters = SearchFilters> {
	filters: T
	setFilters: (filters: Partial<T>) => void
	updateFilter: (key: keyof T, value: unknown) => void
	resetFilters: () => void
	hasActiveFilters: boolean
	canSearch: boolean
	triggerSearch: () => void
	clearSearch: () => void
}

/**
 * Standardized hook for managing search state and behavior
 */
export function useSearchState<T extends SearchFilters = SearchFilters>(
	options: UseSearchStateOptions<T> = {}
): UseSearchStateResult<T> {
	const {
		initialFilters = {},
		onSearch,
		validateQuery = isValidSearchQuery,
		normalizeQuery = normalizeSearchQuery,
	} = options

	// Create initial state with defaults
	const getInitialState = (): T => {
		const defaults = {
			query: "",
			startDate: null,
			endDate: null,
		} as T

		return { ...defaults, ...initialFilters } as T
	}

	const [filters, setFiltersState] = useState<T>(getInitialState)

	const setFilters = useCallback((newFilters: Partial<T>) => {
		setFiltersState((prev) => ({ ...prev, ...newFilters }))
	}, [])

	const updateFilter = useCallback((key: keyof T, value: unknown) => {
		setFiltersState((prev) => ({ ...prev, [key]: value }))
	}, [])

	const resetFilters = useCallback(() => {
		setFiltersState(getInitialState())
	}, [])

	const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
		if (key === "query") return Boolean(value && validateQuery(value))
		return Boolean(value)
	})

	const canSearch = Boolean(filters.query && validateQuery(filters.query))

	const triggerSearch = useCallback(() => {
		if (!canSearch) return

		const searchFilters: T = {
			...filters,
			query: validateQuery(filters.query) ? normalizeQuery(filters.query) : "",
		}

		onSearch?.(searchFilters)
	}, [filters, canSearch, onSearch, validateQuery, normalizeQuery])

	const clearSearch = useCallback(() => {
		setFiltersState((prev) => ({ ...prev, query: "" }))
	}, [])

	
	return {
		filters,
		setFilters,
		updateFilter,
		resetFilters,
		hasActiveFilters,
		canSearch,
		triggerSearch,
		clearSearch,
	}
}
