import { FieldSelector } from "@/components/FieldSelector";
import { EntityMiniGraph } from "@/components/graph/EntityMiniGraph";
import { RichEntityView } from "@academic-explorer/ui/components/entity-views";
import { ViewToggle } from "@academic-explorer/ui/components/ViewToggle";
import { useEntityRoute, NavigationHelper } from "@academic-explorer/utils";
import { TOPIC_FIELDS, cachedOpenAlex } from "@academic-explorer/client";
import type { Topic } from "@academic-explorer/types";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

const TOPIC_ROUTE_PATH = "/topics/$topicId";

// Configuration for the shared entity route hook
const TOPIC_ENTITY_CONFIG = {
  entityType: "topic" as const,
  routePath: "/topics/$topicId",
  paramKey: "topicId",
  fields: TOPIC_FIELDS,
  randomApiCall: cachedOpenAlex.client.topics.getRandomTopics.bind(cachedOpenAlex.client.topics),
  logContext: "TopicRoute",
};

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

  return (
    <>
      <FieldSelector
        entityType="topic"
        entityId={topicId}
        fields={TOPIC_FIELDS}
        viewMode={viewMode}
      />

      <EntityMiniGraph
        entityType="topic"
        entityId={topicId}
        graphData={graphData}
        miniGraphData={miniGraphData}
        loadEntity={loadEntity}
        loadEntityIntoGraph={loadEntityIntoGraph}
        nodeCount={nodeCount}
      />

      <ViewToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        entityType="topic"
        entityId={topicId}
        routeSearch={routeSearch}
        isLoadingRandom={isLoadingRandom}
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

export const Route = createLazyFileRoute(TOPIC_ROUTE_PATH)({
  component: TopicRoute,
});