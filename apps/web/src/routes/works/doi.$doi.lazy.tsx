import { useNavigate, useParams, createLazyFileRoute } from "@tanstack/react-router"
import { useEffect } from "react"
import { IconFile } from "@tabler/icons-react"
import { EntityDetectionService } from "@academic-explorer/graph";
import { useGraphData } from "@/hooks/use-graph-data"
import { useGraphStore } from "@/stores/graph-store"
import { logError, logger } from "@academic-explorer/utils/logger";

export const Route = createLazyFileRoute("/works/doi/$doi")({
	component: DOIWorkRoute,
})

function DOIWorkRoute() {
	const { doi } = useParams({ from: "/works/doi/$doi" })
	const navigate = useNavigate()
	const graphData = useGraphData()
	const {loadEntity} = graphData
	const {loadEntityIntoGraph} = graphData
	const nodeCount = useGraphStore((state) => state.totalNodeCount)

	useEffect(() => {
		const resolveDOI = async () => {
			try {
				// Decode the DOI parameter (may have been URL encoded)
				const decodedDOI = decodeURIComponent(doi)

				// Detect and normalize the DOI
				const detection = EntityDetectionService.detectEntity(decodedDOI)

				if (detection?.entityType === "works" && detection.detectionMethod === "DOI") {
					// If graph already has nodes, use incremental loading to preserve existing entities
					if (nodeCount > 0) {
						await loadEntityIntoGraph(`doi:${detection.normalizedId}`);
					} else {
						// If graph is empty, use full loading (clears graph for initial load)
						await loadEntity(`doi:${detection.normalizedId}`);
					}

					// No navigation needed - graph is always visible
				} else {
					throw new Error(`Invalid DOI format: ${decodedDOI}`)
				}
			} catch (error) {
				logError(logger, "Failed to resolve DOI", error, "DOIWorkRoute", "routing");
				// Navigate to search with the DOI as query
				void navigate({
					to: "/search",
					search: { q: doi, filter: undefined, search: undefined },
					replace: true,
				})
			}
		}

		void resolveDOI()
	}, [doi, navigate, loadEntity, loadEntityIntoGraph, nodeCount])

	return (
		<div style={{
			padding: "40px 20px",
			textAlign: "center",
			fontSize: "16px"
		}}>
			<div style={{ marginBottom: "20px", fontSize: "18px" }}>
				<IconFile size={18} style={{ display: "inline", marginRight: "8px" }} />
        Resolving DOI...
			</div>
			<div style={{ fontFamily: "monospace", backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
				{decodeURIComponent(doi)}
			</div>
			<div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        Loading work details and building relationship graph
			</div>
		</div>
	)
}

export default DOIWorkRoute;
