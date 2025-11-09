/**
 * Research Dashboard - Quick access to common academic research tasks
 * Provides a central hub for researchers to manage their research workflow
 */

import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Card,
  Title,
  Text,
  Group,
  Badge,
  ActionIcon,
  Button,
  Stack,
  Progress,
  List,
  ThemeIcon,
  SimpleGrid,
  Tabs,
  TextInput,
  Select,
  NumberInput,
  Alert,
} from "@mantine/core";
import {
  IconSearch,
  IconBook,
  IconUsers,
  IconBuilding,
  IconBrain,
  IconTrendingUp,
  IconClock,
  IconDownload,
  IconShare,
  IconExternalLink,
  IconDatabase,
  IconChartBar,
  IconFilter,
  IconRefresh,
  IconBulb,
  IconNews,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { logger } from "@/lib/logger";
import { useCatalogue } from "@/hooks/useCatalogue";
import { notifications } from "@mantine/notifications";

interface QuickSearchProps {
  onSearch: (query: string, entityType: string) => void;
}

function QuickSearch({ onSearch }: QuickSearchProps) {
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState("works");

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim(), entityType);
      logger.debug("dashboard", "Quick search initiated", { query, entityType });
    }
  };

  return (
    <Card padding="md" withBorder>
      <Title order={4} mb="md">Quick Search</Title>
      <Group gap="sm">
        <Select
          value={entityType}
          onChange={(value) => setEntityType(value || "works")}
          data={[
            { value: "works", label: "Works" },
            { value: "authors", label: "Authors" },
            { value: "venues", label: "Venues" },
            { value: "institutions", label: "Institutions" },
            { value: "concepts", label: "Concepts" },
          ]}
          w={120}
        />
        <TextInput
          placeholder="Search academic literature..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          style={{ flex: 1 }}
        />
        <ActionIcon size="lg" onClick={handleSearch} color="blue">
          <IconSearch size={18} />
        </ActionIcon>
      </Group>
    </Card>
  );
}

interface RecentActivityProps {
  activities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
  }>;
}

function RecentActivity({ activities }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "search":
        return <IconSearch size={16} />;
      case "bookmark":
        return <IconBook size={16} />;
      case "export":
        return <IconDownload size={16} />;
      case "share":
        return <IconShare size={16} />;
      default:
        return <IconClock size={16} />;
    }
  };

  return (
    <Card padding="md" withBorder h="100%">
      <Title order={4} mb="md">Recent Activity</Title>
      <List spacing="sm" size="sm">
        {activities.slice(0, 5).map((activity) => (
          <List.Item
            key={activity.id}
            icon={
              <ThemeIcon color="blue" size={24} radius="xl">
                {getActivityIcon(activity.type)}
              </ThemeIcon>
            }
          >
            <div>
              <Text size="sm">{activity.description}</Text>
              <Text size="xs" c="dimmed">
                {activity.timestamp.toLocaleString()}
              </Text>
            </div>
          </List.Item>
        ))}
        {activities.length === 0 && (
          <Text c="dimmed" size="sm">
            No recent activity
          </Text>
        )}
      </List>
    </Card>
  );
}

interface QuickActionsProps {
  onAction: (action: string) => void;
}

