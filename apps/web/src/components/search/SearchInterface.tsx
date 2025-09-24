import { useState, useCallback } from "react";
import { Group, TextInput, Button, Stack, Paper, Title } from "@mantine/core";
import { IconSearch, IconFilter } from "@tabler/icons-react";
import { DateRangeFilter } from "./DateRangeFilter";
import { debouncedSearch, normalizeSearchQuery, isValidSearchQuery } from "@academic-explorer/utils";

interface SearchFilters {
  query: string;
  startDate: Date | null;
  endDate: Date | null;
}

interface SearchInterfaceProps {
  onSearch: (filters: SearchFilters) => void;
  isLoading?: boolean;
  placeholder?: string;
  showDateFilter?: boolean;
}

export function SearchInterface({
	onSearch,
	isLoading = false,
	placeholder = "Search academic works, authors, institutions...",
	showDateFilter = true,
}: SearchInterfaceProps) {
	const [query, setQuery] = useState("");
	const [startDate, setStartDate] = useState<Date | null>(null);
	const [endDate, setEndDate] = useState<Date | null>(null);
	const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

	const handleSearch = useCallback(() => {
		const filters: SearchFilters = {
			query: isValidSearchQuery(query) ? normalizeSearchQuery(query) : "",
			startDate,
			endDate,
		};

		onSearch(filters);
	}, [query, startDate, endDate, onSearch]);

	const handleQueryChange = useCallback((value: string) => {
		setQuery(value);

		// Only trigger debounced search if we have a valid query
		if (isValidSearchQuery(value)) {
			debouncedSearch(() => {
				const filters: SearchFilters = {
					query: normalizeSearchQuery(value),
					startDate,
					endDate,
				};
				onSearch(filters);
			}, value);
		}
	}, [startDate, endDate, onSearch]);

	const handleClearFilters = () => {
		setQuery("");
		setStartDate(null);
		setEndDate(null);
		onSearch({
			query: "",
			startDate: null,
			endDate: null,
		});
	};

	return (
		<Paper p="md" withBorder>
			<Stack gap="md">
				<Group>
					<Title order={3} flex={1}>
            Search Academic Literature
					</Title>

					{showDateFilter && (
						<Button
							variant="subtle"
							leftSection={<IconFilter size={16} />}
							onClick={() => { setIsAdvancedOpen(!isAdvancedOpen); }}
							size="sm"
						>
							{isAdvancedOpen ? "Hide" : "Show"} Filters
						</Button>
					)}
				</Group>

				<Group align="flex-end">
					<TextInput
						placeholder={placeholder}
						leftSection={<IconSearch size={16} />}
						value={query}
						onChange={(e) => { handleQueryChange(e.target.value); }}
						disabled={isLoading}
						flex={1}
						size="md"
						aria-label="Search query input"
					/>

					<Button
						onClick={handleSearch}
						loading={isLoading}
						leftSection={<IconSearch size={16} />}
					>
            Search
					</Button>

					{(query || startDate || endDate) && (
						<Button
							variant="subtle"
							onClick={handleClearFilters}
							disabled={isLoading}
						>
              Clear
						</Button>
					)}
				</Group>

				{showDateFilter && isAdvancedOpen && (
					<Group>
						<DateRangeFilter
							startDate={startDate}
							endDate={endDate}
							onStartDateChange={setStartDate}
							onEndDateChange={setEndDate}
							disabled={isLoading}
						/>
					</Group>
				)}
			</Stack>
		</Paper>
	);
}