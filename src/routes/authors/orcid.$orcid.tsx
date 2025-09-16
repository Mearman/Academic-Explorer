import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo } from "react"
import { IconUser } from "@tabler/icons-react"
import { EntityDetector } from "@/lib/graph/utils/entity-detection"
import { useGraphData } from "@/hooks/use-graph-data"
import { useGraphStore } from "@/stores/graph-store"
import { logError } from "@/lib/logger"

export const Route = createFileRoute("/authors/orcid/$orcid")({
	component: ORCIDAuthorRoute,
})

function ORCIDAuthorRoute() {
	const { orcid } = Route.useParams()
	const navigate = useNavigate()
	const detector = useMemo(() => new EntityDetector(), [])
	const graphData = useGraphData()
	const loadEntity = graphData.loadEntity
	const loadEntityIntoGraph = graphData.loadEntityIntoGraph
	const nodeCount = useGraphStore((state) => state.totalNodeCount)

	useEffect(() => {
		const resolveORCID = async () => {
			try {
				// Decode the ORCID parameter
				const decodedORCID = decodeURIComponent(orcid)

				// Detect and normalize the ORCID
				const detection = detector.detectEntityIdentifier(decodedORCID)

				if (detection.entityType === "authors" && detection.idType === "orcid") {
					// If graph already has nodes, use incremental loading to preserve existing entities
					if (nodeCount > 0) {
						await loadEntityIntoGraph(`orcid:${detection.normalizedId}`);
					} else {
						// If graph is empty, use full loading (clears graph for initial load)
						await loadEntity(`orcid:${detection.normalizedId}`);
					}

					// No navigation needed - graph is always visible
				} else {
					throw new Error(`Invalid ORCID format: ${decodedORCID}`)
				}
			} catch (error) {
				logError("Failed to resolve ORCID:", error, "ORCIDAuthorRoute", "routing")
				// Navigate to search with the ORCID as query
				void navigate({
					to: "/search",
					search: { q: orcid },
					replace: true,
				})
			}
		}

		void resolveORCID()
	}, [orcid, navigate, detector, loadEntity, loadEntityIntoGraph, nodeCount])

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