function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    {
      id: "advanced-search",
      title: "Advanced Search",
      description: "Complex queries with filters",
      icon: <IconFilter size={24} />,
      color: "blue" as const,
    },
    {
      id: "create-list",
      title: "Create List",
      description: "Start a new bibliography",
      icon: <IconBook size={24} />,
      color: "green" as const,
    },
    {
      id: "analyze-trends",
      title: "Analyze Trends",
      description: "Research trend analysis",
      icon: <IconTrendingUp size={24} />,
      color: "orange" as const,
    },
    {
      id: "export-data",
      title: "Export Data",
      description: "Download in various formats",
      icon: <IconDownload size={24} />,
      color: "violet" as const,
    },
    {
      id: "compare-entities",
      title: "Compare Entities",
      description: "Side-by-side comparison",
      icon: <IconChartBar size={24} />,
      color: "cyan" as const,
    },
    {
      id: "discover-papers",
      title: "Discover Papers",
      description: "AI-powered recommendations",
      icon: <IconBulb size={24} />,
      color: "yellow" as const,
    },
  ];

  return (
    <Card padding="md" withBorder>
      <Title order={4} mb="md">Quick Actions</Title>
      <SimpleGrid cols={3} spacing="md">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="light"
            color={action.color}
            onClick={() => onAction(action.id)}
            h="auto"
            p="md"
          >
            <Stack gap="xs" align="center">
              {action.icon}
              <Text size="xs" fw={500} ta="center">
                {action.title}
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                {action.description}
              </Text>
            </Stack>
          </Button>
        ))}
      </SimpleGrid>
    </Card>
  );
}

interface ResearchStatsProps {
  stats: {
    totalSearches: number;
    savedItems: number;
    exportedLists: number;
    sharedItems: number;
  };
}

function ResearchStats({ stats }: ResearchStatsProps) {
  const statCards = [
    {
      label: "Total Searches",
      value: stats.totalSearches,
      icon: <IconSearch size={20} />,
      color: "blue" as const,
    },
    {
      label: "Saved Items",
      value: stats.savedItems,
      icon: <IconBook size={20} />,
      color: "green" as const,
    },
    {
      label: "Exported Lists",
      value: stats.exportedLists,
      icon: <IconDownload size={20} />,
      color: "violet" as const,
    },
    {
      label: "Shared Items",
      value: stats.sharedItems,
      icon: <IconShare size={20} />,
      color: "orange" as const,
    },
  ];

  return (
    <Card padding="md" withBorder>
      <Title order={4} mb="md">Research Statistics</Title>
      <SimpleGrid cols={2} spacing="md">
        {statCards.map((stat) => (
          <div key={stat.label}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">
                {stat.label}
              </Text>
              <ThemeIcon color={stat.color} size="sm" radius="xl">
                {stat.icon}
              </ThemeIcon>
            </Group>
            <Text size="xl" fw={700}>
              {stat.value.toLocaleString()}
            </Text>
          </div>
        ))}
      </SimpleGrid>
    </Card>
  );
}

interface PopularTopicsProps {
  topics: Array<{
    name: string;
    count: number;
    trend: "up" | "down" | "stable";
  }>;
}

