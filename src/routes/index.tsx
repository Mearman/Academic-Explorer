import { createFileRoute } from '@tanstack/react-router'
import { Title, Text, Stack, Card, SimpleGrid, ThemeIcon, Group } from '@mantine/core'
import { IconRouter, IconDatabase, IconPalette, IconBrandReact } from '@tabler/icons-react'
import { pageTitle, pageDescription } from '../styles/layout.css'

function HomePage() {
  const features = [
    {
      icon: IconBrandReact,
      title: 'React 19',
      description: 'Built with the latest React 19 with modern hooks and concurrent features.',
      color: 'blue',
    },
    {
      icon: IconRouter,
      title: 'TanStack Router',
      description: 'Type-safe file-based routing with hash-based navigation for GitHub Pages.',
      color: 'green',
    },
    {
      icon: IconDatabase,
      title: 'TanStack Query',
      description: 'Powerful data fetching with caching, background updates, and devtools.',
      color: 'violet',
    },
    {
      icon: IconPalette,
      title: 'Mantine + Vanilla Extract',
      description: 'Modern UI components with type-safe CSS-in-JS styling system.',
      color: 'orange',
    },
  ]

  return (
    <Stack gap="xl">
      <div>
        <Title order={1} className={pageTitle}>
          Welcome to Academic Explorer!
        </Title>
        <Text className={pageDescription}>
          A modern React application for academic literature exploration. Built with cutting-edge
          technologies and designed for optimal performance and developer experience.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {features.map((feature) => (
          <Card key={feature.title} shadow="sm" padding="lg" radius="md" withBorder>
            <Group mb="md">
              <ThemeIcon size={40} radius="md" variant="light" color={feature.color}>
                <feature.icon size={24} />
              </ThemeIcon>
              <Text fw={500} size="lg">
                {feature.title}
              </Text>
            </Group>

            <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
              {feature.description}
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={3} mb="md">
          Getting Started
        </Title>
        <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
          Navigate using the links in the header to explore the different features:
        </Text>
        <Stack gap="xs" mt="md">
          <Text size="sm">
            • <strong>Query Demo</strong> - See TanStack Query in action with real API calls
          </Text>
          <Text size="sm">
            • <strong>About</strong> - Learn more about this project and its architecture
          </Text>
          <Text size="sm">
            • Toggle the theme using the moon/sun icon in the top right
          </Text>
        </Stack>
      </Card>
    </Stack>
  )
}

export const Route = createFileRoute('/')({
  component: HomePage,
})