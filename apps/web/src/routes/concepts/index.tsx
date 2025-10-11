import { createFileRoute, useSearch } from "@tanstack/react-router";
import { EntityList, type ColumnConfig } from "@/components/EntityList";

import { createFilterBuilder } from "@academic-explorer/client";

export const Route = createFileRoute("/concepts/")({
  component: ConceptsListRoute,
  validateSearch: (search: Record<string, unknown>) => ({
    filter: typeof search.filter === "string" ? search.filter : undefined,
  }),
});

const conceptsColumns: ColumnConfig[] = [
  { key: "display_name", header: "Name" },
  { key: "description", header: "Description" },
  { key: "works_count", header: "Works" },
  { key: "cited_by_count", header: "Citations" },
  { key: "level", header: "Level" },
];

function ConceptsListRoute() {
  const search = useSearch({ from: "/concepts/" }) as { filter?: string };
  const filterBuilder = createFilterBuilder();
  const urlFilters = search.filter
    ? filterBuilder.parseFilterString(search.filter)
    : undefined;

  return (
    <EntityList
      entityType="concepts"
      columns={conceptsColumns}
      title="Concepts"
      urlFilters={urlFilters}
    />
  );
}
