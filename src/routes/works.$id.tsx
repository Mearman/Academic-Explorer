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
  Grid
} from '@mantine/core';
import { IconExternalLink, IconDownload, IconInfoCircle, IconFileText, IconTags, IconLink } from '@tabler/icons-react';
import type { Work } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useWorkData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';
import { 
  EntityPageTemplate,
  EntityErrorBoundary
} from '@/components';

function WorkDisplay({ work }: { work: Work }) {
  // External links for the work
  const externalLinks = [
    work.primary_location?.landing_page_url && {
      url: work.primary_location.landing_page_url,
      label: 'Publisher Page',
      type: 'publisher' as const
    },
    work.best_oa_location?.pdf_url && {
      url: work.best_oa_location.pdf_url,
      label: 'Free PDF Access',
      type: 'pdf' as const
    },
    {
      url: `https://openalex.org/${work.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const
    }
  ].filter(Boolean);

  return (
    <EntityPageTemplate entity={work}>
      <Stack gap="xl">
        {/* Enhanced Key Metrics */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="lg" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <Text size="xl" fw={700} c="work">
                  {work.cited_by_count}
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
                <Text size="xl" fw={700}>
                  {work.publication_year || 'N/A'}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Published
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="lg" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <Text size="xl" fw={700}>
                  {work.authorships?.length || 0}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Authors
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="lg" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <Badge 
                  color={work.open_access.is_oa ? 'openAccess' : 'publisher'} 
                  size="lg" 
                  radius="sm"
                >
                  {work.open_access.is_oa ? 'Open Access' : 'Restricted'}
                </Badge>
                <Text size="sm" c="dimmed" ta="center">
                  Access Status
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Enhanced Publication Details */}
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconFileText size={20} />
            <Title order={2} size="lg">Publication Details</Title>
          </Group>
          
          <Grid>
            {work.primary_location?.source && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder radius="sm" bg="gray.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    Source Journal
                  </Text>
                  <Text size="sm" fw={500}>
                    {work.primary_location.source.display_name}
                  </Text>
                </Paper>
              </Grid.Col>
            )}
            
            {work.publication_date && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder radius="sm" bg="gray.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    Publication Date
                  </Text>
                  <Text size="sm" fw={500}>
                    {work.publication_date}
                  </Text>
                </Paper>
              </Grid.Col>
            )}
            
            {work.ids.doi && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder radius="sm" bg="gray.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    Digital Object Identifier
                  </Text>
                  <Anchor 
                    href={`https://doi.org/${work.ids.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="sm"
                    fw={500}
                    c="work"
                  >
                    {work.ids.doi}
                  </Anchor>
                </Paper>
              </Grid.Col>
            )}
            
            {work.language && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder radius="sm" bg="gray.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    Language
                  </Text>
                  <Text size="sm" fw={500}>
                    {work.language}
                  </Text>
                </Paper>
              </Grid.Col>
            )}
          </Grid>
        </Card>

        {/* Enhanced Abstract */}
        {work.abstract_inverted_index && (
          <Card withBorder radius="md" p="xl" bg="blue.0">
            <Group mb="lg">
              <IconFileText size={20} />
              <Title order={2} size="lg">Abstract</Title>
            </Group>
            
            <Paper p="lg" radius="md" withBorder>
              <Group mb="md">
                <IconInfoCircle size={16} color="blue" />
                <Text size="sm" c="dimmed" fs="italic">
                  Abstract available in inverted index format. 
                  Full text reconstruction feature coming soon.
                </Text>
              </Group>
            </Paper>
          </Card>
        )}

        {/* Enhanced Topics */}
        {work.topics && work.topics.length > 0 && (
          <Card withBorder radius="md" p="xl">
            <Group mb="lg">
              <IconTags size={20} />
              <Title order={2} size="lg">Research Topics</Title>
            </Group>
            
            <Group gap="sm">
              {work.topics.map((topic) => (
                <Badge
                  key={topic.id}
                  variant="light"
                  size="md"
                  radius="sm"
                >
                  {topic.display_name}
                </Badge>
              ))}
            </Group>
          </Card>
        )}

        {/* Enhanced External Links */}
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconLink size={20} />
            <Title order={2} size="lg">Access & Resources</Title>
          </Group>
          
          <Grid>
            {externalLinks.map((link, index) => {
              if (!link) return null;
              
              const getIcon = () => {
                switch (link.type) {
                  case 'pdf':
                    return <IconDownload size={16} />;
                  case 'publisher':
                    return <IconExternalLink size={16} />;
                  default:
                    return <IconInfoCircle size={16} />;
                }
              };

              const getColor = () => {
                switch (link.type) {
                  case 'pdf':
                    return 'openAccess';
                  case 'publisher':
                    return 'publisher';
                  default:
                    return 'work';
                }
              };

              return (
                <Grid.Col key={index} span={{ base: 12, sm: 6, md: 4 }}>
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
                        {getIcon()}
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
    </EntityPageTemplate>
  );
}

function WorkPage() {
  const { id } = Route.useParams();
  
  const { 
    data: work, 
    loading, 
    error, 
    retry 
  } = useWorkData(id, {
    enabled: !!id,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Work fetch error:', error);
    }
  });

  // Show loading state
  if (loading) {
    return (
      <EntityErrorBoundary entityType="works" entityId={id}>
        <EntitySkeleton entityType={EntityType.WORK} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="works" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.WORK}
        />
      </EntityErrorBoundary>
    );
  }

  // Show work data
  if (work) {
    return (
      <EntityErrorBoundary entityType="works" entityId={id}>
        <WorkDisplay work={work} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="works" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.WORK}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/works/$id')({
  component: WorkPage,
});