import { createLazyFileRoute } from "@tanstack/react-router";
import { useSearch } from "@tanstack/react-router";
import { EntityList } from "@/components/EntityList";
import type { ColumnConfig } from "@/components/types";
import type { Topic } from "@academic-explorer/client";
import { createFilterBuilder } from "@academic-explorer/client";

export const Route = createLazyFileRoute("/topics/")({
  component: TopicsListRoute,
});

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
  const search = useSearch({ from: "/topics/" }) as { filter?: string };
  const filterBuilder = createFilterBuilder();
  const urlFilters = search.filter
    ? filterBuilder.parseFilterString(search.filter)
    : undefined;

  return (
    <EntityList
      entityType="topics"
      columns={topicsColumns}
      title="Topics"
      urlFilters={urlFilters}
    />
  );
}

export default TopicsListRoute;
