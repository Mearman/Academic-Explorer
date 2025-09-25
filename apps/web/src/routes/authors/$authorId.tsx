import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { logError, logger } from "@academic-explorer/utils/logger";
import { EntityDetector } from "@academic-explorer/graph";

export const Route = createFileRoute("/authors/$authorId")({
	component: AuthorRoute,
});

function AuthorRoute() {
	const { authorId } = Route.useParams();
	const navigate = useNavigate();
	const graphData = useGraphData();
	const {loadEntity} = graphData;
	const {loadEntityIntoGraph} = graphData;
	const nodeCount = useGraphStore((state) => state.totalNodeCount);

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
	const rawEntityData = useRawEntityData({
		entityId: authorId,
		enabled: !!authorId
	});
	const author = rawEntityData.data;

	// Update document title with author name
	useEntityDocumentTitle(author);

	useEffect(() => {
		const loadAuthor = async () => {
			try {
				// If graph already has nodes, use incremental loading to preserve existing entities
				// This prevents clearing the graph when clicking on nodes or navigating
				if (nodeCount > 0) {
					await loadEntityIntoGraph(authorId);
				} else {
					// If graph is empty, use full loading (clears graph for initial load)
					await loadEntity(authorId);
				}
			} catch (error) {
				logError(logger, "Failed to load author", error, "AuthorRoute", "routing");
			}
		};

		void loadAuthor();
	}, [authorId, loadEntity, loadEntityIntoGraph, nodeCount]);

	// Return null - the graph is visible from MainLayout
	// The route content is just for triggering the data load
	return null;
}