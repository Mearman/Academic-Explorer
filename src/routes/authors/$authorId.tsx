import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useCallback } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { logError, logger } from "@/lib/logger";
import { EntityDetector } from "@/lib/graph/utils/entity-detection";

export const Route = createFileRoute("/authors/$authorId")({
	component: AuthorRoute,
});

function AuthorRoute() {
 	const { authorId } = Route.useParams();
 	const navigate = useNavigate();

 	// Debug logging for route params
 	logger.debug("routing", "AuthorRoute component mounted", { authorId, type: typeof authorId }, "AuthorRoute");
	const graphData = useGraphData();

	const loadEntity = graphData.loadEntity;
	const loadEntityIntoGraph = graphData.loadEntityIntoGraph;
	const expandNode = graphData.expandNode;

	// Track which authors have been loaded to prevent infinite loops
	const loadedAuthorsRef = useRef<Set<string>>(new Set());

  // Check if ID needs normalization and redirect if necessary
  useEffect(() => {
    if (!authorId || typeof authorId !== 'string' || authorId.trim() === '') {
      logger.debug("routing", "authorId is invalid, skipping normalization check", { authorId, type: typeof authorId }, "AuthorRoute");
      return;
    }

    logger.debug("routing", "Processing authorId for normalization", { authorId }, "AuthorRoute");

    const detector = new EntityDetector();
    const detection = detector.detectEntityIdentifier(authorId);

		// If ID was normalized and is different from input, redirect
		if (detection.normalizedId && detection.normalizedId !== authorId) {
			logger.debug("routing", "Redirecting to normalized author ID", {
				originalId: authorId,
				normalizedId: detection.normalizedId
			}, "AuthorRoute");

			// Replace current URL with normalized version, preserving query params
			void navigate({
				to: "/authors/$authorId",
				params: { authorId: detection.normalizedId },
				search: (prev) => prev, // Preserve existing search params
				replace: true
			});
			return;
		}
	}, [authorId, navigate]);

	// Fetch entity data for title
	const rawEntityDataResult = useRawEntityData({
		entityId: authorId,
		enabled: !!authorId
	});
	const author = rawEntityDataResult.data;

	// Update document title with author name
	useEntityDocumentTitle(author);

  // Create stable callback for loading author data - removed nodeCount dependency
  const loadAuthor = useCallback(async () => {
    logger.debug("routing", "loadAuthor called", { authorId, type: typeof authorId, length: authorId?.length }, "AuthorRoute");

    if (!authorId || typeof authorId !== 'string' || authorId.trim() === '') {
      logger.debug("routing", "loadAuthor called but authorId is invalid, skipping", { authorId, type: typeof authorId, length: authorId?.length }, "AuthorRoute");
      return;
    }

		try {
			// Get current node count at time of execution rather than as dependency
			const currentNodeCount = useGraphStore.getState().totalNodeCount;
			logger.debug("routing", "loadAuthor called", {
				authorId,
				currentNodeCount,
				loadedAuthors: Array.from(loadedAuthorsRef.current)
			}, "AuthorRoute");

			// Check if this author has already been loaded to prevent infinite loops
			// BUT also check if graph actually has nodes - if not, we need to reload
			if (loadedAuthorsRef.current.has(authorId) && currentNodeCount > 0) {
				logger.debug("routing", "Author already loaded, skipping", { authorId, currentNodeCount }, "AuthorRoute");
				return;
			}

			// TEMP DEBUG: If author was marked as loaded but graph is empty, clear the tracking
			if (loadedAuthorsRef.current.has(authorId) && currentNodeCount === 0) {
				logger.debug("routing", "Author marked as loaded but graph is empty - clearing tracking and reloading", { authorId, currentNodeCount }, "AuthorRoute");
				loadedAuthorsRef.current.clear();
			}

			// Mark this author as being loaded
			loadedAuthorsRef.current.add(authorId);

 			// If graph already has nodes, use incremental loading to preserve existing entities
 			// This prevents clearing the graph when clicking on nodes or navigating
 			if (currentNodeCount > 0) {
 				logger.debug("routing", "Loading author into existing graph", { authorId, currentNodeCount, type: typeof authorId }, "AuthorRoute");
 				if (!authorId || typeof authorId !== 'string' || authorId.trim() === '') {
 					logger.error("routing", "authorId is invalid before loadEntityIntoGraph call, this should not happen", { authorId, type: typeof authorId }, "AuthorRoute");
 					return;
 				}
 				await loadEntityIntoGraph(authorId);
 			} else {
 				// If graph is empty, use full loading (clears graph for initial load)
 				logger.debug("routing", "Loading author into empty graph", { authorId, type: typeof authorId }, "AuthorRoute");
 				if (!authorId || typeof authorId !== 'string' || authorId.trim() === '') {
 					logger.error("routing", "authorId is invalid before loadEntity call, this should not happen", { authorId, type: typeof authorId }, "AuthorRoute");
 					return;
 				}
 				await loadEntity(authorId);

				// For initial author page load, automatically expand to show works
				// This ensures users see a full graph when directly visiting an author URL
				const authorNodeId = `https://openalex.org/${authorId}`;
				console.log("DEBUG: Author route calling expandNode", { authorNodeId, force: true });
				try {
					await expandNode(authorNodeId, { force: true });
					console.log("DEBUG: expandNode completed successfully");
				} catch (expansionError) {
					console.log("DEBUG: expandNode failed", expansionError);
					// Log expansion failures but don't prevent the author from loading
					logger.warn("routing", "Failed to expand author on initial load", {
						authorId,
						error: expansionError instanceof Error ? expansionError.message : String(expansionError)
					}, "AuthorRoute");
				}
			}
		} catch (error) {
			logError("Failed to load author", error, "AuthorRoute", "routing");
		}
	}, [authorId, loadEntity, loadEntityIntoGraph, expandNode]);

	useEffect(() => {
		void loadAuthor();
	}, [loadAuthor]);

	// Return null - the graph is visible from MainLayout
	// The route content is just for triggering the data load
	return null;
}