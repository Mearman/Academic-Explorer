import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { logError, logger } from "@academic-explorer/utils/logger";
import { EntityDetector } from "@academic-explorer/graph";

export const Route = createFileRoute("/institutions/$institutionId")({
	component: InstitutionRoute,
});

function InstitutionRoute() {
	const { institutionId } = Route.useParams();
	const navigate = useNavigate();
	const graphData = useGraphData();
	const {loadEntity} = graphData;
	const {loadEntityIntoGraph} = graphData;
	const nodeCount = useGraphStore((state) => state.totalNodeCount);

	// Check if ID needs normalization and redirect if necessary
	useEffect(() => {
		if (!institutionId) return;

		const detector = new EntityDetector();
		const detection = detector.detectEntityIdentifier(institutionId);

		// If ID was normalized and is different from input, redirect
		if (detection.normalizedId && detection.normalizedId !== institutionId) {
			logger.debug("routing", "Redirecting to normalized institution ID", {
				originalId: institutionId,
				normalizedId: detection.normalizedId
			}, "InstitutionRoute");

			// Replace current URL with normalized version, preserving query params
			void navigate({
				to: "/institutions/$institutionId",
				params: { institutionId: detection.normalizedId },
				search: (prev) => prev, // Preserve existing search params
				replace: true
			});
			return;
		}
	}, [institutionId, navigate]);

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
				logError(logger, "Failed to load institution", error, "InstitutionRoute", "routing");
			}
		};

		void loadInstitution();
	}, [institutionId, loadEntity, loadEntityIntoGraph, nodeCount]);

	// Return null - the graph is visible from MainLayout
	// The route content is just for triggering the data load
	return null;
}