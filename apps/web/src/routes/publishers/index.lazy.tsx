import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { EntityList, type EntityListColumnConfig } from "@/components/EntityList";
import type { OpenAlexSearchParams } from "@/lib/route-schemas";
import { useState } from "react";
import type { ViewMode } from "@/components/ViewModeToggle";

const publishersColumns: EntityListColumnConfig[] = [
  { key: "id", header: "ID" },
  { key: "display_name", header: "Name" },
  {
    key: "international_standard_identifier",
    header: "International Standard Identifier",
  },
];

function PublishersRoute() {
  const search = useSearch({ from: "/publishers/" }) as OpenAlexSearchParams;
  const [viewMode, setViewMode] = useState<TableViewMode>("table");

  return (
    <EntityList
      entityType="publishers"
      columns={publishersColumns}
      title="Publishers"
      searchParams={search}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
}

export const Route = createLazyFileRoute("/publishers/")({
  component: PublishersRoute,
});

export default PublishersRoute;
