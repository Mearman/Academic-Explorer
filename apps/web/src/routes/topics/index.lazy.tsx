import type { Topic } from "@bibgraph/types";
import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { EntityList } from "@/components/EntityList";
import type { TableViewMode } from "@/components/TableViewModeToggle";
import type { ColumnConfig } from "@/components/types";
import type { OpenAlexSearchParams } from "@/lib/route-schemas";



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

const TopicsListRoute = () => {
  const search = useSearch({ from: "/topics/" }) as OpenAlexSearchParams;
  const [viewMode, setViewMode] = useState<TableViewMode>("table");

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
};

export const Route = createLazyFileRoute("/topics/")({
  component: TopicsListRoute,
});

export default TopicsListRoute;
