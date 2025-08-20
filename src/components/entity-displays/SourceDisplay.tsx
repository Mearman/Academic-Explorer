import { Stack, Text, Paper, Badge } from '@mantine/core';
import { useEffect } from 'react';

import { PageWithPanes, EntityPageHeader } from '@/components';
import type { Source } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityValidationStore } from '@/stores/entity-validation-store';

interface SourceDisplayProps {
  entity: Source;
  useTwoPaneLayout?: boolean;
  graphPane?: React.ReactNode;
}

export function SourceDisplay({ entity: source, useTwoPaneLayout = false, graphPane }: SourceDisplayProps) {
  const { validationSettings, validateEntity } = useEntityValidationStore();

  // Auto-validate on load if enabled
  useEffect(() => {
    if (validationSettings.enabled && 
        validationSettings.autoValidateOnLoad &&
        validationSettings.validatedEntityTypes.includes(EntityType.SOURCE)) {
      
      validateEntity({
        entityId: source.id,
        entityType: EntityType.SOURCE,
        entityData: source,
        entityDisplayName: source.display_name
      }).catch((error) => {
        console.warn('Failed to validate source:', error);
      });
    }
  }, [source, validateEntity, validationSettings]);

  // Extract header information - show core source data
  const getSubtitle = () => {
    const parts = [];
    if (source.type) {
      parts.push(source.type);
    }
    if (source.works_count && source.works_count > 0) {
      parts.push(`${source.works_count.toLocaleString()} works`);
    } else if (source.cited_by_count && source.cited_by_count > 0) {
      parts.push(`${source.cited_by_count.toLocaleString()} citations`);
    }
    return parts.join(' | ') || 'Source';
  };

  const getStatusInfo = () => {
    const status = [];
    
    if (source.is_oa) {
      status.push(
        <Badge key="open-access" variant="outline" color="green" size="sm">
          Open Access
        </Badge>
      );
    }

    if (source.is_in_doaj) {
      status.push(
        <Badge key="doaj" variant="outline" color="blue" size="sm">
          DOAJ Listed
        </Badge>
      );
    }
    
    return status;
  };

  const getMetadata = () => {
    const metadata = [];
    
    if (source.updated_date) {
      metadata.push({
        label: 'Last Updated',
        value: new Date(source.updated_date).toLocaleDateString('en-GB'),
      });
    }

    if (source.created_date) {
      metadata.push({
        label: 'Added to OpenAlex',
        value: new Date(source.created_date).toLocaleDateString('en-GB'),
      });
    }
    
    return metadata;
  };

  // Create header content
  const headerContent = (
    <EntityPageHeader
      entityType={EntityType.SOURCE}
      title={source.display_name}
      entityId={source.id}
      subtitle={getSubtitle()}
      alternativeNames={source.alternate_titles}
      externalIds={source.ids}
      statusInfo={getStatusInfo()}
      metadata={getMetadata()}
    />
  );

  const sourceContent = (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text c="dimmed" mb="xs">
          Source ID: {source.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Works Count: {source.works_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {source.cited_by_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Type: {source.type}
        </Text>
        {source.issn && (
          <Text c="dimmed" mb="xs">
            ISSN: {source.issn.join(', ')}
          </Text>
        )}
        {source.issn_l && (
          <Text c="dimmed" mb="xs">
            ISSN-L: {source.issn_l}
          </Text>
        )}
        {source.homepage_url && (
          <Text c="dimmed" mb="xs">
            Homepage: {source.homepage_url}
          </Text>
        )}
      </Paper>
    </Stack>
  );

  if (useTwoPaneLayout && graphPane) {
    return (
      <PageWithPanes
        headerContent={headerContent}
        leftPane={sourceContent}
        rightPane={graphPane}
        twoPaneLayoutProps={{
          stateKey: `source-${source.id}`,
          defaultSplit: 65,
          mobileTabLabels: { left: 'Source', right: 'Graph' },
        }}
        paneControlLabels={{ left: 'Source Data', right: 'Graph View' }}
      />
    );
  }

  return (
    <>
      {headerContent}
      {sourceContent}
    </>
  );
}