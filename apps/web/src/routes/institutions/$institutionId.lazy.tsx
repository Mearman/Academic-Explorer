import { FieldSelector } from "@/components/FieldSelector";
import { EntityMiniGraph } from "@/components/graph/EntityMiniGraph";
import { RichEntityView, ViewToggle } from "@academic-explorer/ui";
import { useEntityRoute, NavigationHelper } from "@academic-explorer/utils";
import { INSTITUTION_FIELDS, cachedOpenAlex, type InstitutionEntity } from "@academic-explorer/client";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

const INSTITUTION_ROUTE_PATH = "/institutions/$institutionId";

// Configuration for the shared entity route hook
const INSTITUTION_ENTITY_CONFIG = {
  entityType: "institution" as const,
  routePath: "/institutions/$institutionId",
  paramKey: "institutionId",
  fields: INSTITUTION_FIELDS,
  randomApiCall: cachedOpenAlex.client.institutions.getRandomInstitutions.bind(cachedOpenAlex.client.institutions),
  logContext: "InstitutionRoute",
};

function InstitutionRoute() {
  const navigate = useNavigate();

  // Use our shared hook - this replaces ~100 lines of duplicated code!
  const entityRoute = useEntityRoute<InstitutionEntity>(INSTITUTION_ENTITY_CONFIG);

  const {
    cleanEntityId: institutionId,
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
      entityType: "institution",
      routePath: INSTITUTION_ROUTE_PATH,
      logContext: "InstitutionRoute",
    });

    navigator.handleMalformedUrl(institutionId, ({ to, params, replace }) => {
      navigate({ to, params, replace });
    });
  }, [institutionId]);

  const institution = rawEntityData.data;

  return (
    <>
      <FieldSelector
        entityType="institution"
        entityId={institutionId}
        fields={INSTITUTION_FIELDS}
        viewMode={viewMode}
      />

      <EntityMiniGraph
        entityType="institution"
        entityId={institutionId}
        graphData={graphData}
        miniGraphData={miniGraphData}
        loadEntity={loadEntity}
        loadEntityIntoGraph={loadEntityIntoGraph}
        nodeCount={nodeCount}
      />

      <ViewToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        entityType="institution"
        entityId={institutionId}
        routeSearch={routeSearch}
        isLoadingRandom={isLoadingRandom}
      />

      <RichEntityView
        entityType="institution"
        entity={institution}
        viewMode={viewMode}
        isLoading={rawEntityData.isLoading}
        error={rawEntityData.error}
        fields={INSTITUTION_FIELDS}
      />
    </>
  );
}

export const Route = createLazyFileRoute(INSTITUTION_ROUTE_PATH)({
  component: InstitutionRoute,
});