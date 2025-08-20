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
  ActionIcon,
  Loader,
  Box,
  Badge as _Badge,
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
  getValidationSeverityColor as _getValidationSeverityColor,
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
  showValidationIcon?: boolean;
  showValidationSummary?: boolean;
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
// Hook for field state
const useAccessibleValidationFieldState = (config: FieldConfig, validator?: RealTimeValidator) => {
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
  const [_focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  
  const validatorRef = useRef(validator || new RealTimeValidator());
  
  return {
    fieldId, errorId, helpId, statusId,
    validationState, setValidationState,
    showPassword, setShowPassword,
    focused: _focused, setFocused,
    touched, setTouched,
    validatorRef,
  };
};

// Hook for validation logic
const useAccessibleValidationFieldValidation = (
  config: FieldConfig, 
  fieldState: ReturnType<typeof useAccessibleValidationFieldState>,
  onValidationChange?: (isValid: boolean, issues: ValidationIssue[]) => void
) => {
  const { validatorRef, setValidationState, touched: _touched } = fieldState;
  
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
  }, [config, onValidationChange, validatorRef, setValidationState]);
  
  return { validateField };
};

// Hook for event handlers
const useAccessibleValidationFieldHandlers = (
  config: FieldConfig,
  fieldState: ReturnType<typeof useAccessibleValidationFieldState>,
  onChange: (value: unknown) => void,
  value: unknown,
  validateField: (fieldValue: unknown) => Promise<void>
) => {
  const { setFocused, setTouched, touched } = fieldState;
  
  const handleChange = useCallback((newValue: unknown) => {
    onChange(newValue);
    if (!touched) setTouched(true);
  }, [onChange, touched, setTouched]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    setTouched(true);
    if (config.validateOnBlur) {
      validateField(value);
    }
  }, [config.validateOnBlur, value, validateField, setFocused, setTouched]);

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, [setFocused]);
  
  return { handleChange, handleBlur, handleFocus };
};

export function AccessibleValidationField({
  config,
  value,
  onChange,
  onValidationChange,
  validator,
  className,
  'data-testid': testId,
}: AccessibleValidationFieldProps) {
  const fieldState = useAccessibleValidationFieldState(config, validator);
  const [debouncedValue] = useDebouncedValue(value, 300);
  
  const validation = useAccessibleValidationFieldValidation(config, fieldState, onValidationChange);
  const handlers = useAccessibleValidationFieldHandlers(config, fieldState, onChange, value, validation.validateField);
  
  // Real-time validation effect
  useEffect(() => {
    if (!config.validateOnChange || !fieldState.touched) return;
    
    validation.validateField(debouncedValue);
  }, [debouncedValue, config.validateOnChange, fieldState.touched, validation]);
  
  const fieldHelpers = useAccessibleValidationFieldHelpers(config, fieldState);
  
  return (
    <AccessibleValidationFieldLayout
      config={config}
      value={value}
      fieldState={fieldState}
      handlers={handlers}
      fieldHelpers={fieldHelpers}
      className={className}
      testId={testId}
    />
  );
}

// Hook for field helper functions

// Hook for field helper functions
const useAccessibleValidationFieldHelpers = (
  config: FieldConfig,
  fieldState: ReturnType<typeof useAccessibleValidationFieldState>
) => {
  const { validationState } = fieldState;
  
  const getErrorMessage = useCallback(() => {
    if (!validationState.issues.length) return null;
    
    const errorIssues = validationState.issues.filter(issue => 
      issue.severity === ValidationSeverity.ERROR
    );
    
    if (!errorIssues.length) return null;
    
    return errorIssues.map(issue => issue.description).join('. ');
  }, [validationState.issues]);
  
  const getWarningMessage = useCallback(() => {
    if (!validationState.issues.length) return null;
    
    const warningIssues = validationState.issues.filter(issue => 
      issue.severity === ValidationSeverity.WARNING
    );
    
    if (!warningIssues.length) return null;
    
    return warningIssues.map(issue => issue.description).join('. ');
  }, [validationState.issues]);
  
  const getValidationIcon = useCallback(() => {
    if (validationState.isValidating) {
      return <Loader size="xs" />;
    }
    
    if (validationState.isValid === true) {
      return <IconCheck size={16} style={{ color: 'var(--mantine-color-green-6)' }} />;
    }
    
    if (validationState.isValid === false) {
      return <IconX size={16} style={{ color: 'var(--mantine-color-red-6)' }} />;
    }
    
    return null;
  }, [validationState]);
  
  const getValidationStatus = useCallback(() => {
    if (validationState.isValidating) return 'Validating...';
    if (validationState.isValid === true) return 'Valid';
    if (validationState.isValid === false) return 'Invalid';
    return '';
  }, [validationState]);
  
  return {
    getErrorMessage,
    getWarningMessage,
    getValidationIcon,
    getValidationStatus,
  };
};

