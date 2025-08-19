/**
 * Accessible Validation Field Component
 * 
 * A form field component with real-time validation, accessible error messages,
 * and comprehensive user feedback following WCAG guidelines.
 */

import {
  TextInput,
  NumberInput,
  Textarea,
  Select,
  MultiSelect,
  Checkbox,
  Switch,
  Text,
  Group,
  Stack,
  Alert,
  Tooltip,
  ActionIcon,
  Loader,
  Box,
  Badge,
  Transition,
  Paper,
  Button,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconInfoCircle,
  IconHelp,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useId, useState, useRef } from 'react';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { RealTimeValidator } from '@/lib/validation/real-time-validator';
import type {
  ValidationIssue,
} from '@/types/entity-validation';
import {
  ValidationIssueType,
  ValidationSeverity,
  getValidationSeverityColor,
} from '@/types/entity-validation';

// Field configuration interfaces
interface BaseFieldConfig {
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  entityType: EntityType;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  showValidationStatus?: boolean;
  ariaDescribedBy?: string;
}

interface TextFieldConfig extends BaseFieldConfig {
  type: 'text' | 'email' | 'url' | 'password';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: 'openalex_id' | 'doi' | 'orcid' | 'issn';
}

interface NumberFieldConfig extends BaseFieldConfig {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
}

interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select' | 'multiselect';
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  searchable?: boolean;
  clearable?: boolean;
  maxValues?: number;
}

interface BooleanFieldConfig extends BaseFieldConfig {
  type: 'checkbox' | 'switch';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

interface DateFieldConfig extends BaseFieldConfig {
  type: 'date' | 'daterange';
  minDate?: Date;
  maxDate?: Date;
  dateFormat?: string;
}

interface TextareaFieldConfig extends BaseFieldConfig {
  type: 'textarea';
  rows?: number;
  minRows?: number;
  maxRows?: number;
  autosize?: boolean;
}

type FieldConfig = 
  | TextFieldConfig 
  | NumberFieldConfig 
  | SelectFieldConfig 
  | BooleanFieldConfig 
  | DateFieldConfig 
  | TextareaFieldConfig;

// Validation state interface
interface ValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  issues: ValidationIssue[];
  lastValidated: number | null;
}

// Component props
interface AccessibleValidationFieldProps {
  config: FieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  onValidationChange?: (isValid: boolean, issues: ValidationIssue[]) => void;
  validator?: RealTimeValidator;
  className?: string;
  'data-testid'?: string;
}

/**
 * Main accessible validation field component
 */
