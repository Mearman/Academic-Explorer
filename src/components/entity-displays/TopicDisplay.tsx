import { Stack, Text, Paper } from '@mantine/core';
import { useEffect } from 'react';

import { PageWithPanes, EntityPageHeader } from '@/components';
import type { Topic } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityValidationStore } from '@/stores/entity-validation-store';

interface TopicDisplayProps {
  entity: Topic;
  useTwoPaneLayout?: boolean;
  graphPane?: React.ReactNode;
}

export function TopicDisplay({ entity: topic, useTwoPaneLayout = false, graphPane }: TopicDisplayProps) {
  const { validationSettings, validateEntity } = useEntityValidationStore();

  // Auto-validate on load if enabled
  useEffect(() => {
    if (validationSettings.enabled && 
        validationSettings.autoValidateOnLoad &&
        validationSettings.validatedEntityTypes.includes(EntityType.TOPIC)) {
      
      validateEntity({
        entityId: topic.id,
        entityType: EntityType.TOPIC,
        entityData: topic,
        entityDisplayName: topic.display_name
      }).catch((error) => {
        console.warn('Failed to validate topic:', error);
      });
    }
  }, [topic, validateEntity, validationSettings]);

  // Extract header information
  const getSubtitle = () => {
    const parts = [];
    if (topic.field) {
      parts.push(topic.field.display_name);
    }
    if (topic.subfield) {
      parts.push(topic.subfield.display_name);
    }
    return parts.join(' | ');
  };

  const getMetadata = () => {
    const metadata = [];
    
    if (topic.updated_date) {
      metadata.push({
        label: 'Last Updated',
        value: new Date(topic.updated_date).toLocaleDateString('en-GB'),
      });
    }

    if (topic.created_date) {
      metadata.push({
        label: 'Added to OpenAlex',
        value: new Date(topic.created_date).toLocaleDateString('en-GB'),
      });
    }
    
    return metadata;
  };

  // Create header content
  const headerContent = (
    <EntityPageHeader
      entityType={EntityType.TOPIC}
      title={topic.display_name}
      entityId={topic.id}
      subtitle={getSubtitle()}
      externalIds={topic.ids}
      metadata={getMetadata()}
    />
  );

  const topicContent = (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text c="dimmed" mb="xs">
          Topic ID: {topic.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Works Count: {topic.works_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {topic.cited_by_count ?? 0}
        </Text>
        {topic.field && (
          <Text c="dimmed" mb="xs">
            Field: {topic.field.display_name}
          </Text>
        )}
        {topic.subfield && (
          <Text c="dimmed" mb="xs">
            Subfield: {topic.subfield.display_name}
          </Text>
        )}
        {topic.domain && (
          <Text c="dimmed" mb="xs">
            Domain: {topic.domain.display_name}
          </Text>
        )}
      </Paper>
    </Stack>
  );

  if (useTwoPaneLayout && graphPane) {
    return (
      <PageWithPanes
        headerContent={headerContent}
        leftPane={topicContent}
        rightPane={graphPane}
        twoPaneLayoutProps={{
          stateKey: `topic-${topic.id}`,
          defaultSplit: 65,
          mobileTabLabels: { left: 'Topic', right: 'Graph' },
        }}
        paneControlLabels={{ left: 'Topic Data', right: 'Graph View' }}
      />
    );
  }

  return (
    <>
      {headerContent}
      {topicContent}
    </>
  );
}