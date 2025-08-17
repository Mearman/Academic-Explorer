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

// Component for general validation settings
function GeneralSettings({ 
  settings, 
  onSettingChange, 
  disabled 
}: { 
  settings: ValidationSettings; 
  onSettingChange: (field: keyof ValidationSettings, value: ValidationSettings[keyof ValidationSettings]) => void; 
  disabled?: boolean;
}) {
  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Title order={5}>General Settings</Title>
        
        <Switch
          label="Enable validation"
          description="Turn validation on or off globally"
          checked={settings.enabled}
          onChange={(event) => onSettingChange('enabled', event.currentTarget.checked)}
          disabled={disabled}
        />
        
        <Switch
          label="Auto-validate on entity load"
          description="Automatically validate entities when they are loaded"
          checked={settings.autoValidateOnLoad}
          onChange={(event) => onSettingChange('autoValidateOnLoad', event.currentTarget.checked)}
          disabled={disabled || !settings.enabled}
        />
        
        <Switch
          label="Show validation indicators"
          description="Display validation status badges and icons in the UI"
          checked={settings.showValidationIndicators}
          onChange={(event) => onSettingChange('showValidationIndicators', event.currentTarget.checked)}
          disabled={disabled || !settings.enabled}
        />
      </Stack>
    </Paper>
  );
}

// Component for display settings
function DisplaySettings({ 
  settings, 
  onSettingChange, 
  disabled 
}: { 
  settings: ValidationSettings; 
  onSettingChange: (field: keyof ValidationSettings, value: ValidationSettings[keyof ValidationSettings]) => void; 
  disabled?: boolean;
}) {
  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Title order={5}>Display Settings</Title>
        
        <Switch
          label="Show warnings"
          description="Display validation warnings in addition to errors"
          checked={settings.showWarnings}
          onChange={(event) => onSettingChange('showWarnings', event.currentTarget.checked)}
          disabled={disabled || !settings.enabled}
        />
        
        <Switch
          label="Show info messages"
          description="Display informational validation messages"
          checked={settings.showInfo}
          onChange={(event) => onSettingChange('showInfo', event.currentTarget.checked)}
          disabled={disabled || !settings.enabled}
        />
        
        <Select
          label="Notification threshold"
          description="Minimum severity level for showing notifications"
          data={SEVERITY_OPTIONS}
          value={settings.notificationThreshold}
          onChange={(value) => value && onSettingChange('notificationThreshold', value as ValidationSeverity)}
          disabled={disabled || !settings.enabled}
        />
      </Stack>
    </Paper>
  );
}

// Component for entity type settings
function EntityTypeSettings({ 
  settings, 
  onSettingChange, 
  disabled 
}: { 
  settings: ValidationSettings; 
  onSettingChange: (field: keyof ValidationSettings, value: ValidationSettings[keyof ValidationSettings]) => void; 
  disabled?: boolean;
}) {
  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Title order={5}>Entity Types</Title>
        
        <MultiSelect
          label="Validated entity types"
          description="Select which entity types should be validated"
          data={ENTITY_TYPE_OPTIONS}
          value={settings.validatedEntityTypes}
          onChange={(value) => onSettingChange('validatedEntityTypes', value as EntityType[])}
          disabled={disabled || !settings.enabled}
        />
        
        <Alert icon={<IconInfoCircle />} color="blue">
          Only selected entity types will be validated. Deselecting an entity type will disable validation for that type across the application.
        </Alert>
      </Stack>
    </Paper>
  );
}

// Component for data management settings
function DataManagementSettings({ 
  settings, 
  onSettingChange, 
  disabled 
}: { 
  settings: ValidationSettings; 
  onSettingChange: (field: keyof ValidationSettings, value: ValidationSettings[keyof ValidationSettings]) => void; 
  disabled?: boolean;
}) {
  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Title order={5}>Data Management</Title>
        <NumberInput
          label="Maximum log entries"
          description="Maximum number of validation log entries to keep"
          value={settings.maxLogEntries}
          onChange={(value) => onSettingChange('maxLogEntries', (value as number) || 100)}
          min={10}
          max={1000}
          step={10}
          disabled={disabled || !settings.enabled}
        />
      </Stack>
    </Paper>
  );
}

// Component for field exclusion settings
function FieldExclusionSettings({ settings }: { settings: ValidationSettings }) {
  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Title order={5}>Field Exclusions</Title>
        <Text size="sm" c="dimmed">
          Exclude specific fields from validation checks. Use dot notation for nested fields (e.g., "authorships.author.id").
        </Text>
        <Alert icon={<IconInfoCircle />} color="gray">
          Field exclusion interface coming soon. Currently using default settings.
        </Alert>
        {settings.excludedFields.length > 0 && (
          <Group>
            {settings.excludedFields.map((field) => (
              <Badge key={field} variant="light" color="gray">{field}</Badge>
            ))}
          </Group>
        )}
      </Stack>
    </Paper>
  );
}

// Component for settings actions
function SettingsActions({ isModified, onReset }: { isModified: boolean; onReset: () => void }) {
  return (
    <Group justify="space-between">
      <div>
        {isModified && <Badge color="blue" variant="light">Settings modified</Badge>}
      </div>
      <Group>
        <Button
          variant="light"
          leftSection={<IconRestore size={16} />}
          onClick={onReset}
          disabled={!isModified}
        >
          Reset to Defaults
        </Button>
        <Badge color="green" variant="light" leftSection={<IconCheck size={14} />}>
          Auto-saved
        </Badge>
      </Group>
    </Group>
  );
}

// Component for settings information
function SettingsInfo() {
  return (
    <Alert icon={<IconInfoCircle />} color="blue">
      <Stack gap="xs">
        <Text fw={500}>About Validation Settings</Text>
        <Text size="sm">
          These settings control how the application validates OpenAlex entity data.
          Validation helps identify potential schema changes, missing fields, and data quality issues.
          All settings are saved automatically and persist across browser sessions.
        </Text>
      </Stack>
    </Alert>
  );
}

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
          <Title order={4}>Validation Settings</Title>
        </Group>
        <Text size="sm" c="dimmed">
          Configure how entity validation behaves throughout the application.
        </Text>
      </div>

      <GeneralSettings 
        settings={validationSettings} 
        onSettingChange={handleSettingChange} 
      />

      <DisplaySettings 
        settings={validationSettings} 
        onSettingChange={handleSettingChange} 
      />

      <DataManagementSettings 
        settings={validationSettings} 
        onSettingChange={handleSettingChange} 
      />

      <EntityTypeSettings 
        settings={validationSettings} 
        onSettingChange={handleSettingChange} 
      />

      <FieldExclusionSettings settings={validationSettings} />

      <SettingsActions isModified={isModified} onReset={handleReset} />

      <SettingsInfo />
    </Stack>
  );
}