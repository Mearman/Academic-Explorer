import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { logError } from "@/lib/logger";

export const Route = createFileRoute("/sources/$sourceId")({
	component: SourceRoute,
});

function SourceRoute() {
	const { sourceId } = Route.useParams();
	const { loadEntity, loadEntityIntoGraph } = useGraphData();
	const { nodes } = useGraphStore();

	useEffect(() => {
		const loadSource = async () => {
			try {
				// If graph already has nodes, use incremental loading to preserve existing entities
				// This prevents clearing the graph when clicking on nodes or navigating
				if (nodes.size > 0) {
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
	}, [sourceId, loadEntity, loadEntityIntoGraph, nodes.size]);

	// Return null - the graph is visible from MainLayout
	// The route content is just for triggering the data load
	return null;
}