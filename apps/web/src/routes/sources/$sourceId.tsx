import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { logError } from "@academic-explorer/shared-utils/logger";

export const Route = createFileRoute("/sources/$sourceId")({
	component: SourceRoute,
});

function SourceRoute() {
	const { sourceId } = Route.useParams();
	const graphData = useGraphData();
	const loadEntity = graphData.loadEntity;
	const loadEntityIntoGraph = graphData.loadEntityIntoGraph;
	const nodeCount = useGraphStore((state) => state.totalNodeCount);

	// Fetch entity data for title
	const rawEntityData = useRawEntityData({
		entityId: sourceId,
		enabled: !!sourceId
	});
	const source = rawEntityData.data;

	// Update document title with source name
	useEntityDocumentTitle(source);

	useEffect(() => {
		const loadSource = async () => {
			try {
				// If graph already has nodes, use incremental loading to preserve existing entities
				// This prevents clearing the graph when clicking on nodes or navigating
				if (nodeCount > 0) {
					await loadEntityIntoGraph(sourceId);
				} else {
					// If graph is empty, use full loading (clears graph for initial load)
					await loadEntity(sourceId);
				}
			} catch (error) {
				logError("Failed to load source:", error, "SourceRoute", "routing");
			}
		};

		void loadSource();
	}, [sourceId, loadEntity, loadEntityIntoGraph, nodeCount]);

	// Return null - the graph is visible from MainLayout
	// The route content is just for triggering the data load
	return null;
}