import { createLazyFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { WORK_FIELDS, cachedOpenAlex, type Work, type WorkField } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { EntityDetailLayout, LoadingState, ErrorState, ENTITY_TYPE_CONFIGS } from "@/components/entity-detail";
import { useUrlNormalization } from "@/hooks/use-url-normalization";
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { EntityDetectionService } from "@academic-explorer/graph";
import { logger } from "@academic-explorer/utils/logger";

function WorkRoute() {
  const { _splat: rawWorkId } = useParams({ from: "/works/$_" });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Fix browser address bar display issues with collapsed protocol slashes
  useUrlNormalization();

  // Extract work ID from URL - prefer the router parameter, but fall back to hash extraction
  // For hash routing with URLs containing slashes (like DOIs), we need to reconstruct the full ID
  const getWorkIdFromHash = () => {
    if (typeof window !== 'undefined') {
      const hashParts = window.location.hash.split('/');
      return hashParts.length >= 3 ? hashParts.slice(2).join('/') : '';
    }
    return '';
  };

  const workId = rawWorkId || getWorkIdFromHash();
  const decodedWorkId = decodeEntityId(workId);

  // Handle external canonical IDs (DOIs, ORCID, etc.)
  const [normalizedWorkId, setNormalizedWorkId] = useState<string | null>(null);
  const [isProcessingExternalId, setIsProcessingExternalId] = useState(false);
  const [externalIdError, setExternalIdError] = useState<string | null>(null);

  useEffect(() => {
    const processExternalId = async () => {
      if (!decodedWorkId) return;

      // Check if this is an external canonical ID that needs processing
      if (decodedWorkId.match(/^https?:\/\//i) ||
          decodedWorkId.match(/^doi:/i) ||
          decodedWorkId.match(/^orcid:/i) ||
          decodedWorkId.match(/^ror:/i) ||
          decodedWorkId.match(/^pmid:/i)) {

        setIsProcessingExternalId(true);
        setExternalIdError(null);

        try {
          logger.debug("routing", "Processing external work ID", {
            workId: decodedWorkId
          }, "WorkRoute");

          const detection = EntityDetectionService.detectEntity(decodedWorkId);

          if (detection?.entityType === "works" && detection?.normalizedId) {
            logger.debug("routing", "Successfully detected work entity", {
              original: decodedWorkId,
              normalized: detection.normalizedId,
              detectionMethod: detection.detectionMethod
            }, "WorkRoute");

            setNormalizedWorkId(detection.normalizedId);
          } else {
            const errorMsg = `Invalid work ID format: ${decodedWorkId}`;
            logger.error("routing", "Failed to detect work entity", {
              workId: decodedWorkId,
              detection
            }, "WorkRoute");
            setExternalIdError(errorMsg);
          }
        } catch (error) {
          const errorMsg = `Error processing work ID: ${decodedWorkId}`;
          logger.error("routing", "Error processing external work ID", {
            workId: decodedWorkId,
            error
          }, "WorkRoute");
          setExternalIdError(errorMsg);
        } finally {
          setIsProcessingExternalId(false);
        }
      } else {
        // This is already a normalized OpenAlex ID
        setNormalizedWorkId(decodedWorkId);
      }
    };

    processExternalId();
  }, [decodedWorkId]);

  // Update URL with pretty display version if needed
  // Use the extracted workId since rawWorkId from TanStack Router doesn't work with hash routing
  usePrettyUrl("works", workId, decodedWorkId);

  // Parse select parameter - if not provided, use all WORK_FIELDS (default behavior)
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as WorkField[]
    : [...WORK_FIELDS];

  // Fetch work data using normalized ID
  const { data: work, isLoading, error } = useQuery({
    queryKey: ["work", normalizedWorkId, selectParam],
    queryFn: async () => {
      if (!normalizedWorkId) {
        throw new Error("Work ID is required");
      }
      const response = await cachedOpenAlex.client.works.getWork(normalizedWorkId, {
        select: selectFields,
      });
      return response as Work;
    },
    enabled: !!normalizedWorkId && normalizedWorkId !== "random" && !isProcessingExternalId,
  });

  const config = ENTITY_TYPE_CONFIGS.work;

  // Show processing state for external canonical IDs
  if (isProcessingExternalId) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          fontSize: "16px",
        }}
      >
        <div style={{ marginBottom: "20px", fontSize: "18px" }}>
          Processing Work ID
        </div>
        <div
          style={{
            fontFamily: "monospace",
            backgroundColor: "#f5f5f5",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "20px",
            wordBreak: "break-all",
          }}
        >
          {decodedWorkId}
        </div>
        <div style={{ fontSize: "14px", color: "#666" }}>
          Detecting entity type and resolving to OpenAlex ID
        </div>
      </div>
    );
  }

  // Show error for external ID processing failures
  if (externalIdError) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          fontSize: "16px",
        }}
      >
        <div style={{ marginBottom: "20px", fontSize: "18px", color: "#e74c3c" }}>
          Error Processing Work ID
        </div>
        <div
          style={{
            fontFamily: "monospace",
            backgroundColor: "#fdf2f2",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid #fecaca",
            wordBreak: "break-all",
          }}
        >
          {decodedWorkId}
        </div>
        <div style={{ fontSize: "14px", color: "#e74c3c", marginBottom: "20px" }}>
          {externalIdError}
        </div>
        <div style={{ fontSize: "12px", color: "#666" }}>
          Please check the work ID format and try again.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState entityType="Work" entityId={decodedWorkId || ''} config={config} />;
  }

  if (error) {
    return <ErrorState entityType="Work" entityId={decodedWorkId || ''} error={error} />;
  }

  if (!work || !normalizedWorkId) {
    return null;
  }

  return (
    <EntityDetailLayout
      config={config}
      entityType="work"
      entityId={normalizedWorkId}
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
