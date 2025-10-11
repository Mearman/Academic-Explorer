import { createFileRoute, useSearch } from "@tanstack/react-router";
import { EntityList, type ColumnConfig } from "@/components/EntityList";
import type { Author } from "@academic-explorer/client";
import { createFilterBuilder } from "@academic-explorer/client";

export const Route = createFileRoute("/authors/")({
  component: AuthorsListRoute,
  validateSearch: (search: Record<string, unknown>) => ({
    filter: typeof search.filter === "string" ? search.filter : undefined,
  }),
});

const authorsColumns: ColumnConfig[] = [
  { key: "display_name", header: "Name" },
  { key: "orcid", header: "ORCID" },
  { key: "works_count", header: "Works" },
  { key: "cited_by_count", header: "Citations" },
  {
    key: "last_known_institutions",
    header: "Institution",
    render: (_value: unknown, row: unknown) => {
      const author = row as Author;
      return author.last_known_institutions?.[0]?.display_name || "Unknown";
    },
  },
];

function AuthorsListRoute() {
  const search = useSearch({ from: "/authors/" }) as { filter?: string };
  const filterBuilder = createFilterBuilder();
  const urlFilters = search.filter
    ? filterBuilder.parseFilterString(search.filter)
    : undefined;

  return (
    <EntityList
      entityType="authors"
      columns={authorsColumns}
      title="Authors"
      urlFilters={urlFilters}
    />
  );
}
