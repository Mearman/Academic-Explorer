import { FieldSelector } from "@/components/FieldSelector";
import { EntityMiniGraph } from "@/components/graph/EntityMiniGraph";
import { RichEntityView, ViewToggle } from "@academic-explorer/ui";
import { useEntityRoute, NavigationHelper } from "@academic-explorer/utils";
import { FUNDER_FIELDS, cachedOpenAlex } from "@academic-explorer/client";
import type { Funder } from "@academic-explorer/types";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

const FUNDER_ROUTE_PATH = "/funders/$funderId";

// Configuration for the shared entity route hook
const FUNDER_ENTITY_CONFIG = {
  entityType: "funder" as const,
  routePath: "/funders/$funderId",
  paramKey: "funderId",
  fields: FUNDER_FIELDS,
  randomApiCall: cachedOpenAlex.client.funders.getRandomFunders.bind(cachedOpenAlex.client.funders),
  logContext: "FunderRoute",
};

function FunderRoute() {
  const navigate = useNavigate();

  // Use our shared hook - this replaces ~100 lines of duplicated code!
  const entityRoute = useEntityRoute<Funder>(FUNDER_ENTITY_CONFIG);

  const {
    cleanEntityId: funderId,
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
      entityType: "funder",
      routePath: FUNDER_ROUTE_PATH,
      logContext: "FunderRoute",
    });

    navigator.handleMalformedUrl(funderId, ({ to, params, replace }) => {
      navigate({ to, params, replace });
    });
  }, [funderId]);

  const funder = rawEntityData.data;

  return (
    <>
      <FieldSelector
        entityType="funder"
        entityId={funderId}
        fields={FUNDER_FIELDS}
        viewMode={viewMode}
      />

      <EntityMiniGraph
        entityType="funder"
        entityId={funderId}
        graphData={graphData}
        miniGraphData={miniGraphData}
        loadEntity={loadEntity}
        loadEntityIntoGraph={loadEntityIntoGraph}
        nodeCount={nodeCount}
      />

      <ViewToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        entityType="funder"
        entityId={funderId}
        routeSearch={routeSearch}
        isLoadingRandom={isLoadingRandom}
      />

      <RichEntityView
        entityType="funder"
        entity={funder}
        viewMode={viewMode}
        isLoading={rawEntityData.isLoading}
        error={rawEntityData.error}
        fields={FUNDER_FIELDS}
      />
    </>
  );
}

export const Route = createLazyFileRoute(FUNDER_ROUTE_PATH)({
  component: FunderRoute,
});