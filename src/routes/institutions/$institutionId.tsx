import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { logError } from "@/lib/logger";

export const Route = createFileRoute("/institutions/$institutionId")({
	component: InstitutionRoute,
});

function InstitutionRoute() {
	const { institutionId } = Route.useParams();
	const graphData = useGraphData();
	const loadEntity = graphData.loadEntity;
	const loadEntityIntoGraph = graphData.loadEntityIntoGraph;
	const nodeCount = useGraphStore((state) => Object.keys(state.nodes).length);

	// Fetch entity data for title
	const rawEntityData = useRawEntityData({
		entityId: institutionId,
		enabled: !!institutionId
	});
	const institution = rawEntityData.data;

	// Update document title with institution name
	useEntityDocumentTitle(institution);

	useEffect(() => {
		const loadInstitution = async () => {
			try {
				// If graph already has nodes, use incremental loading to preserve existing entities
				// This prevents clearing the graph when clicking on nodes or navigating
				if (nodeCount > 0) {
					await loadEntityIntoGraph(institutionId);
				} else {
					// If graph is empty, use full loading (clears graph for initial load)
					await loadEntity(institutionId);
				}
			} catch (error) {
				logError("Failed to load institution", error, "InstitutionRoute", "routing");
			}
		};

		void loadInstitution();
	}, [institutionId, loadEntity, loadEntityIntoGraph, nodeCount]);

	// Return null - the graph is visible from MainLayout
	// The route content is just for triggering the data load
	return null;
}