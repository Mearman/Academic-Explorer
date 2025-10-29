import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { EntityList } from "@/components/EntityList";
import type { ColumnConfig } from "@/components/types";
import type { OpenAlexSearchParams } from "@/lib/route-schemas";
import { useState } from "react";
import type { ViewMode } from "@/components/ViewModeToggle";
import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

const conceptsColumns: ColumnConfig[] = [
  { key: "display_name", header: "Name" },
  { key: "description", header: "Description" },
  { key: "works_count", header: "Works" },
  { key: "cited_by_count", header: "Citations" },
  { key: "level", header: "Level" },
];

function ConceptsListRoute() {
  const search = useSearch({ from: "/concepts/" }) as OpenAlexSearchParams;
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  return (
    <div>
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="Concepts Entity Deprecated"
        color="yellow"
        style={{ marginBottom: "1rem" }}
      >
        The OpenAlex Concepts entity has been deprecated by the OpenAlex API as of 2024.
        Please use the Topics entity instead for hierarchical subject classification.
        Existing concept data may be incomplete or outdated.
      </Alert>
      <EntityList
        entityType="concepts"
        columns={conceptsColumns}
        title="Concepts (Deprecated)"
        searchParams={search}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    </div>
  );
}

export const Route = createLazyFileRoute("/concepts/")({
  component: ConceptsListRoute,
});

export default ConceptsListRoute;
