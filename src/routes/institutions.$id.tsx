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
  Tabs,
  List,
} from '@mantine/core';
import { 
  IconBuilding, 
  IconExternalLink, 
  IconInfoCircle, 
  IconMapPin, 
  IconGlobe, 
  IconLink, 
  IconCode,
  IconTags,
  IconUsers,
  IconBooks,
  IconBuildingBank,
  IconWorld,
  IconId,
  IconCalendar
} from '@tabler/icons-react';
import { RawDataView } from '@/components';
import type { Institution } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useInstitutionData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { 
  EntityPageTemplate,
  EntityErrorBoundary
} from '@/components';

function InstitutionDisplay({ institution }: { institution: Institution }) {
  // External links for the institution
  const externalLinks = [
    institution.homepage_url && {
      url: institution.homepage_url,
      label: 'Institution Homepage',
      type: 'homepage' as const
    },
    institution.ror && {
      url: `https://ror.org/${institution.ror}`,
      label: 'ROR Profile',
      type: 'ror' as const
    },
    institution.ids?.wikidata && {
      url: `https://www.wikidata.org/wiki/${institution.ids.wikidata}`,
      label: 'Wikidata',
      type: 'wikidata' as const
    },
    institution.ids?.wikipedia && {
      url: `https://en.wikipedia.org/wiki/${institution.ids.wikipedia}`,
      label: 'Wikipedia',
      type: 'wikipedia' as const
    },
    {
      url: `https://openalex.org/${institution.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const
    }
  ].filter(Boolean);

  return (
    <EntityPageTemplate entity={institution}>
      <Tabs defaultValue="overview" keepMounted={false}>
        <Tabs.List grow mb="xl">
          <Tabs.Tab value="overview" leftSection={<IconBuilding size={16} />}>
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
                    <Text size="xl" fw={700} c="orange">
                      {institution.works_count.toLocaleString()}
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
                    <Text size="xl" fw={700} c="orange">
                      {institution.cited_by_count.toLocaleString()}
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
                    <Text size="xl" fw={700} c="orange">
                      {institution.summary_stats.h_index}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      h-index
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="orange">
                      {institution.summary_stats.i10_index}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      i10-index
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Enhanced Additional Metrics */}
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="lg" fw={600} c="orange">
                      {institution.summary_stats['2yr_mean_citedness'].toFixed(2)}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      2yr Mean Citedness
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              {institution.repositories && institution.repositories.length > 0 && (
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper p="lg" radius="md" withBorder>
                    <Stack gap="xs" align="center">
                      <Text size="lg" fw={600} c="orange">
                        {institution.repositories.length}
                      </Text>
                      <Text size="sm" c="dimmed" ta="center">
                        Repositories
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
              )}
              {institution.associated_institutions && institution.associated_institutions.length > 0 && (
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper p="lg" radius="md" withBorder>
                    <Stack gap="xs" align="center">
                      <Text size="lg" fw={600} c="orange">
                        {institution.associated_institutions.length}
                      </Text>
                      <Text size="sm" c="dimmed" ta="center">
                        Associated Institutions
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
              )}
              {institution.lineage && institution.lineage.length > 0 && (
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper p="lg" radius="md" withBorder>
                    <Stack gap="xs" align="center">
                      <Text size="lg" fw={600} c="orange">
                        {institution.lineage.length}
                      </Text>
                      <Text size="sm" c="dimmed" ta="center">
                        Lineage Institutions
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
              )}
            </Grid>

            {/* Enhanced Institution Details */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconInfoCircle size={20} />
                <Title order={2} size="lg">Institution Details</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Institution Type
                    </Text>
                    <Badge 
                      size="lg" 
                      variant="light" 
                      color="institution"
                      radius="sm"
                      tt="capitalize"
                    >
                      {institution.type}
                    </Badge>
                  </Paper>
                </Grid.Col>
                
                {institution.country_code && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Country Code
                      </Text>
                      <Text size="sm" fw={500}>
                        {institution.country_code}
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}
                
                {institution.ror && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        ROR Identifier
                      </Text>
                      <Text size="sm" fw={500} ff="mono">
                        {institution.ror}
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}
                
                {institution.type_id && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Type ID
                      </Text>
                      <Text size="sm" fw={500} ff="mono">
                        {institution.type_id}
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}
              </Grid>
            </Card>

            {/* Enhanced Geographic Information */}
            {institution.geo && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconMapPin size={20} />
                  <Title order={2} size="lg">Geographic Information</Title>
                </Group>
                
                <Grid>
                  {institution.geo.city && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" withBorder radius="sm" bg="blue.0">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          City
                        </Text>
                        <Text size="sm" fw={500}>
                          {institution.geo.city}
                        </Text>
                      </Paper>
                    </Grid.Col>
                  )}
                  
                  {institution.geo.region && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" withBorder radius="sm" bg="blue.0">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          Region
                        </Text>
                        <Text size="sm" fw={500}>
                          {institution.geo.region}
                        </Text>
                      </Paper>
                    </Grid.Col>
                  )}
                  
                  {institution.geo.country && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" withBorder radius="sm" bg="blue.0">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          Country
                        </Text>
                        <Text size="sm" fw={500}>
                          {institution.geo.country}
                        </Text>
                      </Paper>
                    </Grid.Col>
                  )}
                  
                  {institution.geo.latitude && institution.geo.longitude && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" withBorder radius="sm" bg="blue.0">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          Coordinates
                        </Text>
                        <Text size="sm" fw={500} ff="mono">
                          {institution.geo.latitude.toFixed(4)}, {institution.geo.longitude.toFixed(4)}
                        </Text>
                      </Paper>
                    </Grid.Col>
                  )}
                  
                  {institution.geo.geonames_city_id && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" withBorder radius="sm" bg="blue.0">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          GeoNames City ID
                        </Text>
                        <Text size="sm" fw={500} ff="mono">
                          {institution.geo.geonames_city_id}
                        </Text>
                      </Paper>
                    </Grid.Col>
                  )}
                </Grid>
              </Card>
            )}

            {/* Enhanced Alternative Names */}
            {((institution.display_name_alternatives?.length ?? 0) > 0 || (institution.display_name_acronyms?.length ?? 0) > 0) && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconId size={20} />
                  <Title order={2} size="lg">Alternative Names & Acronyms</Title>
                </Group>
                
                <Stack gap="md">
                  {institution.display_name_alternatives && institution.display_name_alternatives.length > 0 && (
                    <div>
                      <Text size="sm" fw={600} mb="xs" c="dimmed">
                        Alternative Names
                      </Text>
                      <Group gap="xs">
                        {institution.display_name_alternatives.map((name, index) => (
                          <Badge key={index} variant="outline" size="md" radius="sm">
                            {name}
                          </Badge>
                        ))}
                      </Group>
                    </div>
                  )}
                  
                  {institution.display_name_acronyms && institution.display_name_acronyms.length > 0 && (
                    <div>
                      <Text size="sm" fw={600} mb="xs" c="dimmed">
                        Acronyms
                      </Text>
                      <Group gap="xs">
                        {institution.display_name_acronyms.map((acronym, index) => (
                          <Badge key={index} variant="filled" size="md" radius="sm" color="institution">
                            {acronym}
                          </Badge>
                        ))}
                      </Group>
                    </div>
                  )}
                </Stack>
              </Card>
            )}

            {/* Enhanced Associated Institutions */}
            {institution.associated_institutions && institution.associated_institutions.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconUsers size={20} />
                  <Title order={2} size="lg">Associated Institutions</Title>
                </Group>
                
                <Stack gap="md">
                  {institution.associated_institutions.map((assocInst, index) => (
                    <Paper key={index} p="md" withBorder radius="sm">
                      <Group justify="space-between" align="flex-start">
                        <Stack gap="xs" style={{ flex: 1 }}>
                          <Text fw={500}>{assocInst.display_name}</Text>
                          <Group gap="xs">
                            <Badge size="sm" variant="light" color="institution">
                              {assocInst.type}
                            </Badge>
                            <Badge size="sm" variant="outline">
                              {assocInst.relationship}
                            </Badge>
                            {assocInst.country_code && (
                              <Badge size="sm" variant="light">
                                {assocInst.country_code}
                              </Badge>
                            )}
                          </Group>
                        </Stack>
                        {assocInst.ror && (
                          <Text size="xs" c="dimmed" ff="mono">
                            {assocInst.ror}
                          </Text>
                        )}
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Card>
            )}

            {/* Enhanced Repositories */}
            {institution.repositories && institution.repositories.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconBooks size={20} />
                  <Title order={2} size="lg">Repositories</Title>
                </Group>
                
                <List spacing="sm" size="sm" center>
                  {institution.repositories.map((repo, index) => (
                    <List.Item key={index}>
                      <Text ff="mono" size="sm">{repo}</Text>
                    </List.Item>
                  ))}
                </List>
              </Card>
            )}

            {/* Enhanced Research Topics */}
            {institution.topics && institution.topics.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconTags size={20} />
                  <Title order={2} size="lg">Research Topics</Title>
                </Group>
                
                <Group gap="sm">
                  {institution.topics.map((topic) => (
                    <Badge
                      key={topic.id}
                      variant="light"
                      size="md"
                      radius="sm"
                      color="institution"
                    >
                      {topic.display_name}
                    </Badge>
                  ))}
                </Group>
              </Card>
            )}

            {/* Enhanced Temporal Information */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconCalendar size={20} />
                <Title order={2} size="lg">Temporal Information</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Created Date
                    </Text>
                    <Text size="sm" fw={500}>
                      {new Date(institution.created_date).toLocaleDateString()}
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Last Updated
                    </Text>
                    <Text size="sm" fw={500}>
                      {new Date(institution.updated_date).toLocaleDateString()}
                    </Text>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>

            {/* Enhanced External Links */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconLink size={20} />
                <Title order={2} size="lg">External Links & Resources</Title>
              </Group>
              
              <Grid>
                {externalLinks.map((link, index) => {
                  if (!link) return null;
                  
                  const getIcon = () => {
                    switch (link.type) {
                      case 'homepage':
                        return <IconGlobe size={16} />;
                      case 'ror':
                        return <IconBuildingBank size={16} />;
                      case 'wikidata':
                      case 'wikipedia':
                        return <IconWorld size={16} />;
                      default:
                        return <IconExternalLink size={16} />;
                    }
                  };

                  const getColor = () => {
                    switch (link.type) {
                      case 'homepage':
                        return 'blue';
                      case 'ror':
                        return 'orange';
                      case 'wikidata':
                      case 'wikipedia':
                        return 'green';
                      default:
                        return 'institution';
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
            data={institution}
            title="Institution Raw Data"
            entityType="institution"
            entityId={institution.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageTemplate>
  );
}

function InstitutionPage() {
  const { id } = Route.useParams();
  const isRedirecting = useNumericIdRedirect(id, EntityType.INSTITUTION);
  
  const { 
    data: institution, 
    loading, 
    error, 
    retry 
  } = useInstitutionData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Institution fetch error:', error);
    }
  });

  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="institutions" entityId={id}>
        <EntitySkeleton entityType={EntityType.INSTITUTION} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="institutions" entityId={id}>
        <EntitySkeleton entityType={EntityType.INSTITUTION} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="institutions" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.INSTITUTION}
        />
      </EntityErrorBoundary>
    );
  }

  // Show institution data
  if (institution) {
    return (
      <EntityErrorBoundary entityType="institutions" entityId={id}>
        <InstitutionDisplay institution={institution} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="institutions" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.INSTITUTION}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/institutions/$id')({
  component: InstitutionPage,
});