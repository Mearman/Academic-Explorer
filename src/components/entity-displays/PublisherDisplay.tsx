import { Stack, Text, Paper } from '@mantine/core';
import { useEffect } from 'react';

import { PageWithPanes, EntityPageHeader } from '@/components';
import type { Publisher } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityValidationStore } from '@/stores/entity-validation-store';

interface PublisherDisplayProps {
  entity: Publisher;
  useTwoPaneLayout?: boolean;
  graphPane?: React.ReactNode;
}

export function PublisherDisplay({ entity: publisher, useTwoPaneLayout = false, graphPane }: PublisherDisplayProps) {
  const { validationSettings, validateEntity } = useEntityValidationStore();

  // Auto-validate on load if enabled
  useEffect(() => {
    if (validationSettings.enabled && 
        validationSettings.autoValidateOnLoad &&
        validationSettings.validatedEntityTypes.includes(EntityType.PUBLISHER)) {
      
      validateEntity(publisher.id, EntityType.PUBLISHER, publisher, publisher.display_name).catch((error) => {
        console.warn('Failed to validate publisher:', error);
      });
    }
  }, [publisher, validateEntity, validationSettings]);

  // Extract header information
  const getSubtitle = () => {
    const parts = [];
    if (publisher.hierarchy_level !== undefined) {
      parts.push(`Level ${publisher.hierarchy_level}`);
    }
    if (publisher.country_codes && publisher.country_codes.length > 0) {
      parts.push(publisher.country_codes.join(', '));
    }
    return parts.join(' | ');
  };

  const getMetadata = () => {
    const metadata = [];
    
    if (publisher.updated_date) {
      metadata.push({
        label: 'Last Updated',
        value: new Date(publisher.updated_date).toLocaleDateString('en-GB'),
      });
    }

    if (publisher.created_date) {
      metadata.push({
        label: 'Added to OpenAlex',
        value: new Date(publisher.created_date).toLocaleDateString('en-GB'),
      });
    }
    
    return metadata;
  };

  // Create header content
  const headerContent = (
    <EntityPageHeader
      entityType={EntityType.PUBLISHER}
      title={publisher.display_name}
      entityId={publisher.id}
      subtitle={getSubtitle()}
      externalIds={publisher.ids}
      metadata={getMetadata()}
    />
  );

  const publisherContent = (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text c="dimmed" mb="xs">
          Publisher ID: {publisher.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Works Count: {publisher.works_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {publisher.cited_by_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Hierarchy Level: {publisher.hierarchy_level}
        </Text>
        {publisher.country_codes && publisher.country_codes.length > 0 && (
          <Text c="dimmed" mb="xs">
            Countries: {publisher.country_codes.join(', ')}
          </Text>
        )}
        {publisher.parent_publisher && (
          <Text c="dimmed" mb="xs">
            Parent Publisher: {publisher.parent_publisher}
          </Text>
        )}
      </Paper>
    </Stack>
  );

  if (useTwoPaneLayout && graphPane) {
    return (
      <PageWithPanes
        headerContent={headerContent}
        leftPane={publisherContent}
        rightPane={graphPane}
        twoPaneLayoutProps={{
          stateKey: `publisher-${publisher.id}`,
          defaultSplit: 65,
          mobileTabLabels: { left: 'Publisher', right: 'Graph' },
        }}
        paneControlLabels={{ left: 'Publisher Data', right: 'Graph View' }}
      />
    );
  }

  return (
    <>
      {headerContent}
      {publisherContent}
    </>
  );
}