import { createFileRoute } from "@tanstack/react-router"
import { Card, Title, Text, Stack, Button } from "@mantine/core"
import { IconGraph } from "@tabler/icons-react"
import { useNavigate } from "@tanstack/react-router"

export const Route = createFileRoute("/graph")({
	component: GraphDemo,
})

function GraphDemo() {
	const navigate = useNavigate()

	return (
		<Card
			shadow="xl"
			padding="xl"
			radius="lg"
			withBorder
			style={{
				backgroundColor: "rgba(255, 255, 255, 0.95)",
				backdropFilter: "blur(10px)",
				maxWidth: "500px",
			}}
		>
			<Stack gap="lg" align="center">
				<IconGraph size={60} color="var(--mantine-color-blue-6)" />

				<Title order={1} ta="center">
          Graph Demo (Legacy)
				</Title>

				<Text ta="center" size="lg" c="dimmed">
          This was the old graph demo page. The graph navigation is now the primary UI of the entire application!
				</Text>

				<Text ta="center" c="dimmed">
          Try navigating to a specific entity or searching from the sidebar to see the graph in action.
				</Text>

				<Button
					onClick={() => navigate({ to: "/" })}
					size="lg"
				>
          Go to Main Graph View
				</Button>
			</Stack>
		</Card>
	)
}