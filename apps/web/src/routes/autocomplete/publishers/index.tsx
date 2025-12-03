import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AutocompletePage } from "@/components/AutocompletePage";
import { useEntityAutocomplete } from "@/hooks/use-entity-autocomplete";

const searchSchema = z.object({
  filter: z.string().optional().catch(),
  search: z.string().optional().catch(),
  q: z.string().optional().catch(),
});

const AutocompletePublishersRoute = () => {
  const urlSearch = Route.useSearch();

  const { query, handleSearch, results, isLoading, error, filter } = useEntityAutocomplete({
    entityType: "publishers",
    urlSearch,
    routePath: "/autocomplete/publishers",
  });

  return (
    <AutocompletePage
      entityType="publishers"
      query={query}
      onSearch={handleSearch}
      results={results}
      isLoading={isLoading}
      error={error}
      filter={filter}
      placeholder="Search for publishers..."
      description="Search for publishers with real-time suggestions from the OpenAlex database"
    />
  );
};

export const Route = createFileRoute("/autocomplete/publishers/")({
  component: AutocompletePublishersRoute,
  validateSearch: searchSchema,
});
