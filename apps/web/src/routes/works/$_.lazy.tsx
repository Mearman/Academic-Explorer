import { createLazyFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { WORK_FIELDS, cachedOpenAlex, type Work, type WorkField } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { EntityDetailLayout, LoadingState, ErrorState, ENTITY_TYPE_CONFIGS } from "@/components/entity-detail";
import { useUrlNormalization } from "@/hooks/use-url-normalization";

function WorkRoute() {
  const { _splat: rawWorkId } = useParams({ from: "/works/$_" });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Fix browser address bar display issues with collapsed protocol slashes
  useUrlNormalization();

  // Extract work ID from URL hash as fallback since splat parameter isn't working
  const getWorkIdFromHash = () => {
    if (typeof window !== 'undefined') {
      const hashParts = window.location.hash.split('/');
      return hashParts.length >= 3 ? hashParts[2] : '';
    }
    return '';
  };

  const workId = rawWorkId || getWorkIdFromHash();
  const decodedWorkId = decodeEntityId(workId);

  // Pretty URL decoding is now handled in main.tsx for immediate processing

  // Parse select parameter - if not provided, use all WORK_FIELDS (default behavior)
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as WorkField[]
    : [...WORK_FIELDS];

  // Fetch work data
  const { data: work, isLoading, error } = useQuery({
    queryKey: ["work", decodedWorkId, selectParam],
    queryFn: async () => {
      if (!decodedWorkId) {
        throw new Error("Work ID is required");
      }
      const response = await cachedOpenAlex.client.works.getWork(decodedWorkId, {
        select: selectFields,
      });
      return response as Work;
    },
    enabled: !!decodedWorkId && decodedWorkId !== "random",
  });

  const config = ENTITY_TYPE_CONFIGS.work;

  if (isLoading) {
    return <LoadingState entityType="Work" entityId={decodedWorkId || ''} config={config} />;
  }

  if (error) {
    return <ErrorState entityType="Work" entityId={decodedWorkId || ''} error={error} />;
  }

  if (!work || !decodedWorkId) {
    return null;
  }

  return (
    <EntityDetailLayout
      config={config}
      entityType="work"
      entityId={decodedWorkId}
      displayName={work.display_name || work.title || "Work"}
      selectParam={(selectParam as string) || ''}
      selectFields={selectFields}
      viewMode={viewMode}
      onToggleView={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
      data={work as Record<string, unknown>}
    />
  );
}

export const Route = createLazyFileRoute("/works/$_")({
  component: WorkRoute,
});
