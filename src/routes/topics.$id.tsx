import { createFileRoute } from '@tanstack/react-router';
import { 
  Card, 
  Badge, 
  Group, 
  Stack, 
  Text, 
  Title, 
  Anchor, 
  Paper,
  Grid,
  Tabs
} from '@mantine/core';
import { 
  IconExternalLink, 
  IconInfoCircle, 
  IconFileText, 
  IconTags, 
  IconLink, 
  IconCode,
  IconHierarchy,
  IconCalendar,
  IconWorld,
  IconSearch,
  IconBrandWikipedia
} from '@tabler/icons-react';
import { RawDataView } from '@/components';
import type { Topic } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useTopicData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { 
  EntityPageTemplate,
  EntityErrorBoundary
} from '@/components';

function TopicDisplay({ topic }: { topic: Topic }) {
  // External links for the topic
  const externalLinks = [
    topic.works_api_url && {
      url: topic.works_api_url,
      label: 'View Works (API)',
      type: 'api' as const,
      icon: <IconSearch size={16} />
    },
    topic.ids.wikipedia && {
      url: topic.ids.wikipedia,
      label: 'Wikipedia Page',
      type: 'wikipedia' as const,
      icon: <IconBrandWikipedia size={16} />
    },
    topic.ids.wikidata && {
      url: `https://www.wikidata.org/wiki/${topic.ids.wikidata}`,
      label: 'Wikidata Entry',
      type: 'wikidata' as const,
      icon: <IconWorld size={16} />
    },
    {
      url: `https://openalex.org/${topic.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const,
      icon: <IconExternalLink size={16} />
    }
  ].filter(Boolean);

  return (
    <EntityPageTemplate entity={topic}>
      <Tabs defaultValue="overview" keepMounted={false}>
        <Tabs.List grow mb="xl">
          <Tabs.Tab value="overview" leftSection={<IconFileText size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="raw-data" leftSection={<IconCode size={16} />}>
            Raw Data
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <Stack gap="xl">
            {/* Enhanced Key Metrics */}
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="topic">
                      {topic.works_count.toLocaleString()}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Works
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="green">
                      {topic.cited_by_count.toLocaleString()}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Citations
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="blue">
                      {topic.keywords?.length || 0}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Keywords
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="violet">
                      {topic.siblings?.length || 0}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Sibling Topics
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Enhanced Topic Hierarchy */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconHierarchy size={20} />
                <Title order={2} size="lg">Topic Hierarchy</Title>
              </Group>
              
              <Grid>
                {topic.domain && (
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper p="md" withBorder radius="sm" bg="blue.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Domain
                      </Text>
                      <Badge variant="light" color="blue" size="lg" radius="sm" fullWidth>
                        {topic.domain.display_name}
                      </Badge>
                    </Paper>
                  </Grid.Col>
                )}
                
                {topic.field && (
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper p="md" withBorder radius="sm" bg="green.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Field
                      </Text>
                      <Badge variant="light" color="green" size="lg" radius="sm" fullWidth>
                        {topic.field.display_name}
                      </Badge>
                    </Paper>
                  </Grid.Col>
                )}

                {topic.subfield && (
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper p="md" withBorder radius="sm" bg="violet.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Subfield
                      </Text>
                      <Badge variant="light" color="violet" size="lg" radius="sm" fullWidth>
                        {topic.subfield.display_name}
                      </Badge>
                    </Paper>
                  </Grid.Col>
                )}
              </Grid>
            </Card>

            {/* Enhanced Keywords Section */}
            {topic.keywords && topic.keywords.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconTags size={20} />
                  <Title order={2} size="lg">Keywords</Title>
                  <Badge variant="light" color="blue" radius="sm">
                    {topic.keywords.length} keywords
                  </Badge>
                </Group>
                
                <Group gap="sm">
                  {topic.keywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="light"
                      color="topic"
                      size="md"
                      radius="sm"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </Group>
              </Card>
            )}

            {/* Enhanced Sibling Topics */}
            {topic.siblings && topic.siblings.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconHierarchy size={20} />
                  <Title order={2} size="lg">Related Topics</Title>
                  <Badge variant="light" color="violet" radius="sm">
                    {topic.siblings.length} sibling topics
                  </Badge>
                </Group>
                
                <Grid>
                  {topic.siblings.slice(0, 8).map((sibling) => (
                    <Grid.Col key={sibling.id} span={{ base: 12, sm: 6, md: 4 }}>
                      <Paper p="md" withBorder radius="sm" bg="gray.0">
                        <Stack gap="xs">
                          <Text size="sm" fw={500} lineClamp={2}>
                            {sibling.display_name}
                          </Text>
                          <Group gap="xs">
                            <Text size="xs" c="dimmed">
                              {sibling.works_count.toLocaleString()} works
                            </Text>
                            <Text size="xs" c="dimmed">
                              {sibling.cited_by_count.toLocaleString()} citations
                            </Text>
                          </Group>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                  ))}
                </Grid>
                
                {topic.siblings.length > 8 && (
                  <Text size="sm" c="dimmed" mt="md" ta="center" fs="italic">
                    Showing 8 of {topic.siblings.length} sibling topics
                  </Text>
                )}
              </Card>
            )}

            {/* Enhanced Topic Metadata */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconInfoCircle size={20} />
                <Title order={2} size="lg">Topic Metadata</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Topic ID
                    </Text>
                    <Text size="sm" fw={500} ff="monospace">
                      {topic.id}
                    </Text>
                  </Paper>
                </Grid.Col>
                
                {topic.created_date && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Group gap="xs" mb="xs">
                        <IconCalendar size={14} />
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                          Created Date
                        </Text>
                      </Group>
                      <Text size="sm" fw={500}>
                        {new Date(topic.created_date).toLocaleDateString()}
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}

                {topic.updated_date && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Group gap="xs" mb="xs">
                        <IconCalendar size={14} />
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                          Last Updated
                        </Text>
                      </Group>
                      <Text size="sm" fw={500}>
                        {new Date(topic.updated_date).toLocaleDateString()}
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}

                {/* External IDs */}
                {topic.ids.wikipedia && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Wikipedia URL
                      </Text>
                      <Anchor 
                        href={topic.ids.wikipedia}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        fw={500}
                        c="blue"
                        truncate
                      >
                        {topic.ids.wikipedia}
                      </Anchor>
                    </Paper>
                  </Grid.Col>
                )}

                {topic.ids.wikidata && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Wikidata ID
                      </Text>
                      <Anchor 
                        href={`https://www.wikidata.org/wiki/${topic.ids.wikidata}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        fw={500}
                        c="blue"
                      >
                        {topic.ids.wikidata}
                      </Anchor>
                    </Paper>
                  </Grid.Col>
                )}
              </Grid>
            </Card>

            {/* Enhanced External Links */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconLink size={20} />
                <Title order={2} size="lg">External Resources</Title>
              </Group>
              
              <Grid>
                {externalLinks.map((link, index) => {
                  if (!link) return null;
                  
                  const getColor = () => {
                    switch (link.type) {
                      case 'wikipedia':
                        return 'orange';
                      case 'wikidata':
                        return 'blue';
                      case 'api':
                        return 'green';
                      default:
                        return 'topic';
                    }
                  };

                  return (
                    <Grid.Col key={index} span={{ base: 12, sm: 6, md: 3 }}>
                      <Anchor
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <Paper
                          p="md"
                          withBorder
                          radius="md"
                          style={(theme) => ({
                            transition: 'all 150ms ease',
                            cursor: 'pointer',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: theme.shadows.md,
                              borderColor: theme.colors[getColor()][5],
                            },
                          })}
                        >
                          <Group>
                            {link.icon}
                            <Text size="sm" fw={500} c={getColor()}>
                              {link.label}
                            </Text>
                          </Group>
                        </Paper>
                      </Anchor>
                    </Grid.Col>
                  );
                })}
              </Grid>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="raw-data">
          <RawDataView 
            data={topic}
            title="Topic Raw Data"
            entityType="topic"
            entityId={topic.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageTemplate>
  );
}

function TopicPage() {
  const { id } = Route.useParams();
  const isRedirecting = useNumericIdRedirect(id, EntityType.TOPIC);
  
  const { 
    data: topic, 
    loading, 
    error, 
    retry 
  } = useTopicData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Topic fetch error:', error);
    }
  });

  // Show redirection loading state
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="topics" entityId={id}>
        <EntitySkeleton entityType={EntityType.TOPIC} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="topics" entityId={id}>
        <EntitySkeleton entityType={EntityType.TOPIC} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="topics" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.TOPIC}
        />
      </EntityErrorBoundary>
    );
  }

  // Show topic data
  if (topic) {
    return (
      <EntityErrorBoundary entityType="topics" entityId={id}>
        <TopicDisplay topic={topic} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="topics" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.TOPIC}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/topics/$id')({
  component: TopicPage,
});