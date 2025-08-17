import { Stack, Text, Paper, Group } from '@mantine/core';
import { useEffect } from 'react';

import { ValidationIndicator } from '@/components/atoms/validation-indicator';
import type { Work } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityValidationStore } from '@/stores/entity-validation-store';

interface WorkDisplayProps {
  entity: Work;
}

export function WorkDisplay({ entity: work }: WorkDisplayProps) {
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

  return (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Group justify="space-between" align="start" mb="md">
          <Text size="xl" fw={700}>
            {work.display_name}
          </Text>
          <ValidationIndicator
            entityId={work.id}
            entityType={EntityType.WORK}
            showManageLink
          />
        </Group>
        <Text c="dimmed" mb="xs">
          Work ID: {work.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {work.cited_by_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Publication Year: {work.publication_year}
        </Text>
        {work.primary_location?.source && (
          <Text c="dimmed" mb="xs">
            Source: {work.primary_location.source.display_name}
          </Text>
        )}
      </Paper>
    </Stack>
  );
}