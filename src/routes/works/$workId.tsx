import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { logError } from "@/lib/logger";

export const Route = createFileRoute("/works/$workId")({
	component: WorkRoute,
});

function WorkRoute() {
	const { workId } = Route.useParams();
	const { loadEntity, loadEntityIntoGraph } = useGraphData();
	const { nodes } = useGraphStore();

	// Fetch entity data for title
	const { data: work } = useRawEntityData({
		entityId: workId,
		enabled: !!workId
	});

	// Update document title with work name
	useEntityDocumentTitle(work);

	useEffect(() => {
		const loadWork = async () => {
			try {
				// If graph already has nodes, use incremental loading to preserve existing entities
				// This prevents clearing the graph when clicking on nodes or navigating
				if (nodes.size > 0) {
					await loadEntityIntoGraph(workId);
				} else {
					// If graph is empty, use full loading (clears graph for initial load)
					await loadEntity(workId);
				}
			} catch (error) {
				logError("Failed to load work", error, "WorkRoute", "routing");
			}
		};

		void loadWork();
	}, [workId, loadEntity, loadEntityIntoGraph, nodes.size]);

	// Return null - the graph is visible from MainLayout
	// The route content is just for triggering the data load
	return null;
}