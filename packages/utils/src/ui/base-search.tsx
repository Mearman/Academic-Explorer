import { Group, TextInput, Button, Stack, Paper } from "@mantine/core"
import { IconSearch, IconFilter, IconX } from "@tabler/icons-react"
import React from "react"
import type { SearchFilters } from "../hooks/use-search-state"

export interface BaseSearchProps<T extends SearchFilters = SearchFilters> {
	/** Current search filters */
	filters: T
	/** Update a specific filter value */
	onFilterChange: (key: keyof T, value: unknown) => void
	/** Trigger search manually */
	onSearch: () => void
	/** Clear all filters */
	onClear: () => void
	/** Whether search is currently loading */
	isLoading?: boolean
	/** Whether search can be triggered */
	canSearch?: boolean
	/** Placeholder for main search input */
	placeholder?: string
	/** Whether to show clear button */
	showClear?: boolean
	/** Whether to show search button */
	showSearchButton?: boolean
	/** Additional filter components */
	additionalFilters?: React.ReactNode
	/** Custom search button content */
	searchButtonContent?: React.ReactNode
	/** Size for components */
	size?: "xs" | "sm" | "md" | "lg"
	/** Whether to show filter toggle */
	showFiltersToggle?: boolean
	/** Callback when filters toggle is clicked */
	onFiltersToggle?: () => void
	/** Whether filters are currently shown */
	filtersVisible?: boolean
}

/**
 * Base search component that provides common search functionality
 */
export function BaseSearch<T extends SearchFilters = SearchFilters>({
	filters,
	onFilterChange,
	onSearch,
	onClear,
	isLoading = false,
	canSearch = true,
	placeholder = "Search...",
	showClear = true,
	showSearchButton = true,
	additionalFilters,
	searchButtonContent,
	size = "md",
	showFiltersToggle = false,
	onFiltersToggle,
	filtersVisible = false,
}: BaseSearchProps<T>) {
	const handleQueryChange = (value: string) => {
		onFilterChange("query" as keyof T, value)
	}

	const handleKeyPress = (event: React.KeyboardEvent) => {
		if (event.key === "Enter" && canSearch) {
			onSearch()
		}
	}

	return (
		<Stack gap="md">
			{/* Main search input */}
			<Group>
				<TextInput
					flex={1}
					size={size}
					placeholder={placeholder}
					value={filters.query || ""}
					onChange={(event) => handleQueryChange(event.currentTarget.value)}
					onKeyPress={handleKeyPress}
					disabled={isLoading}
					rightSection={
						<Group gap={4}>
							{showClear && filters.query && (
								<Button variant="subtle" size="xs" onClick={onClear} disabled={isLoading}>
									<IconX size={14} />
								</Button>
							)}
						</Group>
					}
				/>

				{showFiltersToggle && (
					<Button
						variant={filtersVisible ? "filled" : "outline"}
						size={size}
						onClick={onFiltersToggle}
						leftSection={<IconFilter size={16} />}
					>
						Filters
					</Button>
				)}

				{showSearchButton && (
					<Button
						size={size}
						onClick={onSearch}
						loading={isLoading}
						disabled={!canSearch || isLoading}
						leftSection={!isLoading && <IconSearch size={16} />}
					>
						{searchButtonContent || "Search"}
					</Button>
				)}
			</Group>

			{/* Additional filters */}
			{additionalFilters && (
				<Paper p="md" withBorder>
					<Stack gap="md">{additionalFilters}</Stack>
				</Paper>
			)}
		</Stack>
	)
}