function PopularTopics({ topics }: PopularTopicsProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <IconTrendingUp size={14} color="green" />;
      case "down":
        return <IconTrendingUp size={14} color="red" style={{ transform: "rotate(180deg)" }} />;
      default:
        return <IconTrendingUp size={14} color="gray" style={{ transform: "rotate(90deg)" }} />;
    }
  };

  return (
    <Card padding="md" withBorder>
      <Title order={4} mb="md">Popular Research Topics</Title>
      <Stack gap="sm">
        {topics.map((topic, index) => (
          <Group key={topic.name} justify="space-between">
            <Group>
              <Badge variant="light" size="sm">
                {index + 1}
              </Badge>
              <Text size="sm">{topic.name}</Text>
            </Group>
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                {topic.count.toLocaleString()}
              </Text>
              {getTrendIcon(topic.trend)}
            </Group>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

export function ResearchDashboard() {
  const navigate = useNavigate();
  const { lists } = useCatalogue();

  const [recentActivity] = useState([
    {
      id: "1",
      type: "search",
      description: "Searched for 'machine learning in healthcare'",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: "2",
      type: "bookmark",
      description: "Added 3 papers to 'AI in Medicine' bibliography",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      id: "3",
      type: "export",
      description: "Exported 'Climate Change Research' list as BibTeX",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
  ]);

  const [researchStats] = useState({
    totalSearches: 247,
    savedItems: 89,
    exportedLists: 12,
    sharedItems: 5,
  });

  const [popularTopics] = useState<Array<{
    name: string;
    count: number;
    trend: "up" | "down" | "stable";
  }>>([
    { name: "Machine Learning", count: 15420, trend: "up" },
    { name: "Climate Change", count: 12350, trend: "up" },
    { name: "COVID-19 Research", count: 9876, trend: "down" },
    { name: "Quantum Computing", count: 7234, trend: "up" },
    { name: "Renewable Energy", count: 6543, trend: "stable" },
  ]);

  const handleQuickSearch = (query: string, entityType: string) => {
    navigate({
      to: "/search",
      search: { q: query, filter: entityType, search: undefined },
    });
  };

  const handleQuickAction = (action: string) => {
    logger.debug("dashboard", "Quick action triggered", { action });

    switch (action) {
      case "advanced-search":
        navigate({ to: "/search", search: { q: "", filter: undefined, search: undefined } });
        break;
      case "create-list":
        // This would open a modal for creating a new list
        notifications.show({
          title: "Create List",
          message: "List creation modal would open here",
          color: "blue",
        });
        break;
      case "analyze-trends":
        notifications.show({
          title: "Feature Coming Soon",
          message: "Trends analysis is under development",
          color: "yellow",
        });
        break;
      case "export-data":
        notifications.show({
          title: "Export Data",
          message: "Export options would appear here",
          color: "blue",
        });
        break;
      case "compare-entities":
        notifications.show({
          title: "Feature Coming Soon",
          message: "Entity comparison is under development",
          color: "yellow",
        });
        break;
      case "discover-papers":
        notifications.show({
          title: "Feature Coming Soon",
          message: "Paper discovery is under development",
          color: "yellow",
        });
        break;
      default:
        notifications.show({
          title: "Feature Coming Soon",
          message: `${action} is under development`,
          color: "yellow",
        });
    }
  };

  useEffect(() => {
    logger.debug("dashboard", "Research dashboard mounted", { listCount: lists.length });
  }, [lists.length]);

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>Research Dashboard</Title>
            <Text c="dimmed">Your academic research command center</Text>
          </div>
          <Group>
            <ActionIcon variant="light" size="lg">
              <IconRefresh size={18} />
            </ActionIcon>
            <ActionIcon variant="light" size="lg">
              <IconExternalLink size={18} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Alert */}
        <Alert icon={<IconNews size={16} />} color="blue" variant="light">
          <Text size="sm">
            <strong>New Feature:</strong> Research trends now available! Explore trending topics in your field.
          </Text>
        </Alert>

        {/* Quick Search */}
        <QuickSearch onSearch={handleQuickSearch} />

        {/* Main Grid */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="lg">
              {/* Quick Actions */}
              <QuickActions onAction={handleQuickAction} />

              {/* Popular Topics */}
              <PopularTopics topics={popularTopics} />
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="lg">
              {/* Research Stats */}
              <ResearchStats stats={researchStats} />

              {/* Recent Activity */}
              <RecentActivity activities={recentActivity} />

              {/* Quick Links */}
              <Card padding="md" withBorder>
                <Title order={4} mb="md">Quick Links</Title>
                <Stack gap="xs">
                  <Button
                    variant="subtle"
                    fullWidth
                    leftSection={<IconDatabase size={14} />}
                    onClick={() => navigate({ to: "/catalogue" })}
                  >
                    My Bibliographies ({lists.length})
                  </Button>
                  <Button
                    variant="subtle"
                    fullWidth
                    leftSection={<IconBook size={14} />}
                    onClick={() => navigate({ to: "/history" })}
                  >
                    Recent Searches
                  </Button>
                  <Button
                    variant="subtle"
                    fullWidth
                    leftSection={<IconUsers size={14} />}
                    onClick={() => navigate({ to: "/authors" })}
                  >
                    Top Authors
                  </Button>
                  <Button
                    variant="subtle"
                    fullWidth
                    leftSection={<IconBuilding size={14} />}
                    onClick={() => navigate({ to: "/institutions" })}
                  >
                    Leading Institutions
                  </Button>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}