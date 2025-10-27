import { FieldSelector } from "@/components/FieldSelector";
import { EntityMiniGraph } from "@/components/graph/EntityMiniGraph";
import { RichEntityView, ViewToggle } from "@academic-explorer/ui";
import { NavigationHelper } from "@academic-explorer/utils";
import { useEntityRoute } from "@/hooks/use-entity-route";
import { WORK_FIELDS, cachedOpenAlex } from "@academic-explorer/client";
import type { Work } from "@academic-explorer/types";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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

export const Route = createLazyFileRoute(WORK_ROUTE_PATH)({
  component: WorkRoute,
});

function WorkRoute() {
  const navigate = useNavigate();

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

  // Field selection state
  const [selectedFields, setSelectedFields] = useState<readonly string[]>(WORK_FIELDS);

  // Handle URL cleanup for malformed OpenAlex URLs using shared utility
  useEffect(() => {
    const navigator = NavigationHelper.createEntityNavigator({
      entityType: "work",
      routePath: WORK_ROUTE_PATH,
      logContext: "WorkRoute",
    });

    navigator.handleMalformedUrl(workId, ({ to, params, replace }) => {
      navigate({ to, params, replace });
    });
  }, [workId, navigate]);

  const work = rawEntityData.data;

  // Extract entity and related entities from miniGraphData for EntityMiniGraph
  const entity = miniGraphData.data as Work | undefined;
  const relatedEntities = (miniGraphData.data ? [miniGraphData.data] : []) as Work[];

  return (
    <>
      <FieldSelector
        availableFields={WORK_FIELDS}
        selectedFields={selectedFields}
        onFieldsChange={setSelectedFields}
        title="Select Work Fields"
        description="Choose which fields to include in the work data"
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

export default WorkRoute;
