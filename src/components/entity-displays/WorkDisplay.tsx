import { Stack, Text, Paper, Group, Title, Card, Badge, Grid } from '@mantine/core';
import { IconUsers, IconTag } from '@tabler/icons-react';
import { useEffect } from 'react';

import { EntityLink, PageWithPanes, EntityPageHeader, StatusIndicator, useShouldRenderTwoPaneLayout } from '@/components';
import { ValidationIndicator } from '@/components/atoms/validation-indicator';
import { WorkAbstract } from '@/components/organisms/work-abstract';
import { WorkExternalLinks } from '@/components/organisms/work-external-links';
import { WorkMetricsGrid } from '@/components/organisms/work-metrics-grid';
import { WorkPublicationDetails } from '@/components/organisms/work-publication-details';
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
  const shouldRenderTwoPaneLayout = useShouldRenderTwoPaneLayout();

  // Auto-validate on load if enabled
  useEffect(() => {
    if (validationSettings.enabled && 
        validationSettings.autoValidateOnLoad &&
        validationSettings.validatedEntityTypes.includes(EntityType.WORK)) {
      
      validateEntity({
        entityId: work.id,
        entityType: EntityType.WORK,
        entityData: work,
        entityDisplayName: work.display_name
      }).catch((error) => {
        console.warn('Failed to validate work:', error);
      });
    }
  }, [work, validateEntity, validationSettings]);

  // Extract header information
  const getSubtitle = () => {
    if (work.publication_year) {
      return `Published ${work.publication_year}`;
    }
    return '';
  };

  const getStatusInfo = () => {
    const status = [];
    
    if (work.open_access) {
      status.push(
        <StatusIndicator
          key="oa-status"
          status={work.open_access.is_oa ? 'active' : 'inactive'}
          showLabel={true}
          size="sm"
        />
      );
    }
    
    return status;
  };

  const getMetadata = () => {
    const metadata = [];
    
    if (work.updated_date) {
      metadata.push({
        label: 'Last Updated',
        value: new Date(work.updated_date).toLocaleDateString('en-GB'),
      });
    }
    
    if (work.created_date) {
      metadata.push({
        label: 'Created',
        value: new Date(work.created_date).toLocaleDateString('en-GB'),
      });
    }
    
    return metadata;
  };

  const headerContent = (
    <div>
      <EntityPageHeader
        entityType={EntityType.WORK}
        title={work.display_name}
        entityId={work.id}
        subtitle={getSubtitle()}
        alternativeNames={undefined}
        externalIds={work.ids}
        statusInfo={getStatusInfo()}
        metadata={getMetadata()}
        quickActions={
          <ValidationIndicator
            entityId={work.id}
            entityType={EntityType.WORK}
            showManageLink
          />
        }
      />
      
      {/* Core work information - always visible */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e9ecef' }}>
        <WorkMetricsGrid work={work} />
      </div>
    </div>
  );

  const workContent = (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
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
                  <Paper p="md" withBorder radius="sm" >
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
              <Paper p="md" withBorder radius="sm"  mb="md">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  Primary Topic
                </Text>
                <EntityLink
                  entityId={work.primary_topic.id}
                  displayName={work.primary_topic.display_name}
                  size="sm"
                  weight={600}
                />
                <Text size="xs" c="dimmed" mt="xs">
                  Score: {work.primary_topic.score?.toFixed(3)}
                </Text>
              </Paper>
            )}
            
            {work.topics && work.topics.length > 0 && (
              <div>
                <Text size="sm" fw={600} mb="xs">Topics</Text>
                <Group gap="xs" mb="lg">
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

  // Only render two-pane layout if requested AND we're not already inside a TwoPaneLayout
  if (useTwoPaneLayout && graphPane && shouldRenderTwoPaneLayout) {
    return (
      <PageWithPanes
        headerContent={headerContent}
        leftPane={workContent}
        rightPane={graphPane}
        twoPaneLayoutProps={{
          stateKey: `work-${work.id}`,
          defaultSplit: 65,
          mobileTabLabels: { left: 'Work', right: 'Graph' },
        }}
        paneControlLabels={{ left: 'Work Data', right: 'Graph View' }}
      />
    );
  }
  
  // If we're inside a parent TwoPaneLayout, just render the header and content together
  if (useTwoPaneLayout && !shouldRenderTwoPaneLayout) {
    return (
      <div>
        {headerContent}
        {workContent}
      </div>
    );
  }

  return workContent;
}