import { useState } from "react";
import { Stack, Paper, Title, Tabs, Text, Center } from "@mantine/core";
import {
  IconSearch,
  IconCode,
  IconEye,
  IconBookmark,
} from "@tabler/icons-react";

interface UnifiedSearchProps {
  defaultTab?: string;
}

export function UnifiedSearch({ defaultTab = "basic" }: UnifiedSearchProps) {
  const [activeTab, setActiveTab] = useState<string | null>(defaultTab);

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Title order={2}>Academic Search</Title>

        <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="basic" leftSection={<IconSearch size={16} />}>
              Basic Search
            </Tabs.Tab>
            <Tabs.Tab value="advanced" leftSection={<IconCode size={16} />}>
              Advanced Query Builder
            </Tabs.Tab>
            <Tabs.Tab value="visual" leftSection={<IconEye size={16} />}>
              Visual Builder
            </Tabs.Tab>
            <Tabs.Tab value="saved" leftSection={<IconBookmark size={16} />}>
              Saved Queries
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="basic" pt="md">
            <Center p="xl">
              <Stack align="center" gap="sm">
                <IconSearch
                  size={48}
                  stroke={1.5}
                  color="var(--mantine-color-gray-6)"
                />
                <Text size="lg" fw={500}>
                  Basic Search
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Simple search interface with text input and basic filters.
                  This will integrate the existing SearchInterface component.
                </Text>
              </Stack>
            </Center>
          </Tabs.Panel>

          <Tabs.Panel value="advanced" pt="md">
            <Center p="xl">
              <Stack align="center" gap="sm">
                <IconCode
                  size={48}
                  stroke={1.5}
                  color="var(--mantine-color-gray-6)"
                />
                <Text size="lg" fw={500}>
                  Advanced Query Builder
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Complex query builder with field-specific filters, operators,
                  and logic. Will support OpenAlex query syntax with visual
                  assistance.
                </Text>
              </Stack>
            </Center>
          </Tabs.Panel>

          <Tabs.Panel value="visual" pt="md">
            <Center p="xl">
              <Stack align="center" gap="sm">
                <IconEye
                  size={48}
                  stroke={1.5}
                  color="var(--mantine-color-gray-6)"
                />
                <Text size="lg" fw={500}>
                  Visual Builder
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Drag-and-drop interface for building complex queries visually.
                  Will provide a node-based editor for query construction.
                </Text>
              </Stack>
            </Center>
          </Tabs.Panel>

          <Tabs.Panel value="saved" pt="md">
            <Center p="xl">
              <Stack align="center" gap="sm">
                <IconBookmark
                  size={48}
                  stroke={1.5}
                  color="var(--mantine-color-gray-6)"
                />
                <Text size="lg" fw={500}>
                  Saved Queries
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Manage and reuse saved search queries. Will include query
                  templates and user-defined searches.
                </Text>
              </Stack>
            </Center>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Paper>
  );
}
