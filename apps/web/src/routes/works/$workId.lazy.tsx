import { createLazyFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { WORK_FIELDS, cachedOpenAlex, type Work, type WorkField } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { EntityDetailLayout, LoadingState, ErrorState, ENTITY_TYPE_CONFIGS } from "@/components/entity-detail";

function WorkRoute() {
  const { workId: rawWorkId } = useParams({ strict: false });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the work ID and fix any collapsed protocol slashes
  const workId = decodeEntityId(rawWorkId);

  // Parse select parameter - if not provided, use all WORK_FIELDS (default behavior)
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as WorkField[]
    : [...WORK_FIELDS];

  // Fetch work data
  const { data: work, isLoading, error } = useQuery({
    queryKey: ["work", workId, selectParam],
    queryFn: async () => {
      if (!workId) {
        throw new Error("Work ID is required");
      }
      const response = await cachedOpenAlex.client.works.getWork(workId, {
        select: selectFields,
      });
      return response as Work;
    },
    enabled: !!workId && workId !== "random",
  });

  const config = ENTITY_TYPE_CONFIGS.work;

  if (isLoading) {
    return <LoadingState entityType="Work" entityId={workId} config={config} />;
  }

  if (error) {
    return <ErrorState entityType="Work" entityId={workId} error={error} />;
  }

  if (!work) {
    return null;
  }

  return (
    <EntityDetailLayout
      config={config}
      entityId={workId}
      displayName={work.display_name || work.title || "Work"}
      selectParam={selectParam as string}
      selectFields={selectFields}
      viewMode={viewMode}
      onToggleView={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
      data={work as Record<string, unknown>}
    />
  );
}

export const Route = createLazyFileRoute("/works/$workId")({
  component: WorkRoute,
});
