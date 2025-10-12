import { useNavigate, useParams, createLazyFileRoute } from "@tanstack/react-router"
import { useEffect } from "react"
import { IconUser } from "@tabler/icons-react"
import { EntityDetectionService } from "@academic-explorer/graph";
import { useGraphData } from "@/hooks/use-graph-data"
import { useGraphStore } from "@/stores/graph-store"
import { logError, logger } from "@academic-explorer/utils/logger";

export const Route = createLazyFileRoute("/authors/orcid/$orcid")({
	component: ORCIDAuthorRoute,
})

function ORCIDAuthorRoute() {
	const { orcid } = useParams({ from: "/authors/orcid/$orcid" })
	const navigate = useNavigate()
	const graphData = useGraphData()
	const {loadEntity} = graphData
	const {loadEntityIntoGraph} = graphData
	const nodeCount = useGraphStore((state) => state.totalNodeCount)

	useEffect(() => {
		const resolveORCID = async () => {
			try {
				// Decode the ORCID parameter
				const decodedORCID = decodeURIComponent(orcid)

				// Detect and normalize the ORCID
				const detection = EntityDetectionService.detectEntity(decodedORCID)

				if (!detection) {
					throw new Error(`Unable to detect entity from ORCID: ${decodedORCID}`)
				}

				if (detection.entityType === "authors") {
					// If graph already has nodes, use incremental loading to preserve existing entities
					if (nodeCount > 0) {
						await loadEntityIntoGraph(detection.normalizedId);
					} else {
						// If graph is empty, use full loading (clears graph for initial load)
						await loadEntity(detection.normalizedId);
					}

					// No navigation needed - graph is always visible
				} else {
					throw new Error(`Expected author entity but detected ${detection.entityType}: ${decodedORCID}`)
				}
			} catch (error) {
				logError(logger, "Failed to resolve ORCID:", error, "ORCIDAuthorRoute", "routing")
				// Navigate to search with the ORCID as query
				void navigate({
					to: "/search",
					search: { q: orcid, filter: undefined, search: undefined },
					replace: true,
				})
			}
		}

		void resolveORCID()
	}, [orcid, navigate, loadEntity, loadEntityIntoGraph, nodeCount])

	return (
		<div style={{
			padding: "40px 20px",
			textAlign: "center",
			fontSize: "16px"
		}}>
			<div style={{ marginBottom: "20px", fontSize: "18px" }}>
				<IconUser size={18} style={{ display: "inline", marginRight: "8px" }} />
        Resolving ORCID...
			</div>
			<div style={{ fontFamily: "monospace", backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
				{decodeURIComponent(orcid)}
			</div>
			<div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        Loading author details and building collaboration graph
			</div>
		</div>
	)
}

export default ORCIDAuthorRoute;
