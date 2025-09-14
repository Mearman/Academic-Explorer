import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo } from "react"
import { IconFile } from "@tabler/icons-react"
import { EntityDetector } from "@/lib/graph/utils/entity-detection"
import { useGraphData } from "@/hooks/use-graph-data"
import { logError } from "@/lib/logger"

export const Route = createFileRoute("/works/doi/$doi")({
	component: DOIWorkRoute,
})

function DOIWorkRoute() {
	const { doi } = Route.useParams()
	const navigate = useNavigate()
	const detector = useMemo(() => new EntityDetector(), [])
	const { loadEntity } = useGraphData()

	useEffect(() => {
		const resolveDOI = async () => {
			try {
				// Decode the DOI parameter (may have been URL encoded)
				const decodedDOI = decodeURIComponent(doi)

				// Detect and normalize the DOI
				const detection = detector.detectEntityIdentifier(decodedDOI)

				if (detection.entityType === "works" && detection.idType === "doi") {
					// Load the work entity data into the graph
					await loadEntity(`doi:${detection.normalizedId}`)

					// No navigation needed - graph is always visible
				} else {
					throw new Error(`Invalid DOI format: ${decodedDOI}`)
				}
			} catch (error) {
				logError("Failed to resolve DOI", error, "DOIWorkRoute", "routing");
				// Navigate to search with the DOI as query
				void navigate({
					to: "/search",
					search: { q: doi },
					replace: true,
				})
			}
		}

		void resolveDOI()
	}, [doi, navigate, detector, loadEntity])

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