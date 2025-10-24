import { FieldSelector } from "@/components/FieldSelector";
import { EntityMiniGraph } from "@/components/graph/EntityMiniGraph";
import { RichEntityView } from "@academic-explorer/ui/components/entity-views";
import { ViewToggle } from "@academic-explorer/ui/components/ViewToggle";
import { useEntityRoute, NavigationHelper } from "@academic-explorer/utils";
import { SOURCE_FIELDS, cachedOpenAlex } from "@academic-explorer/client";
import type { Source } from "@academic-explorer/types";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

const SOURCE_ROUTE_PATH = "/sources/$sourceId";

// Configuration for the shared entity route hook
const SOURCE_ENTITY_CONFIG = {
  entityType: "source" as const,
  routePath: "/sources/$sourceId",
  paramKey: "sourceId",
  fields: SOURCE_FIELDS,
  randomApiCall: cachedOpenAlex.client.sources.getRandomSources.bind(cachedOpenAlex.client.sources),
  logContext: "SourceRoute",
};

function SourceRoute() {
  const navigate = useNavigate();

  // Use our shared hook - this replaces ~100 lines of duplicated code!
  const entityRoute = useEntityRoute<Source>(SOURCE_ENTITY_CONFIG);

  const {
    cleanEntityId: sourceId,
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
      entityType: "source",
      routePath: SOURCE_ROUTE_PATH,
      logContext: "SourceRoute",
    });

    navigator.handleMalformedUrl(sourceId, ({ to, params, replace }) => {
      navigate({ to, params, replace });
    });
  }, [sourceId]);

  const source = rawEntityData.data;

  return (
    <>
      <FieldSelector
        entityType="source"
        entityId={sourceId}
        fields={SOURCE_FIELDS}
        viewMode={viewMode}
      />

      <EntityMiniGraph
        entityType="source"
        entityId={sourceId}
        graphData={graphData}
        miniGraphData={miniGraphData}
        loadEntity={loadEntity}
        loadEntityIntoGraph={loadEntityIntoGraph}
        nodeCount={nodeCount}
      />

      <ViewToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        entityType="source"
        entityId={sourceId}
        routeSearch={routeSearch}
        isLoadingRandom={isLoadingRandom}
      />

      <RichEntityView
        entityType="source"
        entity={source}
        viewMode={viewMode}
        isLoading={rawEntityData.isLoading}
        error={rawEntityData.error}
        fields={SOURCE_FIELDS}
      />
    </>
  );
}

export const Route = createLazyFileRoute(SOURCE_ROUTE_PATH)({
  component: SourceRoute,
});