export function AccessibleValidationField({
  config,
  value,
  onChange,
  onValidationChange,
  validator,
  className,
  'data-testid': testId,
}: AccessibleValidationFieldProps) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;
  const statusId = `${fieldId}-status`;
  
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    isValid: null,
    issues: [],
    lastValidated: null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  
  const validatorRef = useRef(validator || new RealTimeValidator());
  const [debouncedValue] = useDebouncedValue(value, 300);

  // Real-time validation effect
  useEffect(() => {
    if (!config.validateOnChange || !touched) return;
    
    validateField(debouncedValue);
  }, [debouncedValue, config.validateOnChange, touched]);

  // Validation function
  const validateField = useCallback(async (fieldValue: unknown) => {
    if (!validatorRef.current) return;

    setValidationState(prev => ({ ...prev, isValidating: true }));

    try {
      const result = await validatorRef.current.validateField(`${config.label}`, fieldValue, {
        required: config.required,
        type: getFieldType(config) as 'string' | 'number' | 'boolean' | 'array' | 'object',
        format: getFieldFormat(config) as 'url' | 'email' | 'openalex_id' | 'date' | 'iso_date' | undefined,
        min: getFieldMin(config),
        max: getFieldMax(config),
        entityType: config.entityType,
      });

      const newState: ValidationState = {
        isValidating: false,
        isValid: result.isValid,
        issues: result.issues,
        lastValidated: Date.now(),
      };

      setValidationState(newState);
      onValidationChange?.(result.isValid, result.issues);
    } catch (error) {
      setValidationState({
        isValidating: false,
        isValid: false,
        issues: [{
          id: 'validation-error',
          entityId: 'field',
          entityType: config.entityType,
          issueType: ValidationIssueType.TYPE_MISMATCH,
          severity: ValidationSeverity.ERROR,
          fieldPath: config.label,
          description: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
        }],
        lastValidated: Date.now(),
      });
    }
  }, [config, onValidationChange]);

  // Event handlers
  const handleChange = useCallback((newValue: unknown) => {
    onChange(newValue);
    if (!touched) setTouched(true);
  }, [onChange, touched]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    setTouched(true);
    if (config.validateOnBlur) {
      validateField(value);
    }
  }, [config.validateOnBlur, value, validateField]);

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  // Get error message with accessibility
  const getErrorMessage = useCallback(() => {
    if (!validationState.issues.length) return null;

    const primaryIssue = validationState.issues[0];
    const additionalIssues = validationState.issues.slice(1);

    return (
      <Stack gap="xs">
        <Group gap="xs">
          <IconX size={14} color="red" />
          <Text size="sm" c="red" id={errorId}>
            {primaryIssue.description}
          </Text>
        </Group>
        {additionalIssues.map((issue, index) => (
          <Text key={index} size="xs" c="dimmed" pl="lg">
            • {issue.description}
          </Text>
        ))}
      </Stack>
    );
  }, [validationState.issues, errorId]);

  // Get validation status indicator
  const getValidationStatus = () => {
    if (!config.showValidationStatus) return null;
    if (!touched && validationState.isValid === null) return null;

    return (
      <Group gap={4} id={statusId}>
        {validationState.isValidating && <Loader size="xs" />}
        {!validationState.isValidating && validationState.isValid === true && (
          <Group gap="xs">
            <IconCheck size={14} color="green" />
            <Text size="xs" c="green">Valid</Text>
          </Group>
        )}
        {!validationState.isValidating && validationState.isValid === false && (
          <Group gap="xs">
            <IconX size={14} color="red" />
            <Text size="xs" c="red">
              {validationState.issues.length} issue{validationState.issues.length !== 1 ? 's' : ''}
            </Text>
          </Group>
        )}
      </Group>
    );
  };

  // Get ARIA attributes
  const getAriaAttributes = () => {
    const describedBy = [];
    
    if (config.description || config.helpText) describedBy.push(helpId);
    if (validationState.issues.length > 0) describedBy.push(errorId);
    if (config.showValidationStatus) describedBy.push(statusId);
    if (config.ariaDescribedBy) describedBy.push(config.ariaDescribedBy);

    return {
      'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
      'aria-invalid': validationState.isValid === false,
      'aria-required': config.required,
    };
  };

  // Common field props
  const commonProps = {
    id: fieldId,
    label: config.label,
    placeholder: config.placeholder,
    disabled: config.disabled,
    error: validationState.issues.length > 0,
    onBlur: handleBlur,
    onFocus: handleFocus,
  };

  // Get additional HTML attributes for accessibility
  const ariaProps = getAriaAttributes();

  // Render field based on type
  const renderField = () => {
    switch (config.type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <TextInput
            {...commonProps}
            {...ariaProps}
            type={config.type}
            value={String(value || '')}
            onChange={(event) => handleChange(event.currentTarget.value)}
            minLength={(config as TextFieldConfig).minLength}
            maxLength={(config as TextFieldConfig).maxLength}
            rightSection={getValidationStatus()}
            data-testid={testId}
          />
        );

      case 'password':
        return (
          <TextInput
            {...commonProps}
            {...ariaProps}
            type={showPassword ? 'text' : 'password'}
            value={String(value || '')}
            onChange={(event) => handleChange(event.currentTarget.value)}
            rightSection={
              <Group gap="xs">
                <ActionIcon
                  variant="subtle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                </ActionIcon>
                {getValidationStatus()}
              </Group>
            }
            data-testid={testId}
          />
        );

      case 'number':
        return (
          <NumberInput
            {...commonProps}
            {...ariaProps}
            value={typeof value === 'number' ? value : undefined}
            onChange={(val) => handleChange(val)}
            min={(config as NumberFieldConfig).min}
            max={(config as NumberFieldConfig).max}
            step={(config as NumberFieldConfig).step}
            rightSection={getValidationStatus()}
            data-testid={testId}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            {...ariaProps}
            value={String(value || '')}
            onChange={(event) => handleChange(event.currentTarget.value)}
            rows={(config as TextareaFieldConfig).rows}
            minRows={(config as TextareaFieldConfig).minRows}
            maxRows={(config as TextareaFieldConfig).maxRows}
            autosize={(config as TextareaFieldConfig).autosize}
            data-testid={testId}
          />
        );

      case 'select':
        return (
          <Select
            {...commonProps}
            {...ariaProps}
            data={(config as SelectFieldConfig).options}
            value={String(value || '')}
            onChange={(val) => handleChange(val)}
            searchable={(config as SelectFieldConfig).searchable}
            clearable={(config as SelectFieldConfig).clearable}
            rightSection={getValidationStatus()}
            data-testid={testId}
          />
        );

      case 'multiselect':
        return (
          <MultiSelect
            {...commonProps}
            {...ariaProps}
            data={(config as SelectFieldConfig).options}
            value={Array.isArray(value) ? value.map(String) : []}
            onChange={(val) => handleChange(val)}
            searchable={(config as SelectFieldConfig).searchable}
            clearable={(config as SelectFieldConfig).clearable}
            maxValues={(config as SelectFieldConfig).maxValues}
            rightSection={getValidationStatus()}
            data-testid={testId}
          />
        );

      case 'checkbox':
        return (
          <Checkbox
            {...commonProps}
            {...ariaProps}
            checked={Boolean(value)}
            onChange={(event) => handleChange(event.currentTarget.checked)}
            size={(config as BooleanFieldConfig).size}
            data-testid={testId}
          />
        );

      case 'switch':
        return (
          <Switch
            {...commonProps}
            {...ariaProps}
            checked={Boolean(value)}
            onChange={(event) => handleChange(event.currentTarget.checked)}
            size={(config as BooleanFieldConfig).size}
            data-testid={testId}
          />
        );

      case 'date':
        return (
          <TextInput
            {...commonProps}
            {...ariaProps}
            type="date"
            value={value instanceof Date ? value.toISOString().split('T')[0] : String(value || '')}
            onChange={(event) => handleChange(new Date(event.currentTarget.value))}
            min={(config as DateFieldConfig).minDate?.toISOString().split('T')[0]}
            max={(config as DateFieldConfig).maxDate?.toISOString().split('T')[0]}
            rightSection={getValidationStatus()}
            data-testid={testId}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Box className={className}>
      <Stack gap="xs">
        {/* Field with label and validation status */}
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            {renderField()}
          </Box>
          {config.helpText && (
            <Tooltip label={config.helpText} multiline maw={300}>
              <ActionIcon variant="subtle" size="sm">
                <IconHelp size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>

        {/* Description */}
        {(config.description || config.helpText) && (
          <Text size="xs" c="dimmed" id={helpId}>
            {config.description}
          </Text>
        )}

        {/* Error messages */}
        <Transition mounted={validationState.issues.length > 0} transition="fade">
          {(styles) => (
            <div style={styles}>
              <Alert
                color="red"
                variant="light"
                p="sm"
                role="alert"
                aria-live="polite"
              >
                {getErrorMessage()}
              </Alert>
            </div>
          )}
        </Transition>

        {/* Validation suggestions */}
        {touched && validationState.issues.length > 0 && (
          <ValidationSuggestions issues={validationState.issues} />
        )}
      </Stack>
    </Box>
  );
}

/**
 * Validation suggestions component
 */
function ValidationSuggestions({ issues }: { issues: ValidationIssue[] }) {
  const suggestions = issues
    .map(issue => getValidationSuggestion(issue))
    .filter(Boolean);

  if (suggestions.length === 0) return null;

  return (
    <Paper p="sm" bg="blue.0" style={{ border: '1px solid var(--mantine-color-blue-3)' }}>
      <Group gap="xs" align="flex-start">
        <IconInfoCircle size={14} color="var(--mantine-color-blue-6)" />
        <Stack gap="xs" style={{ flex: 1 }}>
          <Text size="xs" fw={500} c="blue">Suggestions:</Text>
          {suggestions.map((suggestion, index) => (
            <Text key={index} size="xs" c="blue.7">
              • {suggestion}
            </Text>
          ))}
        </Stack>
      </Group>
    </Paper>
  );
}

/**
 * Form validation summary component
 */
interface ValidationSummaryProps {
  fields: Array<{
    name: string;
    isValid: boolean;
    issues: ValidationIssue[];
  }>;
  onScrollToField?: (fieldName: string) => void;
}

export function ValidationSummary({ fields, onScrollToField }: ValidationSummaryProps) {
  const invalidFields = fields.filter(field => !field.isValid);
  const totalIssues = fields.reduce((sum, field) => sum + field.issues.length, 0);

  if (invalidFields.length === 0) {
    return (
      <Alert color="green" icon={<IconCheck size={16} />}>
        <Text fw={500}>All fields are valid</Text>
        <Text size="sm">Your form is ready to submit.</Text>
      </Alert>
    );
  }

  return (
    <Alert 
      color="red" 
      icon={<IconAlertTriangle size={16} />}
      title={`${invalidFields.length} field${invalidFields.length !== 1 ? 's' : ''} need${invalidFields.length === 1 ? 's' : ''} attention`}
    >
      <Stack gap="xs">
        <Text size="sm">
          Found {totalIssues} issue{totalIssues !== 1 ? 's' : ''} across {invalidFields.length} field{invalidFields.length !== 1 ? 's' : ''}:
        </Text>
        
        <Stack gap="xs">
          {invalidFields.map(field => (
            <Group key={field.name} justify="space-between" align="flex-start">
              <Box style={{ flex: 1 }}>
                <Text size="sm" fw={500}>{field.name}</Text>
                <Stack gap={2}>
                  {field.issues.slice(0, 2).map((issue, index) => (
                    <Text key={index} size="xs" c="dimmed">
                      • {issue.description}
                    </Text>
                  ))}
                  {field.issues.length > 2 && (
                    <Text size="xs" c="dimmed">
                      • +{field.issues.length - 2} more issue{field.issues.length - 2 !== 1 ? 's' : ''}
                    </Text>
                  )}
                </Stack>
              </Box>
              
              {onScrollToField && (
                <Button
                  variant="light"
                  size="xs"
                  onClick={() => onScrollToField(field.name)}
                >
                  Fix
                </Button>
              )}
            </Group>
          ))}
        </Stack>
      </Stack>
    </Alert>
  );
}

// Helper functions
function getFieldType(config: FieldConfig): string {
  switch (config.type) {
    case 'text':
    case 'email':
    case 'url':
    case 'password':
    case 'textarea':
      return 'string';
    case 'number':
      return 'number';
    case 'checkbox':
    case 'switch':
      return 'boolean';
    case 'select':
    case 'multiselect':
      return config.type === 'multiselect' ? 'array' : 'string';
    case 'date':
    case 'daterange':
      return 'object';
    default:
      return 'string';
  }
}

function getFieldFormat(config: FieldConfig): string | undefined {
  if (config.type === 'email') return 'email';
  if (config.type === 'url') return 'url';
  if (config.type === 'date' || config.type === 'daterange') return 'date';
  if ('format' in config) return config.format;
  return undefined;
}

function getFieldMin(config: FieldConfig): number | undefined {
  if ('min' in config) return config.min;
  if ('minLength' in config) return config.minLength;
  return undefined;
}

function getFieldMax(config: FieldConfig): number | undefined {
  if ('max' in config) return config.max;
  if ('maxLength' in config) return config.maxLength;
  return undefined;
}

function getValidationSuggestion(issue: ValidationIssue): string | null {
  switch (issue.issueType) {
    case ValidationIssueType.MISSING_FIELD:
      return 'This field is required to continue.';
    case ValidationIssueType.INVALID_FORMAT:
      if (issue.fieldPath.includes('email')) {
        return 'Try a format like: user@example.com';
      }
      if (issue.fieldPath.includes('url')) {
        return 'Include the protocol: https://example.com';
      }
      if (issue.description.includes('OpenAlex')) {
        return 'OpenAlex IDs start with a letter (W, A, S, etc.) followed by numbers.';
      }
      return 'Check the format and try again.';
    case ValidationIssueType.VALUE_OUT_OF_RANGE:
      return 'Enter a value within the allowed range.';
    case ValidationIssueType.TYPE_MISMATCH:
      return 'Check the data type - make sure it matches what\'s expected.';
    default:
      return null;
  }
}