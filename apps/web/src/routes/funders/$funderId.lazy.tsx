import { FieldSelector } from "@/components/FieldSelector";
import { EntityMiniGraph } from "@/components/graph/EntityMiniGraph";
import { RichEntityView, ViewToggle } from "@academic-explorer/ui";
import { useEntityRoute, NavigationHelper } from "@academic-explorer/utils";
import { FUNDER_FIELDS, cachedOpenAlex } from "@academic-explorer/client";
import type { Funder } from "@academic-explorer/types";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const FUNDER_ROUTE_PATH = "/funders/$funderId";

// Configuration for the shared entity route hook
const FUNDER_ENTITY_CONFIG = {
  entityType: "funder" as const,
  routePath: "/funders/$funderId",
  paramKey: "funderId",
  fields: FUNDER_FIELDS,
  randomApiCall: cachedOpenAlex.client.funders.randomSample.bind(cachedOpenAlex.client.funders),
  logContext: "FunderRoute",
};

export const Route = createLazyFileRoute(FUNDER_ROUTE_PATH)({
  component: FunderRoute,
});

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

  // Field selection state
  const [selectedFields, setSelectedFields] = useState<readonly string[]>(FUNDER_FIELDS);

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

  // Extract entity and related entities from miniGraphData for EntityMiniGraph
  const entity = miniGraphData.data as Funder | undefined;
  const relatedEntities = (miniGraphData.data ? [miniGraphData.data] : []) as Funder[];

  return (
    <>
      <FieldSelector
        availableFields={FUNDER_FIELDS}
        selectedFields={selectedFields}
        onFieldsChange={setSelectedFields}
        title="Select Funder Fields"
        description="Choose which fields to include in the funder data"
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

export default FunderRoute;