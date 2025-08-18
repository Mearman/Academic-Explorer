import { Stack, Text, Paper, Group, Title, Card, Badge, Grid } from '@mantine/core';
import { IconUsers, IconTag } from '@tabler/icons-react';
import { useEffect } from 'react';

import { ValidationIndicator } from '@/components/atoms/validation-indicator';
import { WorkMetricsGrid } from '@/components/organisms/work-metrics-grid';
import { WorkAbstract } from '@/components/organisms/work-abstract';
import { WorkPublicationDetails } from '@/components/organisms/work-publication-details';
import { WorkExternalLinks } from '@/components/organisms/work-external-links';
import { EntityLink, TwoPaneLayout } from '@/components';
import type { Work } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityValidationStore } from '@/stores/entity-validation-store';

interface WorkDisplayProps {
  entity: Work;
  useTwoPaneLayout?: boolean;
  graphPane?: React.ReactNode;
}

export function WorkDisplay({ entity: work, useTwoPaneLayout = false, graphPane }: WorkDisplayProps) {
  const { validationSettings, validateEntity } = useEntityValidationStore();

  // Auto-validate on load if enabled
  useEffect(() => {
    if (validationSettings.enabled && 
        validationSettings.autoValidateOnLoad &&
        validationSettings.validatedEntityTypes.includes(EntityType.WORK)) {
      
      validateEntity(work.id, EntityType.WORK, work, work.display_name).catch((error) => {
        console.warn('Failed to validate work:', error);
      });
    }
  }, [work.id, validateEntity, validationSettings]);

  const workContent = (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Paper p="xl" withBorder>
          <Group justify="space-between" align="start" mb="md">
            <div style={{ flex: 1 }}>
              <Title order={1} mb="sm">
                {work.display_name}
              </Title>
              <Text c="dimmed" size="sm">
                Work ID: {work.id}
              </Text>
            </div>
            <ValidationIndicator
              entityId={work.id}
              entityType={EntityType.WORK}
              showManageLink
            />
          </Group>
        </Paper>

        {/* Metrics Grid */}
        <WorkMetricsGrid work={work} />

        {/* Abstract */}
        <WorkAbstract work={work} />

        {/* Publication Details */}
        <WorkPublicationDetails work={work} />

        {/* Authors */}
        {work.authorships && work.authorships.length > 0 && (
          <Card withBorder radius="md" p="xl">
            <Group mb="lg">
              <IconUsers size={20} />
              <Title order={2} size="lg">Authors</Title>
            </Group>
            <Grid>
              {work.authorships.slice(0, 12).map((authorship, index) => (
                <Grid.Col key={index} span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Stack gap="xs">
                      {authorship.author?.id ? (
                        <EntityLink
                          entityId={authorship.author.id}
                          displayName={authorship.author.display_name || 'Unknown Author'}
                          size="sm"
                          weight={500}
                        />
                      ) : (
                        <Text size="sm" fw={500}>
                          {authorship.author?.display_name || 'Unknown Author'}
                        </Text>
                      )}
                      {authorship.institutions && authorship.institutions.length > 0 && (
                        <Text size="xs" c="dimmed">
                          {authorship.institutions
                            .map(inst => inst.display_name)
                            .filter(Boolean)
                            .join(', ')
                          }
                        </Text>
                      )}
                      {authorship.author_position && (
                        <Badge size="xs" variant="light" color="blue">
                          Position: {authorship.author_position}
                        </Badge>
                      )}
                    </Stack>
                  </Paper>
                </Grid.Col>
              ))}
            </Grid>
            {work.authorships.length > 12 && (
              <Text size="sm" c="dimmed" ta="center" mt="md">
                Showing 12 of {work.authorships.length} authors
              </Text>
            )}
          </Card>
        )}

        {/* Topics and Concepts */}
        {((work.topics && work.topics.length > 0) || (work.concepts && work.concepts.length > 0)) && (
          <Card withBorder radius="md" p="xl">
            <Group mb="lg">
              <IconTag size={20} />
              <Title order={2} size="lg">Topics & Concepts</Title>
            </Group>
            
            {work.primary_topic && (
              <Paper p="md" withBorder radius="sm" bg="blue.0" mb="md">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  Primary Topic
                </Text>
                <EntityLink
                  entityId={work.primary_topic.id}
                  displayName={work.primary_topic.display_name}
                  size="sm"
                  weight={600}
                />
                {work.primary_topic.score && (
                  <Badge size="xs" variant="light" color="blue" ml="xs">
                    Score: {work.primary_topic.score.toFixed(2)}
                  </Badge>
                )}
              </Paper>
            )}

            {work.topics && work.topics.length > 0 && (
              <div>
                <Text size="sm" fw={600} mb="xs">Topics</Text>
                <Group gap="xs" mb="md">
                  {work.topics.slice(0, 8).map((topic) => (
                    <EntityLink
                      key={topic.id}
                      entityId={topic.id}
                      displayName={`${topic.display_name} (${topic.score.toFixed(2)})`}
                      size="sm"
                      color="green.7"
                    />
                  ))}
                </Group>
              </div>
            )}

            {work.concepts && work.concepts.length > 0 && (
              <div>
                <Text size="sm" fw={600} mb="xs">Concepts</Text>
                <Group gap="xs">
                  {work.concepts.slice(0, 8).map((concept) => (
                    <EntityLink
                      key={concept.id}
                      entityId={concept.id}
                      displayName={`${concept.display_name} (${concept.score.toFixed(2)})`}
                      size="sm"
                      color="violet.7"
                    />
                  ))}
                </Group>
              </div>
            )}
          </Card>
        )}

        {/* External Links */}
        <WorkExternalLinks work={work} />
      </Stack>
    </div>
  );

  if (useTwoPaneLayout && graphPane) {
    return (
      <TwoPaneLayout
        leftPane={workContent}
        rightPane={graphPane}
        stateKey={`work-${work.id}`}
        leftTitle={work.display_name}
        rightTitle="Related Entities"
        showHeaders={true}
        mobileTabLabels={{ left: 'Work', right: 'Graph' }}
        defaultSplit={65}
      />
    );
  }

  return workContent;
}