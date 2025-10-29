import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { EntityList, type ColumnConfig } from "@/components/EntityList";
import type { OpenAlexSearchParams } from "@/lib/route-schemas";
import { useState } from "react";
import type { ViewMode } from "@/components/ViewModeToggle";

const sourcesColumns: ColumnConfig[] = [
  { key: "id", header: "ID" },
  { key: "display_name", header: "Name" },
  { key: "ids.issn", header: "ISSN" },
];

function SourcesRoute() {
  const search = useSearch({ from: "/sources/" }) as OpenAlexSearchParams;
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  return (
    <EntityList
      entityType="sources"
      columns={sourcesColumns}
      title="Sources"
      searchParams={search}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
}

export const Route = createLazyFileRoute("/sources/")({
  component: SourcesRoute,
});

export default SourcesRoute;
