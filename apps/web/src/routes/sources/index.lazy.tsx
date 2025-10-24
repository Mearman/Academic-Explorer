import { createLazyFileRoute } from "@tanstack/react-router";
import { EntityList, type ColumnConfig } from "@/components/EntityList";
export const Route = createLazyFileRoute("/sources/")({
  component: SourcesRoute,
});

const sourcesColumns: ColumnConfig[] = [
  { key: "id", header: "ID" },
  { key: "display_name", header: "Name" },
  { key: "ids.issn", header: "ISSN" },
];

function SourcesRoute() {
  return (
    <EntityList entityType="sources" columns={sourcesColumns} title="Sources" />
  );
}

export default SourcesRoute;
