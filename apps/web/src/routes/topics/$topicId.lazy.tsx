import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { TOPIC_FIELDS, cachedOpenAlex, type Topic, type TopicField } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
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

  // Parse select parameter - if not provided, use all TOPIC_FIELDS (default behavior)
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as TopicField[]
    : [...TOPIC_FIELDS];

  // Fetch topic data
  const { data: topic, isLoading, error } = useQuery({
    queryKey: ["topic", topicId, selectParam],
    queryFn: async () => {
      if (!topicId) {
        throw new Error("Topic ID is required");
      }
      const response = await cachedOpenAlex.client.topics.getTopic(topicId, {
        select: selectFields,
      });
      return response as Topic;
    },
    enabled: !!topicId && topicId !== "random",
  });

  // Handle loading state
  if (isLoading) {
    return <LoadingState entityType="topic" entityId={topicId || ''} config={ENTITY_TYPE_CONFIGS.topic} />;
  }

  // Handle error state
  if (error || !topic) {
    return (
      <ErrorState
        error={error}
        entityType="topic"
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
      selectFields={selectFields}
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
