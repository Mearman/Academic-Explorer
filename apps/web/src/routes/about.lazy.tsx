import { createLazyFileRoute } from "@tanstack/react-router";
import {
  Title,
  Text,
  Stack,
  List,
  Card,
  Badge,
  Group,
  Divider,
} from "@mantine/core";
import { useThemeColors } from "@/hooks/use-theme-colors";

import { pageTitle, pageDescription } from "../styles/layout.css";

function AboutPage() {
  const themeColors = useThemeColors();
  const { colors } = themeColors;
  const techStack = [
    { name: "React", version: "19.1.1", color: "blue" },
    { name: "TypeScript", version: "5.8.3", color: "blue" },
    { name: "TanStack Router", version: "1.131.41", color: "green" },
    { name: "TanStack Query", version: "5.87.4", color: "green" },
    { name: "Mantine", version: "8.3.1", color: "violet" },
    { name: "Vanilla Extract", version: "1.17.4", color: "orange" },
    { name: "Vite", version: "7.1.5", color: "yellow" },
  ];

  return (
    <Card
      shadow="xl"
      padding="xl"
      radius="lg"
      withBorder
      style={{
        backgroundColor: colors.background.blur,
        backdropFilter: "blur(10px)",
        maxWidth: "800px",
      }}
    >
      <Stack gap="xl">
        <div>
          <Title order={1} className={pageTitle} ta="center">
            About Academic Explorer
          </Title>
          <Text className={pageDescription}>
            A PhD research project focused on academic literature exploration
            and analysis using modern web technologies and the OpenAlex API.
          </Text>
        </div>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            Research Focus
          </Title>
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
            This project explores innovative methods for capturing and analyzing
            cultural heritage data, with particular emphasis on improving
            crowdsourced data repositories for cultural heritage and citizen
            science. The research combines machine learning, computer vision,
            and modern web technologies to enhance heritage data accessibility
            and public engagement.
          </Text>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            Key Features
          </Title>
          <List spacing="xs" size="sm">
            <List.Item>
              <strong>Modern React Architecture:</strong> Built with React 19
              and modern TypeScript for optimal performance and developer
              experience
            </List.Item>
            <List.Item>
              <strong>Type-Safe Routing:</strong> File-based routing with
              TanStack Router and hash-based navigation for GitHub Pages
              compatibility
            </List.Item>
            <List.Item>
              <strong>Advanced State Management:</strong> TanStack Query for
              server state with intelligent caching and background updates
            </List.Item>
            <List.Item>
              <strong>Modern Styling System:</strong> Mantine UI components with
              Vanilla Extract CSS-in-JS for maintainable, type-safe styling
            </List.Item>
            <List.Item>
              <strong>Developer Experience:</strong> Comprehensive devtools, hot
              reload, and TypeScript support throughout
            </List.Item>
            <List.Item>
              <strong>Academic Integration:</strong> Built for integration with
              OpenAlex API for academic literature analysis
            </List.Item>
          </List>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            Technology Stack
          </Title>
          <Group gap="xs">
            {techStack.map((tech) => (
              <Badge key={tech.name} variant="light" color={tech.color}>
                {tech.name} v{tech.version}
              </Badge>
            ))}
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            Development & Deployment
          </Title>
          <Stack gap="sm">
            <div>
              <Text fw={500} size="sm">
                Build System
              </Text>
              <Text size="xs" c="dimmed">
                Vite with TypeScript, ESLint, and optimized production builds
              </Text>
            </div>
            <Divider />
            <div>
              <Text fw={500} size="sm">
                Static Hosting
              </Text>
              <Text size="xs" c="dimmed">
                GitHub Pages compatible with hash-based routing
              </Text>
            </div>
            <Divider />
            <div>
              <Text fw={500} size="sm">
                Package Management
              </Text>
              <Text size="xs" c="dimmed">
                pnpm with workspace support and optimized dependency resolution
              </Text>
            </div>
          </Stack>
        </Card>
      </Stack>
    </Card>
  );
}

export const Route = createLazyFileRoute("/about")({
  component: AboutPage,
});

export default AboutPage;
