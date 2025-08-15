import { Card, Group, Title, Grid, Paper, Text, Badge, Stack, List, Anchor } from '@mantine/core';
import { 
  IconFileText, 
  IconBuildingBank, 
  IconId, 
  IconTags,
  IconChartLine,
  IconCalendar 
} from '@tabler/icons-react';
import React from 'react';

import { EntityLink, ConceptList } from '@/components';
import type { Source } from '@/lib/openalex/types';

interface SourcePublicationDetailsProps {
  source: Source;
}

/**
 * Display comprehensive publication details for a source
 */
export function SourcePublicationDetails({ source }: SourcePublicationDetailsProps) {
  return (
    <Stack gap="xl">
      {/* Publication Details */}
      <Card withBorder radius="md" p="xl">
        <Group mb="lg">
          <IconFileText size={20} />
          <Title order={2} size="lg">Publication Details</Title>
        </Group>
        
        <Grid>
          {source.type && (
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="md" withBorder radius="sm" bg="gray.0">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  Publication Type
                </Text>
                <Text size="sm" fw={500} tt="capitalize">
                  {source.type.replace(/[-_]/g, ' ')}
                </Text>
              </Paper>
            </Grid.Col>
          )}
          
          {source.issn_l && (
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="md" withBorder radius="sm" bg="gray.0">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  ISSN-L
                </Text>
                <Text size="sm" fw={500}>
                  {source.issn_l}
                </Text>
              </Paper>
            </Grid.Col>
          )}
          
          {source.issn && source.issn.length > 0 && (
            <Grid.Col span={12}>
              <Paper p="md" withBorder radius="sm" bg="gray.0">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  All ISSN Numbers
                </Text>
                <Group gap="xs">
                  {source.issn.map((issn) => (
                    <Badge key={issn} variant="outline" size="sm">
                      {issn}
                    </Badge>
                  ))}
                </Group>
              </Paper>
            </Grid.Col>
          )}
        </Grid>
      </Card>

      {/* Publisher Information */}
      {source.host_organization && (
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconBuildingBank size={20} />
            <Title order={2} size="lg">Publisher Information</Title>
          </Group>
          
          <Stack gap="md">
            <Paper p="md" withBorder radius="sm" bg="blue.0">
              <Group justify="space-between">
                <Stack gap="xs">
                  <EntityLink
                    entityId={source.host_organization}
                    displayName={source.host_organization_name || 'Unknown Publisher'}
                    size="sm"
                    weight={500}
                  />
                  {source.host_organization_lineage && source.host_organization_lineage.length > 1 && (
                    <Text size="xs" c="dimmed">
                      Part of larger organization
                    </Text>
                  )}
                </Stack>
                
                <Group gap="xs">
                  {source.is_oa && (
                    <Badge variant="light" color="openAccess" size="sm">
                      Open Access
                    </Badge>
                  )}
                  {source.is_in_doaj && (
                    <Badge variant="light" color="green" size="sm">
                      DOAJ
                    </Badge>
                  )}
                </Group>
              </Group>
            </Paper>
            
            {source.host_organization_lineage && source.host_organization_lineage.length > 1 && (
              <Paper p="sm" withBorder radius="sm" bg="gray.0">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  Organization Hierarchy
                </Text>
                <Group gap="xs">
                  {source.host_organization_lineage.map((orgId, index) => (
                    <React.Fragment key={index}>
                      <Text size="xs" c="dimmed">
                        {orgId}
                      </Text>
                      {index < source.host_organization_lineage!.length - 1 && (
                        <Text size="xs" c="dimmed">→</Text>
                      )}
                    </React.Fragment>
                  ))}
                </Group>
              </Paper>
            )}
          </Stack>
        </Card>
      )}

      {/* Alternative Titles */}
      {source.alternate_titles && source.alternate_titles.length > 0 && (
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconId size={20} />
            <Title order={2} size="lg">Alternative Titles</Title>
            <Badge variant="light" color="gray" radius="sm">
              {source.alternate_titles.length} alternatives
            </Badge>
          </Group>
          
          <List spacing="xs" size="sm">
            {source.alternate_titles.slice(0, 10).map((title, index) => (
              <List.Item key={index}>
                <Text size="sm">{title}</Text>
              </List.Item>
            ))}
            {source.alternate_titles.length > 10 && (
              <List.Item>
                <Text size="sm" c="dimmed" fs="italic">
                  ... and {source.alternate_titles.length - 10} more
                </Text>
              </List.Item>
            )}
          </List>
        </Card>
      )}

      {/* Research Topics */}
      {source.topics && source.topics.length > 0 && (
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconTags size={20} />
            <Title order={2} size="lg">Research Topics</Title>
            <Badge variant="light" color="blue" radius="sm">
              {source.topics.length} topics
            </Badge>
          </Group>
          
          <ConceptList 
            topics={source.topics}
            showScores={true}
            variant="badges"
            maxItems={15}
          />
        </Card>
      )}

      {/* Summary Statistics */}
      {source.summary_stats && (
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconChartLine size={20} />
            <Title order={2} size="lg">Impact Metrics</Title>
          </Group>
          
          <Grid>
            {source.summary_stats.h_index && (
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper p="md" withBorder radius="sm" bg="grape.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    h-index
                  </Text>
                  <Text size="lg" fw={600}>
                    {source.summary_stats.h_index}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Publication impact measure
                  </Text>
                </Paper>
              </Grid.Col>
            )}
            
            {source.summary_stats.i10_index && (
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper p="md" withBorder radius="sm" bg="orange.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    i10-index
                  </Text>
                  <Text size="lg" fw={600}>
                    {source.summary_stats.i10_index}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Publications with 10+ citations
                  </Text>
                </Paper>
              </Grid.Col>
            )}
            
            {source.summary_stats['2yr_mean_citedness'] && (
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper p="md" withBorder radius="sm" bg="cyan.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    2-Year Mean Citedness
                  </Text>
                  <Text size="lg" fw={600}>
                    {source.summary_stats['2yr_mean_citedness'].toFixed(2)}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Average citations per paper
                  </Text>
                </Paper>
              </Grid.Col>
            )}
          </Grid>
        </Card>
      )}

      {/* Publication Years & Activity */}
      <Card withBorder radius="md" p="xl">
        <Group mb="lg">
          <IconCalendar size={20} />
          <Title order={2} size="lg">Publication Timeline</Title>
        </Group>
        
        <Grid>
          {source.works_api_url && (
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="gray.0">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  Total Works
                </Text>
                <Text size="lg" fw={600}>
                  {source.works_count.toLocaleString()}
                </Text>
                <Anchor 
                  href={source.works_api_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="xs"
                  c="blue"
                >
                  View API
                </Anchor>
              </Paper>
            </Grid.Col>
          )}
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="md" withBorder radius="sm" bg="gray.0">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Last Updated
              </Text>
              <Text size="sm" fw={500}>
                {new Date(source.updated_date).toLocaleDateString()}
              </Text>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="md" withBorder radius="sm" bg="gray.0">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                First Indexed
              </Text>
              <Text size="sm" fw={500}>
                {new Date(source.created_date).toLocaleDateString()}
              </Text>
            </Paper>
          </Grid.Col>
        </Grid>
      </Card>
    </Stack>
  );
}