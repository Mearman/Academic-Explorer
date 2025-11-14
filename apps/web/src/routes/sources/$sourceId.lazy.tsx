import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { cachedOpenAlex } from "@academic-explorer/client";
import { SOURCE_FIELDS, type Source, type SourceField } from "@academic-explorer/types/entities";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { EntityDetailLayout, LoadingState, ErrorState, ENTITY_TYPE_CONFIGS } from "@/components/entity-detail";

function SourceRoute() {
  const { sourceId: rawSourceId } = useParams({ strict: false });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the source ID in case it's URL-encoded (for external IDs with special characters)
  const sourceId = decodeEntityId(rawSourceId);
  usePrettyUrl("sources", rawSourceId, sourceId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as SourceField[]
    : undefined;

  // Fetch source data
  const { data: source, isLoading, error } = useQuery({
    queryKey: ["source", sourceId, selectParam],
    queryFn: async () => {
      if (!sourceId) {
        throw new Error("Source ID is required");
      }
      const response = await cachedOpenAlex.client.sources.getSource(
        sourceId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Source;
    },
    enabled: !!sourceId && sourceId !== "random",
  });

  const config = ENTITY_TYPE_CONFIGS.source;

  if (isLoading) {
    return <LoadingState entityType="Source" entityId={sourceId || ''} config={config} />;
  }

  if (error) {
    return <ErrorState entityType="Source" entityId={sourceId || ''} error={error} />;
  }

  if (!source || !sourceId) {
    return null;
  }

  return (
    <EntityDetailLayout
      config={config}
      entityType="source"
      entityId={sourceId}
      displayName={source.display_name || "Source"}
      selectParam={(selectParam as string) || ''}
      selectFields={selectFields || []}
      viewMode={viewMode}
      onToggleView={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
      data={source as Record<string, unknown>}
    />
  );
}

export const Route = createLazyFileRoute("/sources/$sourceId")({
  component: SourceRoute,
});

export default SourceRoute;
