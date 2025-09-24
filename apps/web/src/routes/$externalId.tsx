import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo } from "react"
import {
	IconSearch,
} from "@tabler/icons-react"
import { EntityDetector } from "@academic-explorer/graph";
import { useGraphData } from "@/hooks/use-graph-data"
import { useGraphStore } from "@/stores/graph-store"
import { logError, logger } from "@academic-explorer/utils/logger";

export const Route = createFileRoute("/$externalId")({
	component: ExternalIdRoute,
})

function ExternalIdRoute() {
	const { externalId } = Route.useParams()
	const navigate = useNavigate()
	const detector = useMemo(() => new EntityDetector(), [])
	const graphData = useGraphData()
	const {loadEntity} = graphData
	const {loadEntityIntoGraph} = graphData
	const nodeCount = useGraphStore((state) => state.totalNodeCount)

	useEffect(() => {
		const resolveExternalId = async () => {
			try {
				// Decode the parameter
				const decodedId = decodeURIComponent(externalId)


				// Detect entity type and ID type
				const detection = detector.detectEntityIdentifier(decodedId)

				if (detection.entityType && detection.idType !== "openalex") {
					// This is a recognized external ID, redirect to specific route
					let specificRoute: string

					switch (detection.idType) {
						case "doi":
							specificRoute = `/works/doi/${encodeURIComponent(detection.normalizedId)}`
							break
						case "orcid":
							specificRoute = `/authors/orcid/${detection.normalizedId}`
							break
						case "ror":
							specificRoute = `/institutions/ror/${detection.normalizedId}`
							break
						case "issn_l":
							specificRoute = `/sources/issn/${detection.normalizedId}`
							break
						default:
							throw new Error(`Unsupported ID type: ${detection.idType}`)
					}

					void navigate({
						to: specificRoute,
						replace: true,
					})
				} else if (detection.entityType && detection.idType === "openalex") {
					// This is an OpenAlex ID, navigate to specific entity route
					const {entityType} = detection;
					const entityRoute = `/${entityType}/${detection.normalizedId}`;

					void navigate({
						to: entityRoute,
						replace: true,
					});
				} else if (detection.entityType) {
					// This is some other external ID, load directly
					// If graph already has nodes, use incremental loading to preserve existing entities
					if (nodeCount > 0) {
						await loadEntityIntoGraph(detection.normalizedId);
					} else {
						// If graph is empty, use full loading (clears graph for initial load)
						await loadEntity(detection.normalizedId);
					}
				} else {
					throw new Error(`Unable to detect entity type for: ${decodedId}`)
				}
			} catch (error) {
				logError(logger, "Failed to resolve external ID:", error, "ExternalIdRoute", "routing")

				// Fallback to search
				void navigate({
					to: "/search",
					search: { q: externalId },
					replace: true,
				})
			}
		}

		void resolveExternalId()
	}, [externalId, navigate, detector, loadEntity, loadEntityIntoGraph, nodeCount])

	return (
		<div style={{
			padding: "40px 20px",
			textAlign: "center",
			fontSize: "16px"
		}}>
			<div style={{ marginBottom: "20px", fontSize: "18px" }}>
				<IconSearch size={18} style={{ display: "inline", marginRight: "8px" }} />
        Resolving identifier...
			</div>
			<div style={{ fontFamily: "monospace", backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
				{decodeURIComponent(externalId)}
			</div>
			<div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        Detecting entity type and loading data
			</div>
		</div>
	)
}
