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
import { IconExternalLink, IconDownload, IconInfoCircle, IconFileText, IconTags, IconLink, IconCode } from '@tabler/icons-react';
import { RawDataView, AuthorList, ConceptList, EntityLink } from '@/components';
import type { Work } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useWorkData } from '@/hooks/use-entity-data';
import { reconstructAbstract } from '@/lib/openalex/utils/transformers';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
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
              {(() => {
                const reconstructedAbstract = reconstructAbstract(work.abstract_inverted_index);
                
                if (reconstructedAbstract) {
                  return (
                    <>
                      <Group mb="md">
                        <IconInfoCircle size={16} color="blue" />
                        <Text size="sm" c="dimmed" fs="italic">
                          Abstract reconstructed from inverted index ({Object.keys(work.abstract_inverted_index).length} unique terms)
                        </Text>
                      </Group>
                      <Text size="sm" style={{ lineHeight: 1.6 }}>
                        {reconstructedAbstract}
                      </Text>
                    </>
                  );
                } else {
                  return (
                    <Group mb="md">
                      <IconInfoCircle size={16} color="orange" />
                      <Text size="sm" c="dimmed" fs="italic">
                        Unable to reconstruct abstract from inverted index.
                      </Text>
                    </Group>
                  );
                }
              })()}
            </Paper>
          </Card>
        )}

        {/* Enhanced Authors */}
        {work.authorships && work.authorships.length > 0 && (
          <Card withBorder radius="md" p="xl">
            <Group mb="lg">
              <IconTags size={20} />
              <Title order={2} size="lg">Authors & Affiliations</Title>
              <Badge variant="light" color="blue" radius="sm">
                {work.authorships.length} authors
              </Badge>
            </Group>
            
            <AuthorList 
              authorships={work.authorships}
              showInstitutions={true}
              showPositions={true}
              maxAuthors={10}
            />
          </Card>
        )}

        {/* Enhanced Topics & Concepts */}
        {((work.topics && work.topics.length > 0) || (work.concepts && work.concepts.length > 0)) && (
          <Card withBorder radius="md" p="xl">
            <Group mb="lg">
              <IconTags size={20} />
              <Title order={2} size="lg">Research Topics & Concepts</Title>
            </Group>
            
            <ConceptList 
              topics={work.topics}
              concepts={work.concepts}
              showScores={true}
              variant="detailed"
              maxItems={15}
            />
          </Card>
        )}

        {/* Bibliographic Information */}
        {work.biblio && (work.biblio.volume || work.biblio.issue || work.biblio.first_page) && (
          <Card withBorder radius="md" p="xl">
            <Group mb="lg">
              <IconFileText size={20} />
              <Title order={2} size="lg">Bibliographic Details</Title>
            </Group>
            
            <Grid>
              {work.biblio.volume && (
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Volume
                    </Text>
                    <Text size="sm" fw={500}>
                      {work.biblio.volume}
                    </Text>
                  </Paper>
                </Grid.Col>
              )}
              
              {work.biblio.issue && (
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Issue
                    </Text>
                    <Text size="sm" fw={500}>
                      {work.biblio.issue}
                    </Text>
                  </Paper>
                </Grid.Col>
              )}
              
              {work.biblio.first_page && (
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Pages
                    </Text>
                    <Text size="sm" fw={500}>
                      {work.biblio.first_page}{work.biblio.last_page ? `-${work.biblio.last_page}` : ''}
                    </Text>
                  </Paper>
                </Grid.Col>
              )}
              
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="md" withBorder radius="sm" bg="gray.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    Work Type
                  </Text>
                  <Text size="sm" fw={500}>
                    {work.type || work.type_crossref || 'Not specified'}
                  </Text>
                </Paper>
              </Grid.Col>
            </Grid>
          </Card>
        )}

        {/* Funding Information */}
        {work.grants && work.grants.length > 0 && (
          <Card withBorder radius="md" p="xl">
            <Group mb="lg">
              <IconInfoCircle size={20} />
              <Title order={2} size="lg">Funding & Grants</Title>
              <Badge variant="light" color="green" radius="sm">
                {work.grants.length} grants
              </Badge>
            </Group>
            
            <Stack gap="sm">
              {work.grants.map((grant, index) => (
                <Paper key={index} p="md" withBorder radius="sm" bg="green.0">
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      {grant.display_name || `Grant ${index + 1}`}
                    </Text>
                    {grant.funder_display_name && (
                      <Group gap="xs">
                        <Text size="xs" c="dimmed">Funder:</Text>
                        <EntityLink
                          entityId={grant.funder}
                          displayName={grant.funder_display_name}
                          size="xs"
                        />
                      </Group>
                    )}
                    {grant.award_id && (
                      <Text size="xs" c="dimmed">
                        Award ID: {grant.award_id}
                      </Text>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Card>
        )}

        {/* Citation and Reference Information */}
        {(work.referenced_works_count > 0 || work.cited_by_count > 0) && (
          <Card withBorder radius="md" p="xl">
            <Group mb="lg">
              <IconLink size={20} />
              <Title order={2} size="lg">Citations & References</Title>
            </Group>
            
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="lg" withBorder radius="sm" bg="work.0">
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="work">
                      {work.cited_by_count}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Times Cited
                    </Text>
                    {work.cited_by_percentile_year && (
                      <Badge size="xs" variant="light" color="work">
                        {Math.round(work.cited_by_percentile_year.max)}th percentile
                      </Badge>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>
              
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="lg" withBorder radius="sm" bg="blue.0">
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="blue">
                      {work.referenced_works_count}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      References Cited
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </Card>
        )}

        {/* Alternative Access Locations */}
        {work.locations && work.locations.length > 1 && (
          <Card withBorder radius="md" p="xl">
            <Group mb="lg">
              <IconLink size={20} />
              <Title order={2} size="lg">Alternative Access Locations</Title>
              <Badge variant="light" color="orange" radius="sm">
                {work.locations.length} locations
              </Badge>
            </Group>
            
            <Stack gap="sm">
              {work.locations.slice(1).map((location, index) => (
                <Paper key={index} p="md" withBorder radius="sm" bg={location.is_oa ? 'openAccess.0' : 'gray.0'}>
                  <Group justify="space-between">
                    <Stack gap="xs">
                      {location.source && (
                        <EntityLink
                          entityId={location.source.id}
                          displayName={location.source.display_name}
                          size="sm"
                          weight={500}
                        />
                      )}
                      <Group gap="xs">
                        <Badge
                          size="xs"
                          variant="light"
                          color={location.is_oa ? 'openAccess' : 'gray'}
                        >
                          {location.is_oa ? 'Open Access' : 'Restricted'}
                        </Badge>
                        {location.license && (
                          <Badge size="xs" variant="outline" color="blue">
                            {location.license}
                          </Badge>
                        )}
                        {location.version && (
                          <Badge size="xs" variant="outline" color="gray">
                            {location.version}
                          </Badge>
                        )}
                      </Group>
                    </Stack>
                    
                    {location.landing_page_url && (
                      <Anchor
                        href={location.landing_page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        c="blue"
                      >
                        Visit
                      </Anchor>
                    )}
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Card>
        )}

        {/* Additional Metadata */}
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconInfoCircle size={20} />
            <Title order={2} size="lg">Additional Metadata</Title>
          </Group>
          
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="md" withBorder radius="sm" bg="gray.0">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  Distinct Countries
                </Text>
                <Text size="sm" fw={500}>
                  {work.countries_distinct_count || 0}
                </Text>
              </Paper>
            </Grid.Col>
            
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="md" withBorder radius="sm" bg="gray.0">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  Distinct Institutions
                </Text>
                <Text size="sm" fw={500}>
                  {work.institutions_distinct_count || 0}
                </Text>
              </Paper>
            </Grid.Col>
            
            {work.fwci && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder radius="sm" bg="gray.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    Field Weighted Citation Impact
                  </Text>
                  <Text size="sm" fw={500}>
                    {work.fwci.toFixed(2)}
                  </Text>
                </Paper>
              </Grid.Col>
            )}
            
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="md" withBorder radius="sm" bg="gray.0">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  Has Fulltext
                </Text>
                <Badge
                  size="sm"
                  variant="light"
                  color={work.has_fulltext ? 'green' : 'gray'}
                >
                  {work.has_fulltext ? 'Yes' : 'No'}
                </Badge>
              </Paper>
            </Grid.Col>
          </Grid>
        </Card>

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
        </Tabs.Panel>

        <Tabs.Panel value="raw-data">
          <RawDataView 
            data={work}
            title="Work Raw Data"
            entityType="work"
            entityId={work.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageTemplate>
  );
}

function WorkPage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to /entity/ route
  const isRedirecting = useNumericIdRedirect(id, EntityType.WORK);
  
  const { 
    data: work, 
    loading, 
    error, 
    retry 
  } = useWorkData(id, {
    enabled: !!id && !isRedirecting, // Don't fetch if redirecting
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Work fetch error:', error);
    }
  });

  // Show loading state for redirection
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="works" entityId={id}>
        <EntitySkeleton entityType={EntityType.WORK} />
      </EntityErrorBoundary>
    );
  }

  // Show loading state for data fetch
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