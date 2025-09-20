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
	const graphData = useGraphData();
	const loadEntity = graphData.loadEntity;
	const loadEntityIntoGraph = graphData.loadEntityIntoGraph;
	const expandNode = graphData.expandNode;
	const nodeCount = useGraphStore((state) => state.totalNodeCount);

	// Track which authors have been loaded to prevent infinite loops
	const loadedAuthorsRef = useRef<Set<string>>(new Set());

	// Check if ID needs normalization and redirect if necessary
	useEffect(() => {
		if (!authorId) return;

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

	// Create stable callback for loading author data
	const loadAuthor = useCallback(async () => {
		try {
			// Check if this author has already been loaded to prevent infinite loops
			if (loadedAuthorsRef.current.has(authorId)) {
				logger.debug("routing", "Author already loaded, skipping", { authorId }, "AuthorRoute");
				return;
			}

			// Mark this author as being loaded
			loadedAuthorsRef.current.add(authorId);

			// If graph already has nodes, use incremental loading to preserve existing entities
			// This prevents clearing the graph when clicking on nodes or navigating
			if (nodeCount > 0) {
				await loadEntityIntoGraph(authorId);
			} else {
				// If graph is empty, use full loading (clears graph for initial load)
				await loadEntity(authorId);

				// For initial author page load, automatically expand to show works
				// This ensures users see a full graph when directly visiting an author URL
				const authorNodeId = `https://openalex.org/${authorId}`;
				try {
					await expandNode(authorNodeId);
				} catch (expansionError) {
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
	}, [authorId, nodeCount]);

	useEffect(() => {
		void loadAuthor();
	}, [loadAuthor]);

	// Return null - the graph is visible from MainLayout
	// The route content is just for triggering the data load
	return null;
}