// Layout component interface
interface AccessibleValidationFieldLayoutProps {
  config: FieldConfig;
  value: unknown;
  fieldState: ReturnType<typeof useAccessibleValidationFieldState>;
  handlers: ReturnType<typeof useAccessibleValidationFieldHandlers>;
  fieldHelpers: ReturnType<typeof useAccessibleValidationFieldHelpers>;
  className?: string;
  testId?: string;
}

// Main layout component
const AccessibleValidationFieldLayout = ({
  config,
  value,
  fieldState,
  handlers,
  fieldHelpers,
  className,
  testId,
}: AccessibleValidationFieldLayoutProps) => {
  const { fieldId: _fieldId, errorId: _errorId, helpId: _helpId, statusId: _statusId, validationState: _validationState, showPassword: _showPassword, setShowPassword: _setShowPassword } = fieldState;
  const errorMessage = fieldHelpers.getErrorMessage();
  const warningMessage = fieldHelpers.getWarningMessage();
  
  return (
    <Stack gap="xs" className={className} data-testid={testId}>
      <AccessibleValidationFieldInput
        config={config}
        value={value}
        fieldState={fieldState}
        handlers={handlers}
        fieldHelpers={fieldHelpers}
      />
      
      <AccessibleValidationFieldFeedback
        config={config}
        fieldState={fieldState}
        fieldHelpers={fieldHelpers}
        errorMessage={errorMessage}
        warningMessage={warningMessage}
      />
    </Stack>
  );
};

// Input component
interface AccessibleValidationFieldInputProps {
  config: FieldConfig;
  value: unknown;
  fieldState: ReturnType<typeof useAccessibleValidationFieldState>;
  handlers: ReturnType<typeof useAccessibleValidationFieldHandlers>;
  fieldHelpers: ReturnType<typeof useAccessibleValidationFieldHelpers>;
}

// eslint-disable-next-line complexity
const AccessibleValidationFieldInput = ({
  config,
  value,
  fieldState,
  handlers,
  fieldHelpers,
}: AccessibleValidationFieldInputProps) => {
  const { fieldId, errorId, helpId, statusId, validationState, showPassword, setShowPassword } = fieldState;
  const errorMessage = fieldHelpers.getErrorMessage();
  
  const commonProps = {
    id: fieldId,
    label: config.label,
    description: config.description,
    required: config.required,
    disabled: config.disabled,
    placeholder: config.placeholder,
    onChange: handlers.handleChange,
    onBlur: handlers.handleBlur,
    onFocus: handlers.handleFocus,
    error: errorMessage,
    'aria-describedby': [config.description ? helpId : '', errorMessage ? errorId : '', statusId].filter(Boolean).join(' '),
    'aria-invalid': validationState.isValid === false,
    rightSection: config.showValidationIcon ? fieldHelpers.getValidationIcon() : undefined,
  };
  
  // Render appropriate input type
  switch (config.type) {
    case 'text':
    case 'email':
    case 'url':
      return <TextInput {...commonProps} value={value as string || ''} type={config.type} />;
      
    case 'password':
      return (
        <TextInput
          {...commonProps}
          value={value as string || ''}
          type={showPassword ? 'text' : 'password'}
          rightSection={
            <Group gap={4}>
              <ActionIcon
                variant="subtle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </ActionIcon>
              {config.showValidationIcon && fieldHelpers.getValidationIcon()}
            </Group>
          }
        />
      );
      
    case 'number':
      return (
        <NumberInput
          {...commonProps}
          value={value as number || undefined}
          min={getFieldMin(config)}
          max={getFieldMax(config)}
          step={config.step}
          decimalScale={config.precision}
        />
      );
      
    case 'textarea':
      return (
        <Textarea
          {...commonProps}
          value={value as string || ''}
          rows={config.rows || 3}
          autosize={config.autosize}
          minRows={config.minRows}
          maxRows={config.maxRows}
        />
      );
      
    case 'select':
      return (
        <Select
          {...commonProps}
          value={value as string || ''}
          data={config.options || []}
          searchable={config.searchable}
          clearable={config.clearable}
        />
      );
      
    case 'multiselect':
      return (
        <MultiSelect
          {...commonProps}
          value={value as string[] || []}
          data={config.options || []}
          searchable={config.searchable}
          clearable={config.clearable}
        />
      );
      
    case 'checkbox':
      return (
        <Checkbox
          id={fieldId}
          label={config.label}
          description={config.description}
          required={config.required}
          disabled={config.disabled}
          checked={Boolean(value)}
          onChange={(event) => handlers.handleChange(event.currentTarget.checked)}
          onBlur={handlers.handleBlur}
          onFocus={handlers.handleFocus}
          error={errorMessage}
          aria-describedby={[config.description ? helpId : '', errorMessage ? errorId : ''].filter(Boolean).join(' ')}
          aria-invalid={validationState.isValid === false}
        />
      );
      
    case 'switch':
      return (
        <Switch
          id={fieldId}
          label={config.label}
          description={config.description}
          required={config.required}
          disabled={config.disabled}
          checked={Boolean(value)}
          onChange={(event) => handlers.handleChange(event.currentTarget.checked)}
          onBlur={handlers.handleBlur}
          onFocus={handlers.handleFocus}
          error={errorMessage}
          aria-describedby={[config.description ? helpId : '', errorMessage ? errorId : ''].filter(Boolean).join(' ')}
          aria-invalid={validationState.isValid === false}
        />
      );
      
    default:
      return <TextInput {...commonProps} value={value as string || ''} />;
  }
};

