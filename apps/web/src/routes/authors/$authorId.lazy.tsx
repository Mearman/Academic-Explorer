import { FieldSelector } from "@/components/FieldSelector";
import { EntityMiniGraph } from "@/components/graph/EntityMiniGraph";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { useEntityMiniGraphData } from "@/hooks/use-entity-mini-graph-data";
import { useGraphData } from "@/hooks/use-graph-data";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useUserInteractions } from "@/hooks/use-user-interactions";
import { useGraphStore } from "@/stores/graph-store";
import { decodeUrlQueryParams } from "@/utils/url-helpers";
import {
  AUTHOR_FIELDS,
  cachedOpenAlex,
  type Author,
} from "@academic-explorer/client";
import { EntityDetectionService } from "@academic-explorer/graph";
import { ViewToggle } from "@academic-explorer/ui/components/ViewToggle";
import { RichEntityView } from "@academic-explorer/ui/components/entity-views";
import { logError, logger } from "@academic-explorer/utils/logger";
import { IconBookmark, IconBookmarkOff } from "@tabler/icons-react";
import {
  useNavigate,
  useParams,
  useSearch,
  createLazyFileRoute,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

const AUTHOR_ROUTE_PATH = "/authors/$authorId";

export const Route = createLazyFileRoute(AUTHOR_ROUTE_PATH)({
  component: AuthorRoute,
});

function AuthorRoute() {
  const { authorId } = useParams({ from: "/authors/$authorId" });
  const routeSearch = useSearch({ from: "/authors/$authorId" });
  const navigate = useNavigate();

  // Strip query parameters from authorId if present (defensive programming)
  const cleanAuthorId = authorId.split("?")[0];

  const entityType = "author" as const;
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");
  const hasDecodedUrlRef = useRef(false);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);

  // Decode URL-encoded query parameters on mount
  useEffect(() => {
    // Only run once
    if (hasDecodedUrlRef.current) return;
    hasDecodedUrlRef.current = true;
    decodeUrlQueryParams();
  }, []);

  // Handle "random" keyword - fetch a random author and redirect
  useEffect(() => {
    if (cleanAuthorId?.toLowerCase() !== "random" || isLoadingRandom) return;

    const loadRandomAuthor = async () => {
      setIsLoadingRandom(true);
      try {
        logger.debug(
          "routing",
          "Fetching random author",
          undefined,
          "AuthorRoute",
        );

        const response =
          await cachedOpenAlex.client.authors.getRandomAuthors(1);

        if (response.results.length > 0) {
          const randomAuthor = response.results[0];
          const cleanId = randomAuthor.id.replace("https://openalex.org/", "");

          logger.debug(
            "routing",
            "Redirecting to random author",
            {
              authorId: cleanId,
              name: randomAuthor.display_name,
            },
            "AuthorRoute",
          );

          void navigate({
            to: AUTHOR_ROUTE_PATH,
            params: { authorId: cleanId },
            search: (prev) => prev,
            replace: true,
          });
        }
      } catch (error) {
        logError(
          logger,
          "Failed to fetch random author",
          error,
          "AuthorRoute",
          "routing",
        );
        setIsLoadingRandom(false);
      }
    };

    void loadRandomAuthor();
  }, [cleanAuthorId, navigate, isLoadingRandom]);

  // Extract query parameters from URL search params
  const queryParams: Record<string, string | string[]> = {};
  if (routeSearch && typeof routeSearch === "object") {
    Object.entries(routeSearch).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          queryParams[key] = value as string[];
        } else if (typeof value === "string") {
          // Split 'select' parameter into array for OpenAlex API
          if (key === "select") {
            queryParams[key] = value.split(",").map((field) => field.trim());
          } else {
            queryParams[key] = value;
          }
        } else {
          queryParams[key] = String(value);
        }
      }
    });
  }

  const { setProvider } = useGraphStore();
  const nodeCount = useGraphStore((state) => state.totalNodeCount);

  const rawEntityData = useRawEntityData({
    entityId: cleanAuthorId,
    queryParams,
  });

  const author = rawEntityData.data as Author | undefined;

  useEntityDocumentTitle(author);

  const userInteractions = useUserInteractions({
    entityId: cleanAuthorId,
    entityType: "authors",
    autoTrackVisits: true,
  });

  // Check if ID contains a full URL and redirect to clean ID
  useEffect(() => {
    if (!cleanAuthorId) return;

    if (
      authorId.includes("https://openalex.org/") ||
      authorId.includes("http://openalex.org/")
    ) {
      try {
        const url = new URL(
          authorId.startsWith("http")
            ? authorId
            : `https://openalex.org/${authorId}`,
        );
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (pathParts.length === 1) {
          const cleanId = pathParts[0];
          logger.debug(
            "routing",
            "Redirecting from malformed author URL to clean ID",
            {
              originalId: authorId,
              cleanId,
            },
            "AuthorRoute",
          );
          void navigate({
            to: AUTHOR_ROUTE_PATH,
            params: { authorId: cleanId },
            replace: true,
          });
        }
      } catch (error) {
        logError(
          logger,
          "Failed to parse author URL for redirect",
          error,
          "AuthorRoute",
          "routing",
        );
      }
    }
  }, [authorId, cleanAuthorId, navigate]);

  const graphData = useGraphData();
  const { loadEntity, loadEntityIntoGraph } = graphData;

  const miniGraphData = useEntityMiniGraphData({
    entityId: cleanAuthorId,
    entityType: "authors",
  });

  // Normalization and redirect
  useEffect(() => {
    if (!cleanAuthorId) return;

    const detection = EntityDetectionService.detectEntity(cleanAuthorId);

    if (detection?.normalizedId && detection.normalizedId !== cleanAuthorId) {
      logger.debug(
        "routing",
        "Redirecting to normalized author ID",
        {
          originalId: authorId,
          normalizedId: detection.normalizedId,
        },
        "AuthorRoute",
      );

      void navigate({
        to: AUTHOR_ROUTE_PATH,
        params: { authorId: detection.normalizedId },
        search: (prev) => prev,
        replace: true,
      });
    }
  }, [authorId, cleanAuthorId, navigate]);

  // Load graph data
  useEffect(() => {
    const loadAuthor = async () => {
      try {
        if (nodeCount > 0) {
          await loadEntityIntoGraph(cleanAuthorId);
        } else {
          await loadEntity(cleanAuthorId);
        }
      } catch (error) {
        logError(
          logger,
          "Failed to load author",
          error,
          "AuthorRoute",
          "routing",
        );
      }
    };

    if (cleanAuthorId?.toLowerCase() !== "random") {
      void loadAuthor();
    }
  }, [cleanAuthorId, loadEntity, loadEntityIntoGraph, nodeCount]);

  logger.debug("route", "Author route loading with raw data display", {
    authorId: cleanAuthorId,
    hasEntityData: !!rawEntityData.data,
    isLoading: rawEntityData.isLoading,
    error: rawEntityData.error,
    hasSetProvider: !!setProvider,
    hasGraphData: !!graphData,
  });

  if (rawEntityData.isLoading || isLoadingRandom) {
    return (
      <div className="p-4 text-center">
        <h2>
          {isLoadingRandom ? "Finding Random Author..." : "Loading Author..."}
        </h2>
        <p>Author ID: {cleanAuthorId}</p>
      </div>
    );
  }

  if (rawEntityData.error) {
    return (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Author</h2>
        <p>Author ID: {authorId}</p>
        <p>Error: {String(rawEntityData.error)}</p>
        <button
          onClick={() => rawEntityData.refetch?.()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <FieldSelector
        entityType="author"
        entityId={cleanAuthorId}
        fields={AUTHOR_FIELDS}
        viewMode={viewMode}
      />

      <EntityMiniGraph
        entityType="author"
        entityId={cleanAuthorId}
        graphData={graphData}
        miniGraphData={miniGraphData}
        loadEntity={loadEntity}
        loadEntityIntoGraph={loadEntityIntoGraph}
        nodeCount={nodeCount}
      />

      <ViewToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        entityType="author"
        entityId={cleanAuthorId}
        routeSearch={routeSearch}
        isLoadingRandom={isLoadingRandom}
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

export default AuthorRoute;
