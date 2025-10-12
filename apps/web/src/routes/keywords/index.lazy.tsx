import { createLazyFileRoute } from "@tanstack/react-router";
import { useSearch } from "@tanstack/react-router";
import { EntityList } from "@/components/EntityList";
import type { ColumnConfig } from "@/components/types";
import { createFilterBuilder } from "@academic-explorer/client";

const keywordsColumns: ColumnConfig[] = [
  { key: "display_name", header: "Name" },
  { key: "description", header: "Description" },
  { key: "works_count", header: "Works" },
  { key: "cited_by_count", header: "Citations" },
];

export const Route = createLazyFileRoute("/keywords/")({
  component: KeywordsListRoute,
});

function KeywordsListRoute() {
  const search = useSearch({ from: "/keywords/" }) as { filter?: string };
  const filterBuilder = createFilterBuilder();
  const urlFilters = search.filter
    ? filterBuilder.parseFilterString(search.filter)
    : undefined;

  return (
    <EntityList
      entityType="keywords"
      columns={keywordsColumns}
      title="Keywords"
      urlFilters={urlFilters}
    />
  );
}

export default KeywordsListRoute;
