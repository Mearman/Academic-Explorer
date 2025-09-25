import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { logError, logger } from "@academic-explorer/utils/logger";
import { EntityDetector } from "@academic-explorer/graph";

export const Route = createFileRoute("/authors/$authorId")({
	component: AuthorRoute,
});

function AuthorRoute() {
	const { authorId } = Route.useParams();
	// const navigate = useNavigate();

	// DEBUGGING: Disable all hooks to isolate infinite loop source
	// const graphData = useGraphData();
	// const { setProvider } = useGraphStore();
	// const rawEntityData = useRawEntityData(authorId);
	// useEntityDocumentTitle(rawEntityData.data);

	logger.debug("route", "Author route loading with minimal hooks", { authorId });

	// DEBUGGING: Disable useEffect to see if that's causing loops
	// useEffect(() => {
	//   ... all effect logic disabled
	// }, []);

	// Return simple debug info
	return (
		<div style={{
			position: "fixed",
			top: "20px",
			right: "20px",
			background: "white",
			padding: "10px",
			border: "1px solid #ccc",
			borderRadius: "4px",
			zIndex: 1000
		}}>
			<p>Author Route: {authorId}</p>
			<p>All hooks disabled for debugging</p>
		</div>
	);
}