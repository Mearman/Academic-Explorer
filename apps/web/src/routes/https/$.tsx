import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo } from "react"
import { IconSearch } from "@tabler/icons-react"
import { EntityDetector } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";

export const Route = createFileRoute("/https/$")({
	component: HttpsRoute,
})

function HttpsRoute() {
	const { _splat } = Route.useParams()
	const navigate = useNavigate()
	const detector = useMemo(() => new EntityDetector(), [])

	useEffect(() => {
		const resolveHttpsUrl = () => {
			try {
				// Check if splat parameter exists
				if (!_splat) {
					throw new Error("No URL path provided")
				}

				// Reconstruct the full URL from the splat parameter
				const fullUrl = `https://${_splat}`

				// Detect entity type and ID from the URL
				const detection = detector.detectEntityIdentifier(fullUrl)

				if (detection.entityType && detection.idType === "openalex") {
					// This is an OpenAlex URL, redirect to direct entity route
					const entityRoute = `/${detection.entityType}/${detection.normalizedId}`

					void navigate({
						to: entityRoute,
						replace: true,
					})
				} else {
					// Fallback to external ID route for further processing
					void navigate({
						to: `/${encodeURIComponent(fullUrl)}`,
						replace: true,
					})
				}
			} catch (error) {
				logError(logger, "Failed to resolve HTTPS URL:", error, "HttpsRoute", "routing")

				// Fallback to search
				void navigate({
					to: "/search",
					search: { q: _splat },
					replace: true,
				})
			}
		}

		resolveHttpsUrl()
	}, [_splat, navigate, detector])

	return (
		<div style={{
			padding: "40px 20px",
			textAlign: "center",
			fontSize: "16px"
		}}>
			<div style={{ marginBottom: "20px", fontSize: "18px" }}>
				<IconSearch size={18} style={{ display: "inline", marginRight: "8px" }} />
				Resolving HTTPS URL...
			</div>
			<div style={{ fontFamily: "monospace", backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
				https://{decodeURIComponent(_splat ?? "")}
			</div>
			<div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
				Detecting entity type and redirecting
			</div>
		</div>
	)
}