import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { EntityList, type ColumnConfig } from "@/components/EntityList";
import type { OpenAlexSearchParams } from "@/lib/route-schemas";
import { useState } from "react";
import type { ViewMode } from "@/components/ViewModeToggle";

const fundersColumns: ColumnConfig[] = [
  { key: "id", header: "ID" },
  { key: "display_name", header: "Name" },
  { key: "country_code", header: "Country" },
  { key: "international", header: "International" },
];

function FundersRoute() {
  const search = useSearch({ from: "/funders/" }) as OpenAlexSearchParams;
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  return (
    <EntityList
      entityType="funders"
      columns={fundersColumns}
      title="Funders"
      searchParams={search}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
}

export const Route = createLazyFileRoute("/funders/")({
  component: FundersRoute,
});

export default FundersRoute;
