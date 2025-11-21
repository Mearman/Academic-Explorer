import { createLazyFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { cachedOpenAlex } from "@academic-explorer/client";
import { KEYWORD_FIELDS, type Keyword, type KeywordField } from "@academic-explorer/types/entities";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { EntityDataDisplay } from "@/components/EntityDataDisplay";
import { useEntityRelationships } from "@/hooks/use-entity-relationships";
import { LoadingState } from "@/components/entity-detail/LoadingState";
import { ErrorState } from "@/components/entity-detail/ErrorState";
import { ENTITY_TYPE_CONFIGS } from "@/components/entity-detail/EntityTypeConfig";

function KeywordRoute() {
  const { keywordId: rawKeywordId } = useParams({ from: "/keywords/$keywordId" });
  const { select: selectParam } = useSearch({ from: "/keywords/$keywordId" });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the keyword ID in case it's URL-encoded (for external IDs with special characters)
  const keywordId = decodeEntityId(rawKeywordId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as KeywordField[]
    : undefined;

  // Fetch keyword data
  const { data: keyword, isLoading, error} = useQuery({
    queryKey: ["keyword", keywordId, selectParam],
    queryFn: async () => {
      if (!keywordId) {
        throw new Error("Keyword ID is required");
      }
      const response = await cachedOpenAlex.client.keywords.getKeyword(
        keywordId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Keyword;
    },
    enabled: !!keywordId && keywordId !== "random",
  });

  // Get relationship counts for summary display - MUST be called before early returns (Rules of Hooks)
  const { incomingCount, outgoingCount } = useEntityRelationships(
    keywordId || "",
    'keywords'
  );

  // Handle loading state
  if (isLoading) {
    return <LoadingState entityType="Keyword" entityId={keywordId || ''} config={ENTITY_TYPE_CONFIGS.keywords} />;
  }

  // Handle error state
  if (error || !keyword) {
    return (
      <ErrorState
        error={error}
        entityType="Keyword"
        entityId={keywordId || ''}
      />
    );
  }

  // Render main content
  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">{keyword?.display_name || "Keyword"}</h1>
        <div className="text-sm text-gray-600 mb-4">
          <strong>Keyword ID:</strong> {keywordId}<br />
          <strong>Select fields:</strong> {selectParam && typeof selectParam === 'string' ? selectParam : `default (${selectFields?.join(", ") || "all"})`}
        </div>
        <button
          onClick={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {viewMode === "raw" ? "Switch to Rich View" : "Switch to Raw View"}
        </button>
      </div>

      {viewMode === "raw" ? (
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[600px]">
          {JSON.stringify(keyword, null, 2)}
        </pre>
      ) : (
        <EntityDataDisplay data={keyword as Record<string, unknown>} />
      )}
    </div>
  );
}

export const Route = createLazyFileRoute("/keywords/$keywordId")({
  component: KeywordRoute,
});

export default KeywordRoute;
