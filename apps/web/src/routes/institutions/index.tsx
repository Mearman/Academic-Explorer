import { createFileRoute, useSearch } from "@tanstack/react-router";
import { EntityList } from "@/components/EntityList";
import type { ColumnConfig } from "@/components/types";
import { createFilterBuilder } from "@academic-explorer/client";

export const Route = createFileRoute("/institutions/")({
  component: InstitutionsListRoute,
});

const institutionsColumns: ColumnConfig[] = [
  { key: "display_name", header: "Name" },
  { key: "country_code", header: "Country" },
  { key: "type", header: "Type" },
  { key: "works_count", header: "Works" },
  { key: "cited_by_count", header: "Citations" },
];

function InstitutionsListRoute() {
  const search = useSearch({ from: "/institutions/" }) as { filter?: string };
  const filterBuilder = createFilterBuilder();
  const urlFilters = search.filter
    ? filterBuilder.parseFilterString(search.filter)
    : undefined;

  return (
    <EntityList
      entityType="institutions"
      columns={institutionsColumns}
      title="Institutions"
      urlFilters={urlFilters}
    />
  );
}