// Feedback component
interface AccessibleValidationFieldFeedbackProps {
  config: FieldConfig;
  fieldState: ReturnType<typeof useAccessibleValidationFieldState>;
  fieldHelpers: ReturnType<typeof useAccessibleValidationFieldHelpers>;
  errorMessage: string | null;
  warningMessage: string | null;
}

const AccessibleValidationFieldFeedback = ({
  config,
  fieldState,
  fieldHelpers,
  errorMessage,
  warningMessage,
}: AccessibleValidationFieldFeedbackProps) => {
  const { errorId, helpId, statusId, validationState } = fieldState;
  
  return (
    <>
      {/* Validation status for screen readers */}
      <div
        id={statusId}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {fieldHelpers.getValidationStatus()}
      </div>
      
      {/* Error message */}
      {errorMessage && (
        <Transition mounted={Boolean(errorMessage)} transition="fade" duration={200}>
          {(styles) => (
            <Alert
              id={errorId}
              icon={<IconAlertTriangle size={16} />}
              color="red"
              variant="light"
              style={styles}
            >
              {errorMessage}
            </Alert>
          )}
        </Transition>
      )}
      
      {/* Warning message */}
      {warningMessage && !errorMessage && (
        <Transition mounted={Boolean(warningMessage)} transition="fade" duration={200}>
          {(styles) => (
            <Alert
              icon={<IconInfoCircle size={16} />}
              color="yellow"
              variant="light"
              style={styles}
            >
              {warningMessage}
            </Alert>
          )}
        </Transition>
      )}
      
      {/* Validation issues summary */}
      {config.showValidationSummary && validationState.issues.length > 0 && (
        <Paper p="xs" withBorder>
          <Text size="sm" fw={500} mb={4}>Validation Issues:</Text>
          <Stack gap={2}>
            {validationState.issues.map((issue, index) => (
              <Group key={index} gap={6}>
                <_Badge
                  size="xs"
                  color={_getValidationSeverityColor(issue.severity)}
                  variant="light"
                >
                  {issue.severity}
                </_Badge>
                <Text size="xs">{issue.description}</Text>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}
      
      {/* Help text */}
      {config.helpText && (
        <Group gap={4}>
          <IconHelp size={14} style={{ color: 'var(--mantine-color-gray-6)' }} />
          <Text id={helpId} size="xs" c="dimmed">
            {config.helpText}
          </Text>
        </Group>
      )}
    </>
  );
};

/**
 * Validation suggestions component
 */
function _ValidationSuggestions({ issues }: { issues: ValidationIssue[] }) {
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