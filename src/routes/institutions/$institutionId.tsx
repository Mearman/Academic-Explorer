import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { logError } from "@/lib/logger";

export const Route = createFileRoute("/institutions/$institutionId")({
	component: InstitutionRoute,
});

function InstitutionRoute() {
	const { institutionId } = Route.useParams();
	const { loadEntity, loadEntityIntoGraph } = useGraphData();
	const { nodes } = useGraphStore();

	useEffect(() => {
		const loadInstitution = async () => {
			try {
				// If graph already has nodes, use incremental loading to preserve existing entities
				// This prevents clearing the graph when clicking on nodes or navigating
				if (nodes.size > 0) {
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
	}, [institutionId, loadEntity, loadEntityIntoGraph, nodes.size]);

	// Return null - the graph is visible from MainLayout
	// The route content is just for triggering the data load
	return null;
}