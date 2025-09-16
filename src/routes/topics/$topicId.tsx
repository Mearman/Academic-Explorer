import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { logError } from "@/lib/logger";

export const Route = createFileRoute("/topics/$topicId")({
	component: TopicRoute,
});

function TopicRoute() {
	const { topicId } = Route.useParams();
	const graphData = useGraphData();
	const loadEntity = graphData.loadEntity;
	const loadEntityIntoGraph = graphData.loadEntityIntoGraph;
	const nodeCount = useGraphStore((state) => Object.keys(state.nodes).length);

	// Fetch entity data for title
	const rawEntityData = useRawEntityData({
		entityId: topicId,
		enabled: !!topicId
	});
	const topic = rawEntityData.data;

	// Update document title with topic name
	useEntityDocumentTitle(topic);

	useEffect(() => {
		const loadTopic = async () => {
			try {
				// If graph already has nodes, use incremental loading to preserve existing entities
				// This prevents clearing the graph when clicking on nodes or navigating
				if (nodeCount > 0) {
					await loadEntityIntoGraph(topicId);
				} else {
					// If graph is empty, use full loading (clears graph for initial load)
					await loadEntity(topicId);
				}
			} catch (error) {
				logError("Failed to load topic:", error, "TopicRoute", "routing");
			}
		};

		void loadTopic();
	}, [topicId, loadEntity, loadEntityIntoGraph, nodeCount]);

	// Return null - the graph is visible from MainLayout
	// The route content is just for triggering the data load
	return null;
}