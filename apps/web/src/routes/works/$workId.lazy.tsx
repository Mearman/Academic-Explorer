import { FieldSelector } from "@/components/FieldSelector";
import { EntityMiniGraph } from "@/components/graph/EntityMiniGraph";
import { RichEntityView } from "@academic-explorer/ui/components/entity-views";
import { ViewToggle } from "@academic-explorer/ui/components/ViewToggle";
import { useEntityRoute, NavigationHelper } from "@academic-explorer/utils";
import { WORK_FIELDS, cachedOpenAlex } from "@academic-explorer/client";
import type { Work } from "@academic-explorer/types";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

const WORK_ROUTE_PATH = "/works/$workId";

// Configuration for the shared entity route hook
const WORK_ENTITY_CONFIG = {
  entityType: "work" as const,
  routePath: "/works/$workId",
  paramKey: "workId",
  fields: WORK_FIELDS,
  randomApiCall: cachedOpenAlex.client.works.getRandomWorks.bind(cachedOpenAlex.client.works),
  logContext: "WorkRoute",
};

function WorkRoute() {
  // Use our shared hook - this replaces ~100 lines of duplicated code!
  const entityRoute = useEntityRoute<Work>(WORK_ENTITY_CONFIG);

  const {
    cleanEntityId: workId,
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
      entityType: "work",
      routePath: WORK_ROUTE_PATH,
      logContext: "WorkRoute",
    });

    navigator.handleMalformedUrl(workId, ({ to, params, replace }) => {
      // Import navigate dynamically to avoid circular dependencies
      import("@tanstack/react-router").then(({ navigate }) => {
        navigate({ to, params, replace });
      });
    });
  }, [workId]);

  const work = rawEntityData.data;

  return (
    <>
      <FieldSelector
        entityType="work"
        entityId={workId}
        fields={WORK_FIELDS}
        viewMode={viewMode}
      />

      <EntityMiniGraph
        entityType="work"
        entityId={workId}
        graphData={graphData}
        miniGraphData={miniGraphData}
        loadEntity={loadEntity}
        loadEntityIntoGraph={loadEntityIntoGraph}
        nodeCount={nodeCount}
      />

      <ViewToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        entityType="work"
        entityId={workId}
        routeSearch={routeSearch}
        isLoadingRandom={isLoadingRandom}
      />

      <RichEntityView
        entityType="work"
        entity={work}
        viewMode={viewMode}
        isLoading={rawEntityData.isLoading}
        error={rawEntityData.error}
        fields={WORK_FIELDS}
        extraActions={
          <div className="flex gap-2">
            {/* Work-specific actions can be added here */}
          </div>
        }
      />
    </>
  );
}

export const Route = createLazyFileRoute(WORK_ROUTE_PATH)({
  component: WorkRoute,
});