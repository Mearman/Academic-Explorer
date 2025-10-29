import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { EntityList } from "@/components/EntityList";
import type { ColumnConfig } from "@/components/types";
import type { OpenAlexSearchParams } from "@/lib/route-schemas";
import { useState } from "react";
import type { ViewMode } from "@/components/ViewModeToggle";

const institutionsColumns: ColumnConfig[] = [
  { key: "display_name", header: "Name" },
  { key: "country_code", header: "Country" },
  { key: "type", header: "Type" },
  { key: "works_count", header: "Works" },
  { key: "cited_by_count", header: "Citations" },
];

function InstitutionsListRoute() {
  const search = useSearch({ from: "/institutions/" }) as OpenAlexSearchParams;
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  return (
    <EntityList
      entityType="institutions"
      columns={institutionsColumns}
      title="Institutions"
      searchParams={search}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
}

export const Route = createLazyFileRoute("/institutions/")({
  component: InstitutionsListRoute,
});

export default InstitutionsListRoute;
