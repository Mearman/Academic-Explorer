import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo } from "react"
import { IconBook } from "@tabler/icons-react"
import { EntityDetector } from "@academic-explorer/graph";
import { useGraphData } from "@/hooks/use-graph-data"
import { useGraphStore } from "@/stores/graph-store"
import { logError, logger } from "@academic-explorer/utils/logger";

export const Route = createFileRoute("/sources/issn/$issn")({
	component: ISSNSourceRoute,
})

function ISSNSourceRoute() {
	const { issn } = Route.useParams()
	const navigate = useNavigate()
	const detector = useMemo(() => new EntityDetector(), [])
	const graphData = useGraphData()
	const {loadEntity} = graphData
	const {loadEntityIntoGraph} = graphData
	const nodeCount = useGraphStore((state) => state.totalNodeCount)

	useEffect(() => {
		const resolveISSN = async () => {
			try {
				// Decode the ISSN parameter
				const decodedISSN = decodeURIComponent(issn)

				// Detect and normalize the ISSN
				const detection = detector.detectEntityIdentifier(decodedISSN)

				if (detection.entityType === "sources" && detection.idType === "issn_l") {
					// If graph already has nodes, use incremental loading to preserve existing entities
					if (nodeCount > 0) {
						await loadEntityIntoGraph(`issn:${detection.normalizedId}`);
					} else {
						// If graph is empty, use full loading (clears graph for initial load)
						await loadEntity(`issn:${detection.normalizedId}`);
					}

					// No navigation needed - graph is always visible
				} else {
					throw new Error(`Invalid ISSN format: ${decodedISSN}`)
				}
			} catch (error) {
				logError(logger, "Failed to resolve ISSN:", error, "ISSNSourceRoute", "routing")
				// Navigate to search with the ISSN as query
				void navigate({
					to: "/search",
					search: { q: issn },
					replace: true,
				})
			}
		}

		void resolveISSN()
	}, [issn, navigate, detector, loadEntity, loadEntityIntoGraph, nodeCount])

	return (
		<div style={{
			padding: "40px 20px",
			textAlign: "center",
			fontSize: "16px"
		}}>
			<div style={{ marginBottom: "20px", fontSize: "18px" }}>
				<IconBook size={18} style={{ display: "inline", marginRight: "8px" }} />
        Resolving ISSN...
			</div>
			<div style={{ fontFamily: "monospace", backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
				{decodeURIComponent(issn)}
			</div>
			<div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        Loading source details and building publication graph
			</div>
		</div>
	)
}