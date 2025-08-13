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
  IconBrandWikipedia,
  IconPhoto,
  IconGlobe
} from '@tabler/icons-react';
import { RawDataView } from '@/components/organisms/raw-data-view';
import type { Concept } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useConceptData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { 
  EntityPageTemplate,
  EntityErrorBoundary
} from '@/components';

function ConceptDisplay({ concept }: { concept: Concept }) {
  // External links for the concept
  const externalLinks = [
    concept.works_api_url && {
      url: concept.works_api_url,
      label: 'View Works (API)',
      type: 'api' as const,
      icon: <IconSearch size={16} />
    },
    concept.ids?.wikipedia && {
      url: concept.ids.wikipedia,
      label: 'Wikipedia Page',
      type: 'wikipedia' as const,
      icon: <IconBrandWikipedia size={16} />
    },
    concept.wikidata && {
      url: `https://www.wikidata.org/wiki/${concept.wikidata}`,
      label: 'Wikidata Entry',
      type: 'wikidata' as const,
      icon: <IconWorld size={16} />
    },
    {
      url: `https://openalex.org/${concept.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const,
      icon: <IconExternalLink size={16} />
    }
  ].filter(Boolean);

  return (
    <EntityPageTemplate entity={concept}>
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
                    <Text size="xl" fw={700} c="concept">
                      {concept.works_count.toLocaleString()}
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
                      {concept.cited_by_count.toLocaleString()}
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
                    <Text size="xl" fw={700} c="teal">
                      {concept.level}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Hierarchy Level
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="violet">
                      {concept.ancestors?.length || 0}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Ancestors
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Enhanced Concept Description */}
            {concept.description && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconInfoCircle size={20} />
                  <Title order={2} size="lg">Description</Title>
                </Group>
                
                <Text size="md" lh={1.6} c="dark">
                  {concept.description}
                </Text>
              </Card>
            )}

            {/* Enhanced Concept Hierarchy */}
            {concept.ancestors && concept.ancestors.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconHierarchy size={20} />
                  <Title order={2} size="lg">Concept Hierarchy</Title>
                  <Badge variant="light" color="violet" radius="sm">
                    {concept.ancestors.length} ancestors
                  </Badge>
                </Group>
                
                <Stack gap="md">
                  {concept.ancestors.slice(0, 10).map((ancestor, index) => (
                    <Paper key={ancestor.id} p="md" withBorder radius="sm" bg="gray.0">
                      <Group justify="space-between">
                        <Stack gap="xs">
                          <Group gap="xs">
                            <Badge variant="light" color="blue" size="sm">
                              Level {ancestor.level}
                            </Badge>
                            <Text size="sm" fw={500}>
                              {ancestor.display_name}
                            </Text>
                          </Group>
                          {ancestor.description && (
                            <Text size="xs" c="dimmed" lineClamp={2}>
                              {ancestor.description}
                            </Text>
                          )}
                        </Stack>
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">
                            {ancestor.works_count.toLocaleString()} works
                          </Text>
                          <Text size="xs" c="dimmed">
                            {ancestor.cited_by_count.toLocaleString()} citations
                          </Text>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                  
                  {concept.ancestors.length > 10 && (
                    <Text size="sm" c="dimmed" ta="center" fs="italic">
                      Showing 10 of {concept.ancestors.length} ancestor concepts
                    </Text>
                  )}
                </Stack>
              </Card>
            )}

            {/* Enhanced Related Concepts */}
            {concept.related_concepts && concept.related_concepts.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconTags size={20} />
                  <Title order={2} size="lg">Related Concepts</Title>
                  <Badge variant="light" color="blue" radius="sm">
                    {concept.related_concepts.length} related concepts
                  </Badge>
                </Group>
                
                <Grid>
                  {concept.related_concepts.slice(0, 8).map((related) => (
                    <Grid.Col key={related.id} span={{ base: 12, sm: 6, md: 4 }}>
                      <Paper p="md" withBorder radius="sm" bg="blue.0">
                        <Stack gap="xs">
                          <Group gap="xs">
                            <Badge variant="light" color="teal" size="xs">
                              Level {related.level}
                            </Badge>
                            <Text size="sm" fw={500} lineClamp={2}>
                              {related.display_name}
                            </Text>
                          </Group>
                          <Group gap="xs">
                            <Text size="xs" c="dimmed">
                              {related.works_count.toLocaleString()} works
                            </Text>
                            <Text size="xs" c="dimmed">
                              {related.cited_by_count.toLocaleString()} citations
                            </Text>
                          </Group>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                  ))}
                </Grid>
                
                {concept.related_concepts.length > 8 && (
                  <Text size="sm" c="dimmed" mt="md" ta="center" fs="italic">
                    Showing 8 of {concept.related_concepts.length} related concepts
                  </Text>
                )}
              </Card>
            )}

            {/* Enhanced Concept Images */}
            {(concept.image_url || concept.image_thumbnail_url) && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconPhoto size={20} />
                  <Title order={2} size="lg">Concept Images</Title>
                </Group>
                
                <Grid>
                  {concept.image_thumbnail_url && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" withBorder radius="sm">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          Thumbnail Image
                        </Text>
                        <Anchor 
                          href={concept.image_thumbnail_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img 
                            src={concept.image_thumbnail_url} 
                            alt={`Thumbnail for ${concept.display_name}`}
                            style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
                          />
                        </Anchor>
                      </Paper>
                    </Grid.Col>
                  )}
                  
                  {concept.image_url && concept.image_url !== concept.image_thumbnail_url && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" withBorder radius="sm">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          Full Image
                        </Text>
                        <Anchor 
                          href={concept.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="sm"
                          fw={500}
                          c="blue"
                        >
                          View Full Image
                        </Anchor>
                      </Paper>
                    </Grid.Col>
                  )}
                </Grid>
              </Card>
            )}

            {/* Enhanced International Names */}
            {concept.international && Object.keys(concept.international.display_name || {}).length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconGlobe size={20} />
                  <Title order={2} size="lg">International Names</Title>
                  <Badge variant="light" color="orange" radius="sm">
                    {Object.keys(concept.international.display_name).length} languages
                  </Badge>
                </Group>
                
                <Grid>
                  {Object.entries(concept.international.display_name).slice(0, 12).map(([lang, name]) => (
                    <Grid.Col key={lang} span={{ base: 12, sm: 6, md: 4 }}>
                      <Paper p="md" withBorder radius="sm" bg="orange.0">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          {lang.toUpperCase()}
                        </Text>
                        <Text size="sm" fw={500}>
                          {name}
                        </Text>
                        {concept.international.description?.[lang] && (
                          <Text size="xs" c="dimmed" mt="xs" lineClamp={2}>
                            {concept.international.description[lang]}
                          </Text>
                        )}
                      </Paper>
                    </Grid.Col>
                  ))}
                </Grid>
                
                {Object.keys(concept.international.display_name).length > 12 && (
                  <Text size="sm" c="dimmed" mt="md" ta="center" fs="italic">
                    Showing 12 of {Object.keys(concept.international.display_name).length} languages
                  </Text>
                )}
              </Card>
            )}

            {/* Enhanced Concept Metadata */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconInfoCircle size={20} />
                <Title order={2} size="lg">Concept Metadata</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Concept ID
                    </Text>
                    <Text size="sm" fw={500} ff="monospace">
                      {concept.id}
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Hierarchy Level
                    </Text>
                    <Text size="sm" fw={500}>
                      Level {concept.level}
                    </Text>
                  </Paper>
                </Grid.Col>

                {concept.updated_date && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Group gap="xs" mb="xs">
                        <IconCalendar size={14} />
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                          Last Updated
                        </Text>
                      </Group>
                      <Text size="sm" fw={500}>
                        {new Date(concept.updated_date).toLocaleDateString()}
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}

                {concept.score && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Concept Score
                      </Text>
                      <Text size="sm" fw={500}>
                        {concept.score.toFixed(3)}
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}

                {/* External IDs */}
                {concept.ids?.wikidata && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Wikidata ID
                      </Text>
                      <Anchor 
                        href={`https://www.wikidata.org/wiki/${concept.ids.wikidata}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        fw={500}
                        c="blue"
                      >
                        {concept.ids.wikidata}
                      </Anchor>
                    </Paper>
                  </Grid.Col>
                )}

                {concept.ids?.wikipedia && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Wikipedia URL
                      </Text>
                      <Anchor 
                        href={concept.ids.wikipedia}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        fw={500}
                        c="blue"
                        truncate
                      >
                        {concept.ids.wikipedia}
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
                        return 'concept';
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
            data={concept}
            title="Concept Raw Data"
            entityType="concept"
            entityId={concept.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageTemplate>
  );
}

function ConceptPage() {
  const { id } = Route.useParams();
  const isRedirecting = useNumericIdRedirect(id, EntityType.CONCEPT);
  
  const { 
    data: concept, 
    loading, 
    error, 
    retry 
  } = useConceptData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Concept fetch error:', error);
    }
  });

  // Show redirection loading state
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="concepts" entityId={id}>
        <EntitySkeleton entityType={EntityType.CONCEPT} />
      </EntityErrorBoundary>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <EntityErrorBoundary entityType="concepts" entityId={id}>
        <EntitySkeleton entityType={EntityType.CONCEPT} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="concepts" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.CONCEPT}
        />
      </EntityErrorBoundary>
    );
  }

  // Show concept data
  if (concept) {
    return (
      <EntityErrorBoundary entityType="concepts" entityId={id}>
        <ConceptDisplay concept={concept} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="concepts" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.CONCEPT}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/concepts/$id')({
  component: ConceptPage,
});