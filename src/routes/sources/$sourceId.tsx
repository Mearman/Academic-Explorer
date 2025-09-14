import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { logError } from "@/lib/logger";

export const Route = createFileRoute("/sources/$sourceId")({
	component: SourceRoute,
});

function SourceRoute() {
	const { sourceId } = Route.useParams();
	const { loadEntity } = useGraphData();

	useEffect(() => {
		const loadSource = async () => {
			try {
				// Load source entity into the graph
				await loadEntity(sourceId);
			} catch (error) {
				logError("Failed to load source:", error, "SourceRoute", "routing");
			}
		};

		void loadSource();
	}, [sourceId, loadEntity]);

	// Return null - the graph is visible from MainLayout
	// The route content is just for triggering the data load
	return null;
}