import { Stack, Text, Paper } from '@mantine/core';
import { useEffect } from 'react';

import { PageWithPanes, EntityPageHeader, StatusIndicator, TwoPaneLayout } from '@/components';
import type { Institution } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityValidationStore } from '@/stores/entity-validation-store';

interface InstitutionDisplayProps {
  entity: Institution;
  useTwoPaneLayout?: boolean;
  graphPane?: React.ReactNode;
}

export function InstitutionDisplay({ entity: institution, useTwoPaneLayout = false, graphPane }: InstitutionDisplayProps) {
  const { 
    validateEntity, 
    getValidationResult, 
    hasValidationIssues, 
    getEntityIssueCount,
    getEntityHighestSeverity 
  } = useEntityValidationStore();

  // Validate entity on mount and when entity changes
  useEffect(() => {
    validateEntity(institution.id, EntityType.INSTITUTION, institution, institution.display_name);
  }, [institution.id, institution, validateEntity]);

  // Get validation state
  const validationResult = getValidationResult(institution.id);
  const hasIssues = hasValidationIssues(institution.id);
  const issueCount = getEntityIssueCount(institution.id);
  const highestSeverity = getEntityHighestSeverity(institution.id);

  // Map validation severity to status indicator values
  const getValidationStatus = (): 'verified' | 'pending' | 'deprecated' => {
    if (!validationResult) return 'pending';
    if (!hasIssues) return 'verified';
    if (highestSeverity === 'error') return 'deprecated';
    return 'pending'; // for warnings
  };

  // Create header content
  const headerContent = (
    <EntityPageHeader
      entityType={EntityType.INSTITUTION}
      title={institution.display_name}
      entityId={institution.id}
      subtitle={institution.type}
      externalIds={institution.ids}
      statusInfo={[
        validationResult && (
          <div key="validation" title={hasIssues ? `${issueCount} validation issues` : 'No validation issues found'}>
            <StatusIndicator
              status={getValidationStatus()}
              showLabel={true}
            />
          </div>
        ),
      ].filter(Boolean)}
      metadata={[
        { label: 'Works Count', value: (institution.works_count ?? 0).toLocaleString() },
        { label: 'Type', value: institution.type },
        ...(institution.country_code ? [{ label: 'Country', value: institution.country_code }] : []),
      ]}
    />
  );

  // Create detailed content for left pane
  const institutionContent = (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text size="xl" fw={700} mb="md">
          Institution Details
        </Text>
        <Text c="dimmed" mb="xs">Institution ID: {institution.id}</Text>
        <Text c="dimmed" mb="xs">Works Count: {institution.works_count ?? 0}</Text>
        <Text c="dimmed" mb="xs">Type: {institution.type}</Text>
        {institution.country_code && <Text c="dimmed" mb="xs">Country: {institution.country_code}</Text>}
      </Paper>
    </Stack>
  );

  if (useTwoPaneLayout && graphPane) {
    return (
      <PageWithPanes
        headerContent={headerContent}
        leftPane={institutionContent}
        rightPane={graphPane}
        paneControlLabels={{ left: 'Institution Data', right: 'Graph View' }}
        twoPaneLayoutProps={{
          stateKey: `institution-${institution.id}`,
          defaultSplit: 65,
          mobileTabLabels: { left: 'Institution', right: 'Graph' },
        }}
      />
    );
  }

  return (
    <div>
      {headerContent}
      {institutionContent}
    </div>
  );
}