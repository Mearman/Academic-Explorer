import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AutocompletePage } from "@/components/AutocompletePage";
import { useEntityAutocomplete } from "@/hooks/use-entity-autocomplete";

const searchSchema = z.object({
  filter: z.string().optional().catch(),
  search: z.string().optional().catch(),
  q: z.string().optional().catch(),
});

const AutocompleteWorksRoute = () => {
  const urlSearch = Route.useSearch();

  const { query, handleSearch, results, isLoading, error, filter } = useEntityAutocomplete({
    entityType: "works",
    urlSearch,
    routePath: "/autocomplete/works",
  });

  return (
    <AutocompletePage
      entityType="works"
      query={query}
      onSearch={handleSearch}
      results={results}
      isLoading={isLoading}
      error={error}
      filter={filter}
      placeholder="Search for works, papers, articles..."
      description="Search for academic works with real-time suggestions from the OpenAlex database"
    />
  );
};

export const Route = createFileRoute("/autocomplete/works/")({
  component: AutocompleteWorksRoute,
  validateSearch: searchSchema,
});
