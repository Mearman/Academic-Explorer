import { createFileRoute } from "@tanstack/react-router"
import { GraphWithRealAPI } from "@/components/layout/GraphWithRealAPI"

export const Route = createFileRoute("/api-test")({
	component: APITestPage,
})

function APITestPage() {
	return (
		<div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
			<div style={{
				padding: "16px 24px",
				background: "#1f2937",
				color: "white"
			}}>
				<h1 style={{ margin: 0, fontSize: "20px" }}>
          OpenAlex API Integration Test
				</h1>
				<p style={{ margin: "4px 0 0 0", fontSize: "14px", opacity: 0.8 }}>
          Testing real OpenAlex API calls with graph visualization
				</p>
			</div>

			<div style={{ flex: 1 }}>
				<GraphWithRealAPI />
			</div>
		</div>
	)
}