import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { logError } from "@/lib/logger";

export const Route = createFileRoute("/authors/$authorId")({
	component: AuthorRoute,
});

function AuthorRoute() {
	const { authorId } = Route.useParams();
	const graphData = useGraphData();
	const loadEntity = graphData.loadEntity;
	const loadEntityIntoGraph = graphData.loadEntityIntoGraph;
	const expandNode = graphData.expandNode;
	const nodeCount = useGraphStore((state) => Object.keys(state.nodes).length);

	// Fetch entity data for title
	const rawEntityDataResult = useRawEntityData({
		entityId: authorId,
		enabled: !!authorId
	});
	const author = rawEntityDataResult.data;

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

					// For initial author page load, automatically expand to show works
					// This ensures users see a full graph when directly visiting an author URL
					const authorNodeId = `https://openalex.org/${authorId}`;
					await expandNode(authorNodeId);
				}
			} catch (error) {
				logError("Failed to load author", error, "AuthorRoute", "routing");
			}
		};

		void loadAuthor();
	}, [authorId, loadEntity, loadEntityIntoGraph, expandNode, nodeCount]);

	// Return null - the graph is visible from MainLayout
	// The route content is just for triggering the data load
	return null;
}