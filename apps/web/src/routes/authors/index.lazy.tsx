import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { EntityListWithQueryBookmarking } from "@/components/EntityListWithQueryBookmarking";
import type { ColumnConfig } from "@/components/types";
import type { Author } from "@academic-explorer/client";
import type { ViewMode } from "@/components/ViewModeToggle";
import type { OpenAlexSearchParams } from "@/lib/route-schemas";
import { useState } from "react";

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
  const search = useSearch({ from: "/authors/" }) as OpenAlexSearchParams;
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  return (
    <EntityListWithQueryBookmarking
      entityType="authors"
      columns={authorsColumns}
      title="Authors"
      searchParams={search}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showBookmarkButton={true}
      bookmarkButtonPosition="header"
    />
  );
}

export const Route = createLazyFileRoute("/authors/")({
  component: AuthorsListRoute,
});

export default AuthorsListRoute;
