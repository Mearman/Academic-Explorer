import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { logError, logger } from "@academic-explorer/utils/logger";
import { EntityDetectionService } from "@academic-explorer/graph";

export const Route = createFileRoute("/works/$workId")({
	component: WorkRoute,
});

function WorkRoute() {
	const { workId } = Route.useParams();
	const navigate = useNavigate();
	const graphData = useGraphData();
	const {loadEntity} = graphData;
	const {loadEntityIntoGraph} = graphData;
	const nodeCount = useGraphStore((state) => state.totalNodeCount);

	// Check if ID needs normalization and redirect if necessary
	useEffect(() => {
		if (!workId) return;

		const detection = EntityDetectionService.detectEntity(workId);

		// If ID was normalized and is different from input, redirect
		if (detection?.normalizedId && detection.normalizedId !== workId) {
			logger.debug("routing", "Redirecting to normalized work ID", {
				originalId: workId,
				normalizedId: detection.normalizedId
			}, "WorkRoute");

			// Replace current URL with normalized version, preserving query params
			void navigate({
				to: "/works/$workId",
				params: { workId: detection.normalizedId },
				search: (prev) => prev, // Preserve existing search params
				replace: true
			});
			return;
		}
	}, [workId, navigate]);

	// Fetch entity data for title
	const rawEntityDataResult = useRawEntityData({
		entityId: workId,
		enabled: !!workId
	});
	const work = rawEntityDataResult.data;

	// Update document title with work name
	useEntityDocumentTitle(work);

	useEffect(() => {
		const loadWork = async () => {
			try {
				// If graph already has nodes, use incremental loading to preserve existing entities
				// This prevents clearing the graph when clicking on nodes or navigating
				if (nodeCount > 0) {
					await loadEntityIntoGraph(workId);
				} else {
					// If graph is empty, use full loading (clears graph for initial load)
					await loadEntity(workId);
				}
			} catch (error) {
				logError(logger, "Failed to load work", error, "WorkRoute", "routing");
			}
		};

		void loadWork();
	}, [workId, loadEntity, loadEntityIntoGraph, nodeCount]);

	// Return null - the graph is visible from MainLayout
	// The route content is just for triggering the data load
	return null;
}