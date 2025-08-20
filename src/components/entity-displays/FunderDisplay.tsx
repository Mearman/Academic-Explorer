import { Stack, Text, Paper } from '@mantine/core';
import { useEffect } from 'react';

import { PageWithPanes, EntityPageHeader } from '@/components';
import type { Funder } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityValidationStore } from '@/stores/entity-validation-store';

interface FunderDisplayProps {
  entity: Funder;
  useTwoPaneLayout?: boolean;
  graphPane?: React.ReactNode;
}

export function FunderDisplay({ entity: funder, useTwoPaneLayout = false, graphPane }: FunderDisplayProps) {
  const { validationSettings, validateEntity } = useEntityValidationStore();

  // Auto-validate on load if enabled
  useEffect(() => {
    if (validationSettings.enabled && 
        validationSettings.autoValidateOnLoad &&
        validationSettings.validatedEntityTypes.includes(EntityType.FUNDER)) {
      
      validateEntity({
        entityId: funder.id,
        entityType: EntityType.FUNDER,
        entityData: funder,
        entityDisplayName: funder.display_name
      }).catch((error) => {
        console.warn('Failed to validate funder:', error);
      });
    }
  }, [funder, validateEntity, validationSettings]);

  // Extract header information
  const getSubtitle = () => {
    const parts = [];
    if (funder.country_code) {
      parts.push(funder.country_code);
    }
    return parts.join(' | ');
  };

  const getMetadata = () => {
    const metadata = [];
    
    if (funder.updated_date) {
      metadata.push({
        label: 'Last Updated',
        value: new Date(funder.updated_date).toLocaleDateString('en-GB'),
      });
    }

    if (funder.created_date) {
      metadata.push({
        label: 'Added to OpenAlex',
        value: new Date(funder.created_date).toLocaleDateString('en-GB'),
      });
    }
    
    return metadata;
  };

  // Create header content
  const headerContent = (
    <EntityPageHeader
      entityType={EntityType.FUNDER}
      title={funder.display_name}
      entityId={funder.id}
      subtitle={getSubtitle()}
      externalIds={funder.ids}
      metadata={getMetadata()}
    />
  );

  const funderContent = (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text c="dimmed" mb="xs">
          Funder ID: {funder.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Works Count: {funder.works_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {funder.cited_by_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Grants Count: {funder.grants_count ?? 0}
        </Text>
        {funder.country_code && (
          <Text c="dimmed" mb="xs">
            Country: {funder.country_code}
          </Text>
        )}
        {funder.description && (
          <Text c="dimmed" mb="xs">
            Description: {funder.description}
          </Text>
        )}
      </Paper>
    </Stack>
  );

  if (useTwoPaneLayout && graphPane) {
    return (
      <PageWithPanes
        headerContent={headerContent}
        leftPane={funderContent}
        rightPane={graphPane}
        twoPaneLayoutProps={{
          stateKey: `funder-${funder.id}`,
          defaultSplit: 65,
          mobileTabLabels: { left: 'Funder', right: 'Graph' },
        }}
        paneControlLabels={{ left: 'Funder Data', right: 'Graph View' }}
      />
    );
  }

  return (
    <>
      {headerContent}
      {funderContent}
    </>
  );
}