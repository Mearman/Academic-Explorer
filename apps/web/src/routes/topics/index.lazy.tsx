import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { EntityList } from "@/components/EntityList";
import type { ColumnConfig } from "@/components/types";
import type { Topic } from "@academic-explorer/types";
import type { OpenAlexSearchParams } from "@/lib/route-schemas";
import { useState } from "react";
import type { ViewMode } from "@/components/ViewModeToggle";

const topicsColumns: ColumnConfig[] = [
  { key: "display_name", header: "Name" },
  { key: "description", header: "Description" },
  { key: "works_count", header: "Works" },
  { key: "cited_by_count", header: "Citations" },
  {
    key: "field.display_name",
    header: "Field",
    render: (_value: unknown, row: unknown) => {
      const topic = row as Topic;
      return topic.field?.display_name || "Unknown";
    },
  },
];

function TopicsListRoute() {
  const search = useSearch({ from: "/topics/" }) as OpenAlexSearchParams;
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  return (
    <EntityList
      entityType="topics"
      columns={topicsColumns}
      title="Topics"
      searchParams={search}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
}

export const Route = createLazyFileRoute("/topics/")({
  component: TopicsListRoute,
});

export default TopicsListRoute;
