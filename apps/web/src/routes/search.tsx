import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Title, Text, Stack, Alert, Container, Card, Badge, Anchor } from "@mantine/core"
import { IconInfoCircle } from "@tabler/icons-react"
import { SearchInterface } from "../components/search/SearchInterface"
import { BaseTable } from "../components/tables/BaseTable"
import { formatPublicationYear, formatLargeNumber } from "@academic-explorer/utils"
import { pageTitle, pageDescription } from "../styles/layout.css"
import type { ColumnDef } from "@tanstack/react-table"
import { logger } from "@academic-explorer/utils"
import { cachedOpenAlex, type Work, createWorksQuery, type WorksFilters } from "@academic-explorer/client"

interface SearchFilters {
  query: string;
  startDate: Date | null;
  endDate: Date | null;
}

// Real OpenAlex API search function
const searchWorks = async (filters: SearchFilters): Promise<Work[]> => {
	if (!filters.query.trim()) return [];

	try {
		logger.debug('search', 'Searching works with filters', { filters });

		const queryBuilder = createWorksQuery();

		// Add search query
		queryBuilder.addSearch('display_name.search' as keyof WorksFilters, filters.query);

		// Add date filters if provided
		if (filters.startDate) {
			const startYear = filters.startDate.getFullYear();
			queryBuilder.addFilter('publication_year', `>=${startYear}` as any);
		}

		if (filters.endDate) {
			const endYear = filters.endDate.getFullYear();
			queryBuilder.addFilter('publication_year', `<=${endYear}` as any);
		}

		const response = await cachedOpenAlex.client.works.searchWorks(filters.query, {
			filters: queryBuilder.build(),
			select: [
				'id',
				'display_name',
				'authorships',
				'publication_year',
				'cited_by_count',
				'primary_location',
				'open_access',
				'doi'
			],
			per_page: 20
		});

		logger.debug('search', 'Search completed', {
			resultsCount: response.results.length,
			total: response.meta.count
		});

		return response.results;
	} catch (error) {
		logger.error('search', 'Search failed', { error, filters });
		throw error;
	}
};

function SearchPage() {
	const [searchFilters, setSearchFilters] = useState<SearchFilters>({
		query: "",
		startDate: null,
		endDate: null,
	});

	const { data: searchResults, isLoading, error } = useQuery({
		queryKey: ["search", searchFilters],
		queryFn: () => searchWorks(searchFilters),
		enabled: Boolean(searchFilters.query.trim()),
		retry: 1,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	const columns: ColumnDef<Work>[] = [
		{
			accessorKey: "display_name",
			header: "Title",
			cell: ({ row }) => {
				const work = row.original;
				const authors = work.authorships?.slice(0, 3).map(a => a.author?.display_name).filter(Boolean) || [];
				const moreAuthors = (work.authorships?.length || 0) > 3;

				return (
					<div>
						<Text fw={500} size="sm" lineClamp={2}>
							{work.display_name}
						</Text>
						<Text size="xs" c="dimmed">
							{authors.length > 0 ? (
								<span>
									{authors.join(", ")}
									{moreAuthors && ` +${(work.authorships?.length || 0) - 3} more`}
								</span>
							) : (
								"No authors listed"
							)}
						</Text>
						{work.doi && (
							<Anchor href={`https://doi.org/${work.doi}`} target="_blank" size="xs" c="dimmed">
								DOI: {work.doi}
							</Anchor>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "primary_location",
			header: "Source",
			cell: ({ row }) => {
				const location = row.original.primary_location;
				return (
					<Text size="sm">
						{location?.source?.display_name || "Unknown"}
					</Text>
				);
			},
		},
		{
			accessorKey: "publication_year",
			header: "Year",
			cell: ({ row }) => (
				<Text size="sm">
					{row.original.publication_year ? formatPublicationYear(row.original.publication_year) : "N/A"}
				</Text>
			),
		},
		{
			accessorKey: "cited_by_count",
			header: "Citations",
			cell: ({ row }) => (
				<Text size="sm" fw={500}>
					{formatLargeNumber(row.original.cited_by_count || 0)}
				</Text>
			),
		},
		{
			accessorKey: "open_access",
			header: "Access",
			cell: ({ row }) => {
				const isOpen = row.original.open_access?.is_oa || false;

				return (
					<Badge
						size="sm"
						color={isOpen ? "green" : "gray"}
						variant={isOpen ? "light" : "outline"}
					>
						{isOpen ? "Open Access" : "Closed"}
					</Badge>
				);
			},
		},
	];

	const handleSearch = (filters: SearchFilters) => {
		setSearchFilters(filters);
	};

	const hasResults = searchResults && searchResults.length > 0;
	const hasQuery = Boolean(searchFilters.query.trim());

	return (
		<Container size="xl">
			<Stack gap="xl">
				<div>
					<Title order={1} className={pageTitle}>
            Academic Search
					</Title>
					<Text className={pageDescription}>
            Search the OpenAlex database of academic works with advanced filtering capabilities.
            Results are cached for improved performance.
					</Text>
				</div>

				<SearchInterface
					onSearch={handleSearch}
					isLoading={isLoading}
					placeholder="Try searching for 'machine learning', 'climate change', or 'artificial intelligence'"
					showDateFilter={true}
				/>

				{hasQuery && (
					<Card withBorder>
						{isLoading ? (
							<Text ta="center" py="xl">
                Searching OpenAlex database...
							</Text>
						) : error ? (
							<Alert
								icon={<IconInfoCircle />}
								title="Search Error"
								color="red"
								variant="light"
							>
								<Text size="sm">
									Failed to search OpenAlex: {String(error)}. Please try again.
								</Text>
							</Alert>
						) : hasResults ? (
							<Stack>
								<Text size="sm" c="dimmed">
                  Found {searchResults.length} results for &quot;{searchFilters.query}&quot;
									{searchFilters.startDate || searchFilters.endDate ? (
										<span>
											{" "}with date filters applied
										</span>
									) : null}
								</Text>

								<BaseTable
									data={searchResults}
									columns={columns}
									searchable={false} // Search is handled by the SearchInterface
									onRowClick={(work) => {
										logger.debug("ui", "Work clicked in search results", { workId: work.id, workTitle: work.display_name }, "SearchPage");
										// Navigate to work detail page if needed
									}}
								/>
							</Stack>
						) : (
							<Alert
								icon={<IconInfoCircle />}
								title="No results found"
								color="blue"
								variant="light"
							>
								<Text size="sm">
                  No academic works found for &quot;{searchFilters.query}&quot;. Try different search terms or adjust your filters.
								</Text>
							</Alert>
						)}
					</Card>
				)}

				{!hasQuery && (
					<Card withBorder>
						<Stack align="center" py="xl">
							<Text size="lg" fw={500}>
                Enter a search term to explore academic literature
							</Text>
							<Text size="sm" c="dimmed" ta="center">
                Search millions of academic works from OpenAlex with real-time results,
                date filtering, and advanced search capabilities.
							</Text>
						</Stack>
					</Card>
				)}
			</Stack>
		</Container>
	);
}

export const Route = createFileRoute("/search")({
	component: SearchPage,
})