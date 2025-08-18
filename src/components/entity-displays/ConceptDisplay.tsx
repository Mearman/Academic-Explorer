import { Stack, Text, Paper } from '@mantine/core';
import { useEffect } from 'react';

import { PageWithPanes, EntityPageHeader } from '@/components';
import type { Concept } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityValidationStore } from '@/stores/entity-validation-store';

interface ConceptDisplayProps {
  entity: Concept;
  useTwoPaneLayout?: boolean;
  graphPane?: React.ReactNode;
}

export function ConceptDisplay({ entity: concept, useTwoPaneLayout = false, graphPane }: ConceptDisplayProps) {
  const { validationSettings, validateEntity } = useEntityValidationStore();

  // Auto-validate on load if enabled
  useEffect(() => {
    if (validationSettings.enabled && 
        validationSettings.autoValidateOnLoad &&
        validationSettings.validatedEntityTypes.includes(EntityType.CONCEPT)) {
      
      validateEntity(concept.id, EntityType.CONCEPT, concept, concept.display_name).catch((error) => {
        console.warn('Failed to validate concept:', error);
      });
    }
  }, [concept, validateEntity, validationSettings]);

  // Extract header information
  const getSubtitle = () => {
    const parts = [];
    if (concept.level !== undefined) {
      parts.push(`Level ${concept.level}`);
    }
    return parts.join(' | ');
  };

  const getMetadata = () => {
    const metadata = [];
    
    if (concept.updated_date) {
      metadata.push({
        label: 'Last Updated',
        value: new Date(concept.updated_date).toLocaleDateString('en-GB'),
      });
    }

    if (concept.created_date) {
      metadata.push({
        label: 'Added to OpenAlex',
        value: new Date(concept.created_date).toLocaleDateString('en-GB'),
      });
    }
    
    return metadata;
  };

  // Create header content
  const headerContent = (
    <EntityPageHeader
      entityType={EntityType.CONCEPT}
      title={concept.display_name}
      entityId={concept.id}
      subtitle={getSubtitle()}
      externalIds={concept.ids}
      metadata={getMetadata()}
    />
  );

  const conceptContent = (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text c="dimmed" mb="xs">
          Concept ID: {concept.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Works Count: {concept.works_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {concept.cited_by_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Level: {concept.level}
        </Text>
        {concept.description && (
          <Text c="dimmed" mb="xs">
            Description: {concept.description}
          </Text>
        )}
        {concept.wikidata && (
          <Text c="dimmed" mb="xs">
            Wikidata: {concept.wikidata}
          </Text>
        )}
      </Paper>
    </Stack>
  );

  if (useTwoPaneLayout && graphPane) {
    return (
      <PageWithPanes
        headerContent={headerContent}
        leftPane={conceptContent}
        rightPane={graphPane}
        twoPaneLayoutProps={{
          stateKey: `concept-${concept.id}`,
          defaultSplit: 65,
          mobileTabLabels: { left: 'Concept', right: 'Graph' },
        }}
        paneControlLabels={{ left: 'Concept Data', right: 'Graph View' }}
      />
    );
  }

  return (
    <>
      {headerContent}
      {conceptContent}
    </>
  );
}