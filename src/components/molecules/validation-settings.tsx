/**
 * Validation Settings Component
 * 
 * Allows users to configure validation behavior, preferences, and thresholds.
 * Provides controls for enabling/disabling validation features.
 */

import {
  Paper,
  Title,
  Text,
  Stack,
  Switch,
  Select,
  MultiSelect,
  NumberInput,
  Group,
  Button,
  Alert,
  Badge,
} from '@mantine/core';
import {
  IconSettings,
  IconInfoCircle,
  IconRestore,
  IconCheck,
} from '@tabler/icons-react';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityValidationStore } from '@/stores/entity-validation-store';
import type { ValidationSeverity, ValidationSettings } from '@/types/entity-validation';
import { DEFAULT_VALIDATION_SETTINGS } from '@/types/entity-validation';

const SEVERITY_OPTIONS = [
  { value: 'error', label: 'Errors only' },
  { value: 'warning', label: 'Warnings and above' },
  { value: 'info', label: 'All (including info)' },
] as const;

const ENTITY_TYPE_OPTIONS = [
  { value: 'work', label: 'Works' },
  { value: 'author', label: 'Authors' },
  { value: 'source', label: 'Sources' },
  { value: 'institution', label: 'Institutions' },
  { value: 'publisher', label: 'Publishers' },
  { value: 'funder', label: 'Funders' },
  { value: 'topic', label: 'Topics' },
  { value: 'concept', label: 'Concepts' },
] as const;

export function ValidationSettings() {
  const {
    validationSettings,
    updateValidationSettings,
    resetValidationSettings,
  } = useEntityValidationStore();

  const handleSettingChange = (field: keyof ValidationSettings, value: ValidationSettings[keyof ValidationSettings]) => {
    updateValidationSettings({ [field]: value });
  };

  const handleReset = () => {
    resetValidationSettings();
  };

  const isModified = JSON.stringify(validationSettings) !== JSON.stringify(DEFAULT_VALIDATION_SETTINGS);

  return (
    <Stack gap="lg">
      <div>
        <Group mb="sm">
          <IconSettings size={20} />
          <Title order={4}>
            Validation Settings
          </Title>
        </Group>
        <Text size="sm" c="dimmed">
          Configure how entity validation behaves throughout the application.
        </Text>
      </div>

      {/* General Settings */}
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Title order={5}>
            General Settings
          </Title>
          
          <Switch
            label="Enable validation"
            description="Turn validation on or off globally"
            checked={validationSettings.enabled}
            onChange={(event) => handleSettingChange('enabled', event.currentTarget.checked)}
          />
          
          <Switch
            label="Auto-validate on entity load"
            description="Automatically validate entities when they are loaded"
            checked={validationSettings.autoValidateOnLoad}
            onChange={(event) => handleSettingChange('autoValidateOnLoad', event.currentTarget.checked)}
            disabled={!validationSettings.enabled}
          />
          
          <Switch
            label="Show validation indicators"
            description="Display validation status badges and icons in the UI"
            checked={validationSettings.showValidationIndicators}
            onChange={(event) => handleSettingChange('showValidationIndicators', event.currentTarget.checked)}
            disabled={!validationSettings.enabled}
          />
        </Stack>
      </Paper>

      {/* Display Settings */}
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Title order={5}>
            Display Settings
          </Title>
          
          <Switch
            label="Show warnings"
            description="Display validation warnings in addition to errors"
            checked={validationSettings.showWarnings}
            onChange={(event) => handleSettingChange('showWarnings', event.currentTarget.checked)}
            disabled={!validationSettings.enabled}
          />
          
          <Switch
            label="Show info messages"
            description="Display informational validation messages"
            checked={validationSettings.showInfo}
            onChange={(event) => handleSettingChange('showInfo', event.currentTarget.checked)}
            disabled={!validationSettings.enabled}
          />
          
          <Select
            label="Notification threshold"
            description="Minimum severity level for showing notifications"
            data={SEVERITY_OPTIONS}
            value={validationSettings.notificationThreshold}
            onChange={(value) => value && handleSettingChange('notificationThreshold', value as ValidationSeverity)}
            disabled={!validationSettings.enabled}
          />
        </Stack>
      </Paper>

      {/* Data Management */}
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Title order={5}>
            Data Management
          </Title>
          
          <NumberInput
            label="Maximum log entries"
            description="Maximum number of validation log entries to keep"
            value={validationSettings.maxLogEntries}
            onChange={(value) => handleSettingChange('maxLogEntries', (value as number) || 100)}
            min={10}
            max={1000}
            step={10}
            disabled={!validationSettings.enabled}
          />
        </Stack>
      </Paper>

      {/* Entity Types */}
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Title order={5}>
            Entity Types
          </Title>
          
          <MultiSelect
            label="Validated entity types"
            description="Select which entity types should be validated"
            data={ENTITY_TYPE_OPTIONS}
            value={validationSettings.validatedEntityTypes}
            onChange={(value) => handleSettingChange('validatedEntityTypes', value as EntityType[])}
            disabled={!validationSettings.enabled}
          />
          
          <Alert icon={<IconInfoCircle />} color="blue">
            Only selected entity types will be validated. Deselecting an entity type will disable validation for that type across the application.
          </Alert>
        </Stack>
      </Paper>

      {/* Field Exclusions */}
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Title order={5}>
            Field Exclusions
          </Title>
          
          <Text size="sm" c="dimmed">
            Exclude specific fields from validation checks. Use dot notation for nested fields (e.g., "authorships.author.id").
          </Text>
          
          {/* TODO: Implement field exclusion UI */}
          <Alert icon={<IconInfoCircle />} color="gray">
            Field exclusion interface coming soon. Currently using default settings.
          </Alert>
          
          {validationSettings.excludedFields.length > 0 && (
            <Group>
              {validationSettings.excludedFields.map((field) => (
                <Badge key={field} variant="light" color="gray">
                  {field}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>
      </Paper>

      {/* Actions */}
      <Group justify="space-between">
        <div>
          {isModified && (
            <Badge color="blue" variant="light">
              Settings modified
            </Badge>
          )}
        </div>
        
        <Group>
          <Button
            variant="light"
            leftSection={<IconRestore size={16} />}
            onClick={handleReset}
            disabled={!isModified}
          >
            Reset to Defaults
          </Button>
          
          <Badge color="green" variant="light" leftSection={<IconCheck size={14} />}>
            Auto-saved
          </Badge>
        </Group>
      </Group>

      {/* Information */}
      <Alert icon={<IconInfoCircle />} color="blue">
        <Stack gap="xs">
          <Text fw={500}>
            About Validation Settings
          </Text>
          <Text size="sm">
            These settings control how the application validates OpenAlex entity data.
            Validation helps identify potential schema changes, missing fields, and data quality issues.
            All settings are saved automatically and persist across browser sessions.
          </Text>
        </Stack>
      </Alert>
    </Stack>
  );
}