import { FieldSelector } from "@/components/FieldSelector";
import { EntityMiniGraph } from "@/components/graph/EntityMiniGraph";
import { RichEntityView, ViewToggle } from "@academic-explorer/ui";
import { useEntityRoute, NavigationHelper } from "@academic-explorer/utils";
import { TOPIC_FIELDS, cachedOpenAlex } from "@academic-explorer/client";
import type { Topic } from "@academic-explorer/types";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const TOPIC_ROUTE_PATH = "/topics/$topicId";

// Configuration for the shared entity route hook
const TOPIC_ENTITY_CONFIG = {
  entityType: "topic" as const,
  routePath: "/topics/$topicId",
  paramKey: "topicId",
  fields: TOPIC_FIELDS,
  randomApiCall: cachedOpenAlex.client.topics.randomSample.bind(cachedOpenAlex.client.topics),
  logContext: "TopicRoute",
};

export const Route = createLazyFileRoute(TOPIC_ROUTE_PATH)({
  component: TopicRoute,
});

function TopicRoute() {
  const navigate = useNavigate();

  // Use our shared hook - this replaces ~100 lines of duplicated code!
  const entityRoute = useEntityRoute<Topic>(TOPIC_ENTITY_CONFIG);

  const {
    cleanEntityId: topicId,
    viewMode,
    setViewMode,
    isLoadingRandom,
    graphData,
    miniGraphData,
    rawEntityData,
    nodeCount,
    loadEntity,
    loadEntityIntoGraph,
    routeSearch,
  } = entityRoute;

  // Field selection state
  const [selectedFields, setSelectedFields] = useState<readonly string[]>(TOPIC_FIELDS);

  // Handle URL cleanup for malformed OpenAlex URLs using shared utility
  useEffect(() => {
    const navigator = NavigationHelper.createEntityNavigator({
      entityType: "topic",
      routePath: TOPIC_ROUTE_PATH,
      logContext: "TopicRoute",
    });

    navigator.handleMalformedUrl(topicId, ({ to, params, replace }) => {
      navigate({ to, params, replace });
    });
  }, [topicId]);

  const topic = rawEntityData.data;

  // Extract entity and related entities from miniGraphData for EntityMiniGraph
  const entity = miniGraphData.data as Topic | undefined;
  const relatedEntities = (miniGraphData.data ? [miniGraphData.data] : []) as Topic[];

  return (
    <>
      <FieldSelector
        availableFields={TOPIC_FIELDS}
        selectedFields={selectedFields}
        onFieldsChange={setSelectedFields}
        title="Select Topic Fields"
        description="Choose which fields to include in the topic data"
      />

      {entity && (
        <EntityMiniGraph
          entity={entity}
          relatedEntities={relatedEntities}
        />
      )}

      <ViewToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <RichEntityView
        entityType="topic"
        entity={topic}
        viewMode={viewMode}
        isLoading={rawEntityData.isLoading}
        error={rawEntityData.error}
        fields={TOPIC_FIELDS}
      />
    </>
  );
}

export default TopicRoute;
