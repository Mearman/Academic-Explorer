import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { EntityList, type EntityListColumnConfig } from "@/components/EntityList";
import type { OpenAlexSearchParams } from "@/lib/route-schemas";
import { useState } from "react";
import type { TableViewMode } from "@/components/ViewModeToggle";

const sourcesColumns: EntityListColumnConfig[] = [
  { key: "id", header: "ID" },
  { key: "display_name", header: "Name" },
  { key: "ids.issn", header: "ISSN" },
];

function SourcesRoute() {
  const search = useSearch({ from: "/sources/" }) as OpenAlexSearchParams;
  const [viewMode, setViewMode] = useState<TableViewMode>("table");

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
