import { useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react"
import { ScrollArea, TextInput, Group, Chip, Stack, Text, Box, Center, Loader } from "@mantine/core"
import { IconSearch, IconX } from "@tabler/icons-react"

export type FilterChip = {
	label: string
	value: string
	color?: string
}

export type EntityCollectionListProps<T = Record<string, unknown>> = {
	items: T[]
	renderItem: (item: T, index: number) => ReactNode
	searchPlaceholder?: string
	searchKeys?: Array<keyof T>
	filters?: FilterChip[]
	activeFilters?: string[]
	onFiltersChange?: (filters: string[]) => void
	emptyState?: {
		title: string
		description?: string
		icon?: ReactNode
	}
	loading?: boolean
	height?: number | string
	className?: string
	"data-testid"?: string
}

// Simple debounce hook
function useDebounce<T>({ value, delay }: { value: T; delay: number }): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value)

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value)
		}, delay)

		return () => {
			clearTimeout(handler)
		}
	}, [value, delay])

	return debouncedValue
}

/**
 * A collection list component with search, filtering, and empty states.
 * Handles ScrollArea, search functionality, filter chips, and customizable empty states.
 *
 * @example
 * ```tsx
 * <EntityCollectionList
 *   items={authors}
 *   renderItem={(author) => <AuthorCard {...author} />}
 *   searchKeys={['display_name', 'orcid']}
 *   filters={[
 *     { label: 'Verified', value: 'verified', color: 'green' },
 *     { label: 'Unverified', value: 'unverified', color: 'red' }
 *   ]}
 *   activeFilters={['verified']}
 *   onFiltersChange={setActiveFilters}
 *   emptyState={{
 *     title: "No authors found",
 *     description: "Try adjusting your search or filters"
 *   }}
 * />
 * ```
 */
export function EntityCollectionList<T = Record<string, unknown>>({
	items,
	renderItem,
	searchPlaceholder = "Search...",
	searchKeys = [],
	filters = [],
	activeFilters = [],
	onFiltersChange,
	emptyState,
	loading = false,
	height = 400,
	className,
	...restProps
}: EntityCollectionListProps<T>) {
	const [searchQuery, setSearchQuery] = useState("")
	const debouncedSearchQuery = useDebounce({ value: searchQuery, delay: 300 })

	// Filter items based on search and active filters
	const filteredItems = useMemo(() => {
		let filtered = items

		// Apply search filter
		if (debouncedSearchQuery && searchKeys.length > 0) {
			const query = debouncedSearchQuery.toLowerCase()
			filtered = filtered.filter((item) =>
				searchKeys.some((key) => {
					const value = item[key]
					return value && String(value).toLowerCase().includes(query)
				})
			)
		}

		// Apply chip filters (custom logic would be implemented here based on item properties)
		// This is a placeholder - actual filter logic would depend on how filters map to item properties
		if (activeFilters.length > 0) {
			// Example: assume items have a 'status' property that matches filter values
			filtered = filtered.filter((item) =>
				activeFilters.some((filter) => {
					const { status } = item as Record<string, unknown>
					return status === filter
				})
			)
		}

		return filtered
	}, [items, debouncedSearchQuery, searchKeys, activeFilters])

	const handleFilterToggle = (filterValue: string) => {
		if (!onFiltersChange) {
			return
		}

		const newFilters = activeFilters.includes(filterValue)
			? activeFilters.filter((f) => f !== filterValue)
			: [...activeFilters, filterValue]

		onFiltersChange(newFilters)
	}

	const clearSearch = () => {
		setSearchQuery("")
	}

	const renderEmptyState = () => {
		if (!emptyState) {
			return (
				<Center style={{ height: 200 }}>
					<Stack align="center" gap="xs">
						<Text size="sm" c="dimmed">
							No items to display
						</Text>
					</Stack>
				</Center>
			)
		}

		return (
			<Center style={{ height: 200 }}>
				<Stack align="center" gap="xs">
					{emptyState.icon}
					<Text size="sm" fw={500}>
						{emptyState.title}
					</Text>
					{emptyState.description && (
						<Text size="xs" c="dimmed">
							{emptyState.description}
						</Text>
					)}
				</Stack>
			</Center>
		)
	}

	return (
		<Stack gap="md" className={className} {...restProps}>
			{/* Search and Filters */}
			<Stack gap="sm">
				{/* Search Input */}
				<TextInput
					placeholder={searchPlaceholder}
					value={searchQuery}
					onChange={(e) => {
						setSearchQuery(e.currentTarget.value)
					}}
					leftSection={<IconSearch size={16} />}
					rightSection={
						searchQuery ? <IconX size={16} style={{ cursor: "pointer" }} onClick={clearSearch} /> : null
					}
					size="sm"
				/>

				{/* Filter Chips */}
				{filters.length > 0 && (
					<Group gap="xs">
						{filters.map((filter) => (
							<Chip
								key={filter.value}
								checked={activeFilters.includes(filter.value)}
								onClick={() => {
									handleFilterToggle(filter.value)
								}}
								color={filter.color}
								size="sm"
								variant={activeFilters.includes(filter.value) ? "filled" : "outline"}
							>
								{filter.label}
							</Chip>
						))}
					</Group>
				)}
			</Stack>

			{/* Content Area */}
			<Box style={{ position: "relative" }}>
				{loading ? (
					<Center style={{ height }}>
						<Loader size="md" />
					</Center>
				) : (
					<ScrollArea style={{ height }}>
						{filteredItems.length > 0 ? (
							<Stack gap="sm">
								{filteredItems.map((item, index) => (
									<Box key={index}>{renderItem(item, index)}</Box>
								))}
							</Stack>
						) : (
							renderEmptyState()
						)}
					</ScrollArea>
				)}
			</Box>
		</Stack>
	)
}