import { FieldSelector } from "@/components/FieldSelector";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
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

  // DEBUGGING: Systematically re-enable hooks one by one
  // Step 1: ✅ useGraphStore works fine
  const { setProvider } = useGraphStore();
  const nodeCount = useGraphStore((state) => state.totalNodeCount);

  // Step 2: Re-enable useRawEntityData (entity data fetching)
  // Pass queryParams to honor URL parameters like `select`
  const rawEntityData = useRawEntityData({
    entityId: cleanAuthorId,
    queryParams,
  });

  // Fetch entity data for title
  const author = rawEntityData.data as Author | undefined;

  // Update document title with author name
  useEntityDocumentTitle(author);

  // Track user interactions (visits and bookmarks)
  const userInteractions = useUserInteractions({
    entityId: cleanAuthorId,
    entityType: "author",
    autoTrackVisits: true,
  });

  // Check if ID contains a full URL and redirect to clean ID
  useEffect(() => {
    if (!cleanAuthorId) return;

    // Check if authorId contains a full OpenAlex URL
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

  // Step 3: Testing useEntityDocumentTitle hook
  useEntityDocumentTitle(rawEntityData.data);

  // Step 4: ✅ Testing refactored useGraphData (no worker dependency)
  const graphData = useGraphData();
  const { loadEntity, loadEntityIntoGraph } = graphData;

  // Normalization and redirect
  useEffect(() => {
    if (!cleanAuthorId) return;

    const detection = EntityDetectionService.detectEntity(cleanAuthorId);

    // If ID was normalized and is different from input, redirect
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

      // Replace current URL with normalized version, preserving query params
      void navigate({
        to: AUTHOR_ROUTE_PATH,
        params: { authorId: detection.normalizedId },
        search: (prev) => prev, // Preserve existing search params
        replace: true,
      });
    }
  }, [authorId, cleanAuthorId, navigate]);

  // Load graph data
  useEffect(() => {
    const loadAuthor = async () => {
      try {
        // If graph already has nodes, use incremental loading to preserve existing entities
        // This prevents clearing the graph when clicking on nodes or navigating
        if (nodeCount > 0) {
          await loadEntityIntoGraph(cleanAuthorId);
        } else {
          // If graph is empty, use full loading (clears graph for initial load)
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

    // Don't try to load if we're resolving "random"
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

  // Show loading state
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

  // Show error state
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

  // Show error if no data available
  if (!rawEntityData.data) {
    return (
      <div className="p-4 text-center text-red-500">
        <h2>No Author Data Available</h2>
        <p>Author ID: {authorId}</p>
        <button
          onClick={() => rawEntityData.refetch?.()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Parse selected fields from URL
  const selectedFields =
    typeof routeSearch?.select === "string"
      ? routeSearch.select.split(",").map((f) => f.trim())
      : [];

  // Handler for field selection changes
  const handleFieldsChange = (fields: readonly string[]) => {
    void navigate({
      to: AUTHOR_ROUTE_PATH,
      params: { authorId: cleanAuthorId },
      search: { select: fields.length > 0 ? fields.join(",") : undefined },
      replace: true,
    });
  };

  // Show content based on view mode
  return (
    <div className="p-4 max-w-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <ViewToggle
          viewMode={viewMode}
          onToggle={setViewMode}
          entityType={entityType}
        />

        <button
          onClick={async () => {
            if (userInteractions.isBookmarked) {
              await userInteractions.unbookmarkEntity();
            } else {
              const title = author?.display_name || `Author ${authorId}`;
              await userInteractions.bookmarkEntity(title);
            }
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            userInteractions.isBookmarked
              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          title={
            userInteractions.isBookmarked
              ? "Remove bookmark"
              : "Bookmark this author"
          }
        >
          {userInteractions.isBookmarked ? (
            <IconBookmark size={16} fill="currentColor" />
          ) : (
            <IconBookmarkOff size={16} />
          )}
          {userInteractions.isBookmarked ? "Bookmarked" : "Bookmark"}
        </button>
      </div>

      {/* Field Selector */}
      <div className="mb-4">
        <FieldSelector
          availableFields={AUTHOR_FIELDS}
          selectedFields={selectedFields}
          onFieldsChange={handleFieldsChange}
        />
      </div>

      {viewMode === "raw" ? (
        <pre className="json-view p-4 bg-gray-100 overflow-auto mt-4">
          {JSON.stringify(rawEntityData.data, null, 2)}
        </pre>
      ) : (
        <RichEntityView
          entity={rawEntityData.data}
          entityType={entityType}
          onNavigate={(path: string) => {
            void navigate({ to: path });
          }}
        />
      )}
    </div>
  );
}

export default AuthorRoute;
