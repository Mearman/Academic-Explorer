import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { IconSearch } from "@tabler/icons-react"
import { EntityDetectionService } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";

export const Route = createFileRoute("/api/openalex/org/$")({
	component: ApiOpenAlexRoute,
})

function ApiOpenAlexRoute() {
	const { _splat } = Route.useParams()
	const navigate = useNavigate()

	useEffect(() => {
		const resolveApiUrl = () => {
			try {
				if (!_splat) {
					throw new Error("No URL path provided")
				}

				const fullUrl = `https://api.openalex.org/${_splat}`
				const detection = EntityDetectionService.detectEntity(fullUrl)

				if (detection?.entityType && detection.detectionMethod.includes("OpenAlex")) {
					const entityRoute = `/${detection.entityType}/${detection.normalizedId}`
					void navigate({
						to: entityRoute,
						replace: true,
					})
				} else {
					void navigate({
						to: `/${encodeURIComponent(fullUrl)}`,
						replace: true,
					})
				}
			} catch (error) {
				logError(logger, "Failed to resolve API URL:", error, "ApiOpenAlexRoute", "routing")
				void navigate({
					to: "/search",
					search: { q: _splat },
					replace: true,
				})
			}
		}

		resolveApiUrl()
	}, [_splat, navigate])

	return (
		<div style={{
			padding: "40px 20px",
			textAlign: "center",
			fontSize: "16px"
		}}>
			<div style={{ marginBottom: "20px", fontSize: "18px" }}>
				<IconSearch size={18} style={{ display: "inline", marginRight: "8px" }} />
				Resolving API URL...
			</div>
			<div style={{ fontFamily: "monospace", backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
				api.openalex.org/{decodeURIComponent(_splat ?? "")}
			</div>
			<div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
				Detecting entity type and redirecting
			</div>
		</div>
	)
}