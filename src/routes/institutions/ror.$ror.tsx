import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo } from "react"
import { IconBuilding } from "@tabler/icons-react"
import { EntityDetector } from "@/lib/graph/utils/entity-detection"
import { useGraphData } from "@/hooks/use-graph-data"
import { useGraphStore } from "@/stores/graph-store"
import { logError } from "@/lib/logger"

export const Route = createFileRoute("/institutions/ror/$ror")({
	component: RORInstitutionRoute,
})

function RORInstitutionRoute() {
	const { ror } = Route.useParams()
	const navigate = useNavigate()
	const detector = useMemo(() => new EntityDetector(), [])
	const graphData = useGraphData()
	const loadEntity = graphData.loadEntity
	const loadEntityIntoGraph = graphData.loadEntityIntoGraph
	const nodeCount = useGraphStore((state) => state.totalNodeCount)

	useEffect(() => {
		const resolveROR = async () => {
			try {
				// Decode the ROR parameter
				const decodedROR = decodeURIComponent(ror)

				// Detect and normalize the ROR ID
				const detection = detector.detectEntityIdentifier(decodedROR)

				if (detection.entityType === "institutions" && detection.idType === "ror") {
					// If graph already has nodes, use incremental loading to preserve existing entities
					if (nodeCount > 0) {
						await loadEntityIntoGraph(`ror:${detection.normalizedId}`);
					} else {
						// If graph is empty, use full loading (clears graph for initial load)
						await loadEntity(`ror:${detection.normalizedId}`);
					}

					// No navigation needed - graph is always visible
				} else {
					throw new Error(`Invalid ROR ID format: ${decodedROR}`)
				}
			} catch (error) {
				logError("Failed to resolve ROR ID", error, "RORInstitutionRoute", "routing");
				// Navigate to search with the ROR ID as query
				void navigate({
					to: "/search",
					search: { q: ror },
					replace: true,
				})
			}
		}

		void resolveROR()
	}, [ror, navigate, detector, loadEntity, loadEntityIntoGraph, nodeCount])

	return (
		<div style={{
			padding: "40px 20px",
			textAlign: "center",
			fontSize: "16px"
		}}>
			<div style={{ marginBottom: "20px", fontSize: "18px" }}>
				<IconBuilding size={18} style={{ display: "inline", marginRight: "8px" }} />
        Resolving ROR ID...
			</div>
			<div style={{ fontFamily: "monospace", backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
				{decodeURIComponent(ror)}
			</div>
			<div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        Loading institution details and building affiliation graph
			</div>
		</div>
	)
}