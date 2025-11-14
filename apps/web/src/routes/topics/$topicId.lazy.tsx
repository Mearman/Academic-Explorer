import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { cachedOpenAlex } from "@academic-explorer/client";
import { TOPIC_FIELDS, type Topic, type TopicField } from "@academic-explorer/types/entities";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { EntityDetailLayout } from "@/components/entity-detail/EntityDetailLayout";
import { LoadingState } from "@/components/entity-detail/LoadingState";
import { ErrorState } from "@/components/entity-detail/ErrorState";
import { ENTITY_TYPE_CONFIGS } from "@/components/entity-detail/EntityTypeConfig";

function TopicRoute() {
  const { topicId: rawTopicId } = useParams({ strict: false });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the topic ID in case it's URL-encoded (for external IDs with special characters)
  const topicId = decodeEntityId(rawTopicId);

  // Use pretty URL hook to replace encoded IDs with decoded versions in the URL
  usePrettyUrl("topics", rawTopicId, topicId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as TopicField[]
    : undefined;

  // Fetch topic data
  const { data: topic, isLoading, error } = useQuery({
    queryKey: ["topic", topicId, selectParam],
    queryFn: async () => {
      if (!topicId) {
        throw new Error("Topic ID is required");
      }
      const response = await cachedOpenAlex.client.topics.getTopic(
        topicId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Topic;
    },
    enabled: !!topicId && topicId !== "random",
  });

  // Handle loading state
  if (isLoading) {
    return <LoadingState entityType="Topic" entityId={topicId || ''} config={ENTITY_TYPE_CONFIGS.topic} />;
  }

  // Handle error state
  if (error || !topic) {
    return (
      <ErrorState
        error={error}
        entityType="Topic"
        entityId={topicId || ''}
      />
    );
  }

  return (
    <EntityDetailLayout
      config={ENTITY_TYPE_CONFIGS.topic}
      entityType="topic"
      entityId={topicId || ''}
      displayName={topic.display_name || "Topic"}
      selectParam={typeof selectParam === 'string' ? selectParam : undefined}
      selectFields={selectFields || []}
      viewMode={viewMode}
      onToggleView={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
      data={topic}
    />
  );
}

export const Route = createLazyFileRoute("/topics/$topicId")({
  component: TopicRoute,
});

export default TopicRoute;
