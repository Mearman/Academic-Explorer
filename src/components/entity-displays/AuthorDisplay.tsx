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
  Tabs,
  List
} from '@mantine/core';
import { 
  IconUser, 
  IconCalendar, 
  IconBuilding, 
  IconExternalLink, 
  IconCode, 
  IconLink, 
  IconSchool, 
  IconWorldWww,
  IconTags,
  IconChartBar,
  IconInfoCircle,
  IconId,
  IconBook
} from '@tabler/icons-react';
import { useEffect } from 'react';

import { RawDataView, EntityLink, WorksTimeline, PageWithPanes, EntityPageHeader, useShouldRenderTwoPaneLayout } from '@/components';
import { ValidationIndicator } from '@/components/atoms/validation-indicator';
import type { Author } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityValidationStore } from '@/stores/entity-validation-store';

// Helper function to get external links for an author
function getAuthorExternalLinks(author: Author) {
  return [
    author.orcid && {
      url: `https://orcid.org/${author.orcid}`,
      label: 'ORCID Profile',
      type: 'orcid' as const
    },
    author.ids.wikipedia && {
      url: author.ids.wikipedia,
      label: 'Wikipedia',
      type: 'wikipedia' as const
    },
    author.ids.wikidata && {
      url: `https://www.wikidata.org/wiki/${author.ids.wikidata}`,
      label: 'Wikidata',
      type: 'wikidata' as const
    },
    {
      url: `https://openalex.org/${author.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const
    }
  ].filter(Boolean);
}

// Helper function to get icon for external link type
function getExternalLinkIcon(type: string) {
  switch (type) {
    case 'orcid':
      return <IconId size={16} />;
    case 'wikipedia':
      return <IconWorldWww size={16} />;
    case 'wikidata':
      return <IconWorldWww size={16} />;
    default:
      return <IconExternalLink size={16} />;
  }
}

// Helper function to get color for external link type
function getExternalLinkColor(type: string) {
  switch (type) {
    case 'orcid':
      return 'green';
    case 'wikipedia':
      return 'blue';
    case 'wikidata':
      return 'indigo';
    default:
      return 'gray';
  }
}

interface AuthorDisplayProps {
  entity: Author;
  useTwoPaneLayout?: boolean;
  graphPane?: React.ReactNode;
}

export function AuthorDisplay({ entity: author, useTwoPaneLayout = false, graphPane }: AuthorDisplayProps) {
  const { validationSettings, validateEntity } = useEntityValidationStore();
  const shouldRenderTwoPaneLayout = useShouldRenderTwoPaneLayout();
  const externalLinks = getAuthorExternalLinks(author);

  // Auto-validate on load if enabled
  useEffect(() => {
    if (validationSettings.enabled && 
        validationSettings.autoValidateOnLoad &&
        validationSettings.validatedEntityTypes.includes(EntityType.AUTHOR)) {
      
      validateEntity({
        entityId: author.id,
        entityType: EntityType.AUTHOR,
        entityData: author,
        entityDisplayName: author.display_name
      }).catch((error) => {
        console.warn('Failed to validate author:', error);
      });
    }
  }, [author, validateEntity, validationSettings]);

  // Extract header information - show core author data
  const getSubtitle = () => {
    if (author.works_count && author.works_count > 0) {
      return `${author.works_count.toLocaleString()} works published`;
    }
    if (author.cited_by_count && author.cited_by_count > 0) {
      return `${author.cited_by_count.toLocaleString()} total citations`;
    }
    if (author.summary_stats?.h_index) {
      return `h-index: ${author.summary_stats.h_index}`;
    }
    return 'Author';
  };

  const getStatusInfo = () => {
    const status = [];
    
    if (author.orcid) {
      status.push(
        <Badge key="orcid-verified" variant="outline" color="green" size="sm">
          ORCID Verified
        </Badge>
      );
    }
    
    return status;
  };

  const getMetadata = () => {
    const metadata = [];
    
    if (author.updated_date) {
      metadata.push({
        label: 'Last Updated',
        value: new Date(author.updated_date).toLocaleDateString('en-GB'),
      });
    }
    
    if (author.created_date) {
      metadata.push({
        label: 'Created',
        value: new Date(author.created_date).toLocaleDateString('en-GB'),
      });
    }
    
    return metadata;
  };

  const headerContent = (
    <div>
      <EntityPageHeader
        entityType={EntityType.AUTHOR}
        title={author.display_name}
        entityId={author.id}
        subtitle={getSubtitle()}
        alternativeNames={author.display_name_alternatives}
        externalIds={author.ids}
        statusInfo={getStatusInfo()}
        metadata={getMetadata()}
        quickActions={
          <ValidationIndicator
            entityId={author.id}
            entityType={EntityType.AUTHOR}
            showManageLink
          />
        }
      />
      
      {/* Core author metrics - always visible */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e9ecef' }}>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <Text size="lg" fw={700} c="blue">
                  {(author.works_count ?? 0).toLocaleString()}
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  Works Published
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <Text size="lg" fw={700} c="blue">
                  {(author.cited_by_count ?? 0).toLocaleString()}
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  Total Citations
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <Text size="lg" fw={700} c="blue">
                  {author.summary_stats?.h_index ?? 0}
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  h-index
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <Text size="lg" fw={700} c="blue">
                  {author.summary_stats?.i10_index ?? 0}
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  i10-index
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </div>
    </div>
  );

  const authorContent = (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">

      <Tabs defaultValue="overview" keepMounted={false}>
        <Tabs.List grow mb="xl">
          <Tabs.Tab value="overview" leftSection={<IconUser size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="works" leftSection={<IconBook size={16} />}>
            Works
          </Tabs.Tab>
          <Tabs.Tab value="raw-data" leftSection={<IconCode size={16} />}>
            Raw Data
          </Tabs.Tab>
        </Tabs.List>

      <Tabs.Panel value="overview">
        <Stack gap="xl">
          {/* Enhanced Research Metrics */}
          <Card withBorder radius="md" p="xl">
            <Group mb="lg">
              <IconChartBar size={20} />
              <Title order={2} size="lg">Research Impact Metrics</Title>
            </Group>
            
            <Grid>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper p="md" withBorder radius="sm" >
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    2-Year Mean Citedness
                  </Text>
                  <Text size="lg" fw={600}>
                    {(author.summary_stats?.['2yr_mean_citedness'] ?? 0).toFixed(2)}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Average citations per work over last 2 years
                  </Text>
                </Paper>
              </Grid.Col>
              
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper p="md" withBorder radius="sm" >
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    h-index
                  </Text>
                  <Text size="lg" fw={600}>
                    {author.summary_stats?.h_index ?? 0}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Has {author.summary_stats?.h_index ?? 0} papers with ≥{author.summary_stats?.h_index ?? 0} citations each
                  </Text>
                </Paper>
              </Grid.Col>
              
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper p="md" withBorder radius="sm" >
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    i10-index
                  </Text>
                  <Text size="lg" fw={600}>
                    {author.summary_stats?.i10_index ?? 0}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Number of works with ≥10 citations
                  </Text>
                </Paper>
              </Grid.Col>
            </Grid>
          </Card>

          {/* Enhanced Affiliations */}
          {author.affiliations && author.affiliations.length > 0 && (
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconSchool size={20} />
                <Title order={2} size="lg">Institutional Affiliations</Title>
              </Group>
              
              <Stack gap="md">
                {author.affiliations.map((affiliation, index) => (
                  <Paper key={index} p="md" withBorder radius="sm" >
                    <Group justify="space-between" align="flex-start">
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '8px' }}>
                          <EntityLink
                            entityId={affiliation.institution.id}
                            displayName={affiliation.institution.display_name}
                            size="sm"
                            weight={600}
                          />
                        </div>
                        {affiliation.institution.country_code && (
                          <Badge variant="light" size="sm" mb="xs">
                            {affiliation.institution.country_code}
                          </Badge>
                        )}
                        {affiliation.institution.type && (
                          <Text size="xs" c="dimmed">
                            {affiliation.institution.type}
                          </Text>
                        )}
                      </div>
                      {affiliation.years && affiliation.years.length > 0 && (
                        <Badge variant="outline" size="sm">
                          {Math.min(...affiliation.years)} - {Math.max(...affiliation.years)}
                        </Badge>
                      )}
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Card>
          )}

          {/* Last Known Institutions */}
          {author.last_known_institutions && author.last_known_institutions.length > 0 && (
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconBuilding size={20} />
                <Title order={2} size="lg">Most Recent Institutions</Title>
              </Group>
              
              <Grid>
                {author.last_known_institutions.map((institution, index) => (
                  <Grid.Col key={index} span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm">
                      <EntityLink
                        entityId={institution.id}
                        displayName={institution.display_name}
                        size="sm"
                        weight={500}
                      />
                      <Group gap="xs">
                        {institution.country_code && (
                          <Badge variant="light" size="xs">
                            {institution.country_code}
                          </Badge>
                        )}
                        {institution.type && (
                          <Badge variant="outline" size="xs">
                            {institution.type}
                          </Badge>
                        )}
                      </Group>
                      {institution.ror && (
                        <Text size="xs" c="dimmed" mt="xs">
                          ROR: {institution.ror}
                        </Text>
                      )}
                    </Paper>
                  </Grid.Col>
                ))}
              </Grid>
            </Card>
          )}

          {/* Research Topics */}
          {author.topics && author.topics.length > 0 && (
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconTags size={20} />
                <Title order={2} size="lg">Research Topics</Title>
              </Group>
              
              <Group gap="sm">
                {author.topics.map((topic) => (
                  <Badge
                    key={topic.id}
                    variant="light"
                    size="md"
                    radius="sm"
                    color="violet"
                  >
                    {topic.display_name}
                  </Badge>
                ))}
              </Group>
            </Card>
          )}

          {/* Alternative Names */}
          {author.display_name_alternatives && author.display_name_alternatives.length > 0 && (
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconId size={20} />
                <Title order={2} size="lg">Alternative Names</Title>
              </Group>
              
              <List spacing="xs" size="sm">
                {author.display_name_alternatives.map((name, index) => (
                  <List.Item key={index}>
                    <Text size="sm">{name}</Text>
                  </List.Item>
                ))}
              </List>
            </Card>
          )}

          {/* Publication Timeline */}
          {author.counts_by_year && author.counts_by_year.length > 0 && (
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconCalendar size={20} />
                <Title order={2} size="lg">Publication Activity by Year</Title>
              </Group>
              
              <Paper p="md" withBorder radius="sm" >
                <Text size="sm" c="dimmed" mb="md">
                  Recent publication activity (last 10 years shown)
                </Text>
                <Grid>
                  {author.counts_by_year
                    .filter(yearData => yearData.year >= new Date().getFullYear() - 10)
                    .sort((a, b) => b.year - a.year)
                    .slice(0, 10)
                    .map((yearData) => (
                      <Grid.Col key={yearData.year} span={{ base: 6, md: 4, lg: 2.4 }}>
                        <Stack gap={4} align="center">
                          <Text size="sm" fw={600}>
                            {yearData.year}
                          </Text>
                          <Text size="lg" fw={700} c="blue">
                            {yearData.works_count ?? 0}
                          </Text>
                          <Text size="xs" c="dimmed">
                            works
                          </Text>
                          <Text size="sm" c="blue">
                            {yearData.cited_by_count ?? 0} cites
                          </Text>
                        </Stack>
                      </Grid.Col>
                    ))}
                </Grid>
              </Paper>
            </Card>
          )}

          {/* Author Details */}
          <Card withBorder radius="md" p="xl">
            <Group mb="lg">
              <IconInfoCircle size={20} />
              <Title order={2} size="lg">Author Details</Title>
            </Group>
            
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder radius="sm" >
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    OpenAlex ID
                  </Text>
                  <Text size="sm" fw={500}>
                    {author.id}
                  </Text>
                </Paper>
              </Grid.Col>
              
              {author.orcid && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" >
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      ORCID iD
                    </Text>
                    <Anchor 
                      href={`https://orcid.org/${author.orcid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="sm"
                      fw={500}
                      c="blue"
                    >
                      {author.orcid}
                    </Anchor>
                  </Paper>
                </Grid.Col>
              )}
              
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder radius="sm" >
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    Created Date
                  </Text>
                  <Text size="sm" fw={500}>
                    {new Date(author.created_date).toLocaleDateString()}
                  </Text>
                </Paper>
              </Grid.Col>
              
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder radius="sm" >
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    Last Updated
                  </Text>
                  <Text size="sm" fw={500}>
                    {new Date(author.updated_date).toLocaleDateString()}
                  </Text>
                </Paper>
              </Grid.Col>
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
                            borderColor: theme.colors[getExternalLinkColor(link.type)][5],
                          },
                        })}
                      >
                        <Group>
                          {getExternalLinkIcon(link.type)}
                          <Text size="sm" fw={500} c={getExternalLinkColor(link.type)}>
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

      <Tabs.Panel value="works">
        <WorksTimeline 
          authorId={author.id} 
          authorName={author.display_name}
        />
      </Tabs.Panel>

      <Tabs.Panel value="raw-data">
        <RawDataView 
          data={author}
          title="Author Raw Data"
          entityType="author"
          entityId={author.id}
          maxHeight={700}
          showDownload={true}
        />
      </Tabs.Panel>
      </Tabs>
      </Stack>
    </div>
  );

  // Only render two-pane layout if requested AND we're not already inside a TwoPaneLayout
  if (useTwoPaneLayout && graphPane && shouldRenderTwoPaneLayout) {
    return (
      <PageWithPanes
        headerContent={headerContent}
        leftPane={authorContent}
        rightPane={graphPane}
        twoPaneLayoutProps={{
          stateKey: `author-${author.id}`,
          defaultSplit: 65,
          mobileTabLabels: { left: 'Author', right: 'Graph' },
        }}
        paneControlLabels={{ left: 'Author Data', right: 'Graph View' }}
      />
    );
  }
  
  // If we're inside a parent TwoPaneLayout, just render the header and content together
  if (useTwoPaneLayout && !shouldRenderTwoPaneLayout) {
    return (
      <div>
        {headerContent}
        {authorContent}
      </div>
    );
  }

  return authorContent;
}