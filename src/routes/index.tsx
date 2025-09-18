import { createFileRoute } from "@tanstack/react-router"
import { Title, Text, Stack, Card, Button, Group, TextInput, Anchor } from "@mantine/core"
import { IconSearch, IconGraph, IconBrandReact, IconDatabase } from "@tabler/icons-react"
import { useState } from "react"
import { useGraphData } from "@/hooks/use-graph-data"
import { useThemeColors } from "@/hooks/use-theme-colors"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { pageTitle } from "../styles/layout.css"
import { logError } from "@/lib/logger"

function HomePage() {
	const [searchQuery, setSearchQuery] = useState("")
	const graphData = useGraphData();
	const search = graphData.search;
	const isLoading = graphData.isLoading;
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	// Set home page title
	useDocumentTitle(null) // This will use the default base title "Academic Explorer"

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!searchQuery.trim()) return

		try {
			await search(searchQuery, {
				entityTypes: ["works", "authors", "sources", "institutions"],
				limit: 15,
			})
		} catch (error) {
			logError("Search failed", error, "HomePage", "search");
		}
	}

	const handleExampleSearch = async (query: string) => {
		setSearchQuery(query)
		try {
			await search(query, {
				entityTypes: ["works", "authors", "sources", "institutions"],
				limit: 15,
			})
		} catch (error) {
			logError("Example search failed", error, "HomePage", "search");
		}
	}

	return (
		<Card
			shadow="xl"
			padding="xl"
			radius="lg"
			withBorder
			style={{
				backgroundColor: colors.background.blur,
				backdropFilter: "blur(10px)",
				maxWidth: "600px",
			}}
		>
			<Stack gap="lg" align="center">
				<Group>
					<IconGraph size={40} color={colors.primary} />
					<Title order={1} className={pageTitle} ta="center">
            Academic Explorer
					</Title>
				</Group>

				<Text ta="center" size="lg" c="dimmed" style={{ lineHeight: 1.5 }}>
          Explore academic literature through interactive knowledge graphs.
          Search for papers, authors, journals, and institutions to see their connections.
				</Text>

				{/* Quick Search */}
				<form onSubmit={(e) => { void handleSearch(e); }} style={{ width: "100%" }}>
					<Stack gap="md">
						<TextInput
							size="lg"
							placeholder="Search papers, authors, DOIs, ORCIDs..."
							value={searchQuery}
							onChange={(e) => { setSearchQuery(e.target.value); }}
							leftSection={<IconSearch size={20} />}
							disabled={isLoading}
							aria-label="Search academic literature"
						/>
						<Button
							type="submit"
							size="lg"
							loading={isLoading}
							disabled={!searchQuery.trim()}
							fullWidth
						>
              Search & Visualize
						</Button>
					</Stack>
				</form>

				{/* Example Searches */}
				<Card padding="md" radius="md" withBorder style={{ width: "100%" }}>
					<Text size="sm" fw={500} mb="xs">Try these examples:</Text>
					<Stack gap="xs">
						<Group gap="xs" wrap="wrap">
							<Anchor
								size="sm"
								onClick={() => { void handleExampleSearch("machine learning"); }}
								style={{ cursor: "pointer" }}
							>
                machine learning
							</Anchor>
							<Text size="sm" c="dimmed">•</Text>
							<Anchor
								size="sm"
								onClick={() => { void handleExampleSearch("climate change"); }}
								style={{ cursor: "pointer" }}
							>
                climate change
							</Anchor>
							<Text size="sm" c="dimmed">•</Text>
							<Anchor
								size="sm"
								onClick={() => { void handleExampleSearch("0000-0003-1613-5981"); }}
								style={{ cursor: "pointer" }}
							>
                ORCID example
							</Anchor>
						</Group>
					</Stack>
				</Card>

				{/* Features */}
				<Stack gap="sm" align="center" style={{ width: "100%" }}>
					<Group gap="lg" justify="center">
						<Group gap="xs">
							<IconBrandReact size={16} color={colors.primary} />
							<Text size="xs" c="dimmed">React 19</Text>
						</Group>
						<Group gap="xs">
							<IconDatabase size={16} color={colors.success} />
							<Text size="xs" c="dimmed">OpenAlex API</Text>
						</Group>
						<Group gap="xs">
							<IconGraph size={16} color={colors.entity.source} />
							<Text size="xs" c="dimmed">XYFlow</Text>
						</Group>
					</Group>

					<Text size="xs" ta="center" c="dimmed" style={{ lineHeight: 1.4 }}>
            Use the sidebar to search and filter • Click nodes to navigate • Double-click to expand relationships
					</Text>
				</Stack>
			</Stack>
		</Card>
	)
}

export const Route = createFileRoute("/")({
	component: HomePage,
})