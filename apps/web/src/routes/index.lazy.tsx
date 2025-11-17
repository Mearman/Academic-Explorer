import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Title,
  Text,
  Stack,
  Card,
  Button,
  Group,
  TextInput,
  Anchor,
} from "@mantine/core";
import {
  IconSearch,
  IconGraph,
  IconBrandReact,
  IconDatabase,
} from "@tabler/icons-react";
import { useState } from "react";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useDocumentTitle } from "@/hooks/use-document-title";

function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const themeColors = useThemeColors();
  const { colors } = themeColors;

  // Set home page title
  useDocumentTitle(null); // This will use the default base title "Academic Explorer"

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Navigate to autocomplete page with search query
    navigate({
      to: "/autocomplete",
      search: { q: searchQuery.trim(), filter: undefined, search: undefined },
    });
  };

  const handleExampleSearch = (query: string) => {
    // Navigate to autocomplete page with example query
    navigate({
      to: "/autocomplete",
      search: { q: query, filter: undefined, search: undefined },
    });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100%",
        padding: "clamp(0.5rem, 2vw, 2rem)",
        boxSizing: "border-box",
      }}
    >
      <Card
        shadow="xl"
        padding="xl"
        radius="lg"
        withBorder
        style={{
          backgroundColor: colors.background.blur,
          backdropFilter: "blur(10px)",
          maxWidth: "min(600px, 100%)",
          width: "100%",
        }}
      >
        <Stack gap="xl" align="center">
        <Group gap="md">
          <IconGraph size={40} color={colors.primary} />
          <Title order={1} ta="center">
            Academic Explorer
          </Title>
        </Group>

        <Text ta="center" size="lg" c="dimmed" style={{ lineHeight: 1.6, maxWidth: "100%" }}>
          Explore academic literature through interactive knowledge graphs.
          Search for papers, authors, journals, and institutions to see their
          connections.
        </Text>

        {/* Quick Search */}
        <form
          onSubmit={handleSearch}
          style={{ width: "100%", marginTop: "0.5rem" }}
        >
          <Stack gap="sm">
            <TextInput
              size="lg"
              placeholder="Search papers, authors, DOIs, ORCIDs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              leftSection={<IconSearch size={20} />}
              aria-label="Search academic literature"
            />
            <Button
              type="submit"
              size="lg"
              disabled={!searchQuery.trim()}
              fullWidth
            >
              Search & Visualize
            </Button>
          </Stack>
        </form>

        {/* Example Searches */}
        <Card padding="md" radius="md" withBorder style={{ width: "100%", marginTop: "0.5rem" }}>
          <Text size="sm" fw={500} mb="sm">
            Try these examples:
          </Text>
          <Stack gap="xs">
            <Group gap="sm" wrap="wrap">
              <Anchor
                size="sm"
                onClick={() => handleExampleSearch("machine learning")}
                style={{ cursor: "pointer" }}
              >
                machine learning
              </Anchor>
              <Text size="sm" c="dimmed">
                •
              </Text>
              <Anchor
                size="sm"
                onClick={() => handleExampleSearch("climate change")}
                style={{ cursor: "pointer" }}
              >
                climate change
              </Anchor>
              <Text size="sm" c="dimmed">
                •
              </Text>
              <Anchor
                size="sm"
                onClick={() => handleExampleSearch("0000-0003-1613-5981")}
                style={{ cursor: "pointer" }}
              >
                ORCID example
              </Anchor>
            </Group>
          </Stack>
        </Card>

        {/* Features */}
        <Stack gap="md" align="center" style={{ width: "100%", marginTop: "1rem" }}>
          <Group gap="lg" justify="center" wrap="wrap">
            <Group gap="xs">
              <IconBrandReact size={16} color={colors.primary} />
              <Text size="xs" c="dimmed">
                React 19
              </Text>
            </Group>
            <Group gap="xs">
              <IconDatabase size={16} color={colors.success} />
              <Text size="xs" c="dimmed">
                OpenAlex API
              </Text>
            </Group>
            <Group gap="xs">
              <IconGraph size={16} color={colors.entity.source} />
              <Text size="xs" c="dimmed">
                XYFlow
              </Text>
            </Group>
          </Group>

          <Text size="xs" ta="center" c="dimmed" style={{ lineHeight: 1.5, maxWidth: "90%" }}>
            Use the sidebar to search and filter • Click nodes to navigate •
            Double-click to expand relationships
          </Text>
        </Stack>
      </Stack>
    </Card>
    </div>
  );
}

export const Route = createLazyFileRoute("/")({
  component: HomePage,
});

export default HomePage;
