import { FieldSelector } from "@/components/FieldSelector";
import { EntityMiniGraph } from "@/components/graph/EntityMiniGraph";
import { RichEntityView, ViewToggle } from "@academic-explorer/ui";
import { useEntityRoute, NavigationHelper } from "@academic-explorer/utils";
import { SOURCE_FIELDS, cachedOpenAlex } from "@academic-explorer/client";
import type { Source } from "@academic-explorer/types";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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

  // Field selection state
  const [selectedFields, setSelectedFields] = useState<readonly string[]>(SOURCE_FIELDS);

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

  // Extract entity and related entities from miniGraphData for EntityMiniGraph
  const entity = miniGraphData.data as Source | undefined;
  const relatedEntities = (miniGraphData.data ? [miniGraphData.data] : []) as Source[];

  return (
    <>
      <FieldSelector
        availableFields={SOURCE_FIELDS}
        selectedFields={selectedFields}
        onFieldsChange={setSelectedFields}
        title="Select Source Fields"
        description="Choose which fields to include in the source data"
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

export default SourceRoute;
