import { createFileRoute } from "@tanstack/react-router";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { logger } from "@academic-explorer/utils/logger";

export const Route = createFileRoute("/authors/$authorId")({
	component: AuthorRoute,
});

function AuthorRoute() {
	const { authorId } = Route.useParams();
	// const navigate = useNavigate();

	// DEBUGGING: Systematically re-enable hooks one by one
	// Step 1: ✅ useGraphStore works fine
	const { setProvider } = useGraphStore();
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const _ = setProvider; // Placeholder to prevent ESLint warning

	// Step 2: Re-enable useRawEntityData (entity data fetching)
	const rawEntityData = useRawEntityData({ entityId: authorId });

	// Step 3: Testing useEntityDocumentTitle hook
	useEntityDocumentTitle(rawEntityData.data);

	// Step 4: ✅ Testing refactored useGraphData (no worker dependency)
	const graphData = useGraphData();
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const _unused = graphData; // Placeholder to prevent ESLint warning

	logger.debug("route", "Author route loading with raw data display", {
		authorId,
		hasEntityData: !!rawEntityData.data,
		isLoading: rawEntityData.isLoading,
		error: rawEntityData.error
	});

	// Show loading state
	if (rawEntityData.isLoading) {
		return (
			<div style={{ padding: "20px", textAlign: "center" }}>
				<h2>Loading Author Data...</h2>
				<p>Author ID: {authorId}</p>
			</div>
		);
	}

	// Show error state
	if (rawEntityData.error) {
		return (
			<div style={{ padding: "20px", textAlign: "center", color: "red" }}>
				<h2>Error Loading Author</h2>
				<p>Author ID: {authorId}</p>
				<p>Error: {String(rawEntityData.error)}</p>
			</div>
		);
	}

	// Show raw data
	return (
		<div style={{ padding: "20px", maxWidth: "100vw", overflow: "auto" }}>
			<h1>Author Data</h1>
			<p><strong>ID:</strong> {authorId}</p>

			{rawEntityData.data ? (
				<div>
					<h2>Raw Author Data:</h2>
					<pre style={{
						background: "#f5f5f5",
						padding: "15px",
						borderRadius: "5px",
						overflow: "auto",
						fontSize: "12px",
						border: "1px solid #ddd"
					}}>
						{JSON.stringify(rawEntityData.data, null, 2)}
					</pre>
				</div>
			) : (
				<p>No data available</p>
			)}
		</div>
	);
}