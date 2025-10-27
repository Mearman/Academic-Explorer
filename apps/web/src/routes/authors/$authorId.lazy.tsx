import { FieldSelector } from "@/components/FieldSelector";
import { EntityMiniGraph } from "@/components/graph/EntityMiniGraph";
import { RichEntityView, ViewToggle } from "@academic-explorer/ui";
import { NavigationHelper } from "@academic-explorer/utils";
import { useEntityRoute } from "@/hooks/use-entity-route";
import { AUTHOR_FIELDS, cachedOpenAlex } from "@academic-explorer/client";
import type { Author } from "@academic-explorer/types";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const AUTHOR_ROUTE_PATH = "/authors/$authorId";

// Configuration for the shared entity route hook
const AUTHOR_ENTITY_CONFIG = {
  entityType: "author" as const,
  routePath: "/authors/$authorId",
  paramKey: "authorId",
  fields: AUTHOR_FIELDS,
  randomApiCall: cachedOpenAlex.client.authors.getRandomAuthors.bind(cachedOpenAlex.client.authors),
  logContext: "AuthorRoute",
};

function AuthorRoute() {
  const navigate = useNavigate();
  // Use our shared hook - this replaces ~100 lines of duplicated code!
  const entityRoute = useEntityRoute<Author>(AUTHOR_ENTITY_CONFIG);

  const {
    cleanEntityId: authorId,
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
  const [selectedFields, setSelectedFields] = useState<readonly string[]>(AUTHOR_FIELDS);

  // Handle URL cleanup for malformed OpenAlex URLs using shared utility
  useEffect(() => {
    const navigator = NavigationHelper.createEntityNavigator({
      entityType: "author",
      routePath: AUTHOR_ROUTE_PATH,
      logContext: "AuthorRoute",
    });

    navigator.handleMalformedUrl(authorId, ({ to, params, replace }) => {
      // navigate is now imported from @tanstack/react-router
      navigate({ to, params, replace });
    });
  }, [authorId]);

  const author = rawEntityData.data;

  // Extract entity and related entities from miniGraphData for EntityMiniGraph
  const entity = miniGraphData.data as Author | undefined;
  const relatedEntities = (miniGraphData.data ? [miniGraphData.data] : []) as Author[];

  return (
    <>
      <FieldSelector
        availableFields={AUTHOR_FIELDS}
        selectedFields={selectedFields}
        onFieldsChange={setSelectedFields}
        title="Select Author Fields"
        description="Choose which fields to include in the author data"
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
        entityType="author"
        entity={author}
        viewMode={viewMode}
        isLoading={rawEntityData.isLoading}
        error={rawEntityData.error}
        fields={AUTHOR_FIELDS}
      />
    </>
  );
}

export const Route = createLazyFileRoute(AUTHOR_ROUTE_PATH)({
  component: AuthorRoute,
});

export default AuthorRoute;