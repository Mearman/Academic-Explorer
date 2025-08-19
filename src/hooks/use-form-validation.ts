/**
 * Form Validation Hook
 * 
 * Custom hook for managing form validation state, real-time validation,
 * and accessible error handling across multiple form fields.
 */

import { useCallback, useState, useRef, useMemo } from 'react';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { RealTimeValidator } from '@/lib/validation/real-time-validator';
import type {
  ValidationIssue,
} from '@/types/entity-validation';

// Field validation configuration
interface FieldValidationConfig {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  format?: 'url' | 'email' | 'openalex_id' | 'date' | 'iso_date';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidator?: (value: unknown) => Promise<ValidationIssue[]> | ValidationIssue[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

// Form configuration
interface FormValidationConfig {
  entityType: EntityType;
  fields: Record<string, FieldValidationConfig>;
  validateOnSubmit?: boolean;
  showValidationSummary?: boolean;
  scrollToFirstError?: boolean;
  submitOnlyWhenValid?: boolean;
}

// Field state
interface FieldState {
  value: unknown;
  isValid: boolean | null;
  issues: ValidationIssue[];
  isValidating: boolean;
  touched: boolean;
  focused: boolean;
  lastValidated: number | null;
}

// Form state
interface FormState {
  fields: Record<string, FieldState>;
  isValid: boolean | null;
  isValidating: boolean;
  hasBeenSubmitted: boolean;
  submitAttempted: boolean;
}

// Hook return type
interface UseFormValidationReturn {
  // State
  formState: FormState;
  fieldStates: Record<string, FieldState>;
  
  // Field operations
  getFieldValue: (fieldName: string) => unknown;
  setFieldValue: (fieldName: string, value: unknown) => void;
  getFieldError: (fieldName: string) => string | null;
  getFieldIssues: (fieldName: string) => ValidationIssue[];
  isFieldValid: (fieldName: string) => boolean | null;
  isFieldValidating: (fieldName: string) => boolean;
  
  // Field events
  handleFieldChange: (fieldName: string) => (value: unknown) => void;
  handleFieldBlur: (fieldName: string) => () => void;
  handleFieldFocus: (fieldName: string) => () => void;
  
  // Form operations
  validateField: (fieldName: string) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  resetField: (fieldName: string) => void;
  resetForm: () => void;
  setFormValues: (values: Record<string, unknown>) => void;
  getFormValues: () => Record<string, unknown>;
  
  // Validation summary
  getValidationSummary: () => {
    isValid: boolean;
    invalidFields: Array<{
      name: string;
      issues: ValidationIssue[];
    }>;
    totalIssues: number;
  };
  
  // Submit handling
  handleSubmit: (onSubmit: (values: Record<string, unknown>) => void | Promise<void>) => (event?: React.FormEvent) => Promise<void>;
  
  // Utilities
  scrollToField: (fieldName: string) => void;
  getFieldValidationProps: (fieldName: string) => {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    onFocus: () => void;
    error: boolean;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  };
}

/**
 * Custom hook for form validation
 */
export function useFormValidation(
  config: FormValidationConfig,
  initialValues: Record<string, unknown> = {}
): UseFormValidationReturn {
  const validatorRef = useRef(new RealTimeValidator({
    debounceMs: 300,
    enableRealTimeValidation: true,
    validateOnBlur: true,
    showErrorsInRealTime: true,
  }));

  // Initialize form state
  const [formState, setFormState] = useState<FormState>(() => {
    const fields: Record<string, FieldState> = {};
    
    Object.keys(config.fields).forEach(fieldName => {
      fields[fieldName] = {
        value: initialValues[fieldName] ?? '',
        isValid: null,
        issues: [],
        isValidating: false,
        touched: false,
        focused: false,
        lastValidated: null,
      };
    });

    return {
      fields,
      isValid: null,
      isValidating: false,
      hasBeenSubmitted: false,
      submitAttempted: false,
    };
  });

  // Debounced validation timers
  const validationTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Field element refs for scrolling
  const fieldRefs = useRef<Record<string, HTMLElement>>({});

  // Get field value
  const getFieldValue = useCallback((fieldName: string): unknown => {
    return formState.fields[fieldName]?.value ?? '';
  }, [formState.fields]);

  // Set field value
  const setFieldValue = useCallback((fieldName: string, value: unknown) => {
    setFormState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: {
          ...prev.fields[fieldName],
          value,
        },
      },
    }));
  }, []);

  // Get field error message
  const getFieldError = useCallback((fieldName: string): string | null => {
    const field = formState.fields[fieldName];
    if (!field || field.issues.length === 0) return null;
    return field.issues[0].description;
  }, [formState.fields]);

  // Get field issues
  const getFieldIssues = useCallback((fieldName: string): ValidationIssue[] => {
    return formState.fields[fieldName]?.issues ?? [];
  }, [formState.fields]);

  // Check if field is valid
  const isFieldValid = useCallback((fieldName: string): boolean | null => {
    return formState.fields[fieldName]?.isValid ?? null;
  }, [formState.fields]);

  // Check if field is validating
  const isFieldValidating = useCallback((fieldName: string): boolean => {
    return formState.fields[fieldName]?.isValidating ?? false;
  }, [formState.fields]);

  // Validate a single field
  const validateField = useCallback(async (fieldName: string): Promise<boolean> => {
    const fieldConfig = config.fields[fieldName];
    const fieldValue = getFieldValue(fieldName);
    
    if (!fieldConfig) return true;

    // Set validating state
    setFormState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: {
          ...prev.fields[fieldName],
          isValidating: true,
        },
      },
    }));

    try {
      let issues: ValidationIssue[] = [];

      // Custom validator
      if (fieldConfig.customValidator) {
        const customIssues = await fieldConfig.customValidator(fieldValue);
        issues.push(...customIssues);
      } else {
        // Use real-time validator
        const result = await validatorRef.current.validateField(fieldName, fieldValue, {
          required: fieldConfig.required,
          type: fieldConfig.type,
          format: fieldConfig.format,
          min: fieldConfig.min ?? fieldConfig.minLength,
          max: fieldConfig.max ?? fieldConfig.maxLength,
          entityType: config.entityType,
        });
        issues = result.issues;
      }

      const isValid = issues.length === 0;

      // Update field state
      setFormState(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          [fieldName]: {
            ...prev.fields[fieldName],
            isValid,
            issues,
            isValidating: false,
            lastValidated: Date.now(),
          },
        },
      }));

      return isValid;
    } catch (error) {
      // Handle validation error
      setFormState(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          [fieldName]: {
            ...prev.fields[fieldName],
            isValid: false,
            issues: [{
              id: 'validation-error',
              entityId: 'form',
              entityType: config.entityType,
              issueType: 'TYPE_MISMATCH' as any,
              severity: 'ERROR' as any,
              fieldPath: fieldName,
              description: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date().toISOString(),
            }],
            isValidating: false,
            lastValidated: Date.now(),
          },
        },
      }));

      return false;
    }
  }, [config.fields, config.entityType, getFieldValue]);

  // Validate entire form
  const validateForm = useCallback(async (): Promise<boolean> => {
    setFormState(prev => ({ ...prev, isValidating: true }));

    const fieldNames = Object.keys(config.fields);
    const validationResults = await Promise.all(
      fieldNames.map(fieldName => validateField(fieldName))
    );

    const isFormValid = validationResults.every(Boolean);

    setFormState(prev => ({
      ...prev,
      isValid: isFormValid,
      isValidating: false,
    }));

    return isFormValid;
  }, [config.fields, validateField]);

  // Handle field change with optional validation
  const handleFieldChange = useCallback((fieldName: string) => {
    return (value: unknown) => {
      const fieldConfig = config.fields[fieldName];
      
      setFieldValue(fieldName, value);
      
      // Mark as touched
      setFormState(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          [fieldName]: {
            ...prev.fields[fieldName],
            touched: true,
          },
        },
      }));

      // Validate on change if configured
      if (fieldConfig?.validateOnChange) {
        // Clear existing timer
        if (validationTimers.current[fieldName]) {
          clearTimeout(validationTimers.current[fieldName]);
        }

        // Set new timer
        validationTimers.current[fieldName] = setTimeout(() => {
          validateField(fieldName);
        }, fieldConfig.debounceMs ?? 300);
      }
    };
  }, [config.fields, setFieldValue, validateField]);

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName: string) => {
    return () => {
      const fieldConfig = config.fields[fieldName];
      
      setFormState(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          [fieldName]: {
            ...prev.fields[fieldName],
            focused: false,
            touched: true,
          },
        },
      }));

      // Validate on blur if configured
      if (fieldConfig?.validateOnBlur) {
        validateField(fieldName);
      }
    };
  }, [config.fields, validateField]);

  // Handle field focus
  const handleFieldFocus = useCallback((fieldName: string) => {
    return () => {
      setFormState(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          [fieldName]: {
            ...prev.fields[fieldName],
            focused: true,
          },
        },
      }));
    };
  }, []);

  // Reset field
  const resetField = useCallback((fieldName: string) => {
    setFormState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: {
          value: '',
          isValid: null,
          issues: [],
          isValidating: false,
          touched: false,
          focused: false,
          lastValidated: null,
        },
      },
    }));
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    const fields: Record<string, FieldState> = {};
    
    Object.keys(config.fields).forEach(fieldName => {
      fields[fieldName] = {
        value: '',
        isValid: null,
        issues: [],
        isValidating: false,
        touched: false,
        focused: false,
        lastValidated: null,
      };
    });

    setFormState({
      fields,
      isValid: null,
      isValidating: false,
      hasBeenSubmitted: false,
      submitAttempted: false,
    });
  }, [config.fields]);

  // Set form values
  const setFormValues = useCallback((values: Record<string, unknown>) => {
    setFormState(prev => {
      const newFields = { ...prev.fields };
      
      Object.entries(values).forEach(([fieldName, value]) => {
        if (newFields[fieldName]) {
          newFields[fieldName] = {
            ...newFields[fieldName],
            value,
          };
        }
      });

      return {
        ...prev,
        fields: newFields,
      };
    });
  }, []);

  // Get form values
  const getFormValues = useCallback((): Record<string, unknown> => {
    const values: Record<string, unknown> = {};
    
    Object.entries(formState.fields).forEach(([fieldName, field]) => {
      values[fieldName] = field.value;
    });

    return values;
  }, [formState.fields]);

  // Get validation summary
  const getValidationSummary = useCallback(() => {
    const invalidFields = Object.entries(formState.fields)
      .filter(([, field]) => field.isValid === false)
      .map(([name, field]) => ({
        name,
        issues: field.issues,
      }));

    const totalIssues = invalidFields.reduce((sum, field) => sum + field.issues.length, 0);

    return {
      isValid: invalidFields.length === 0,
      invalidFields,
      totalIssues,
    };
  }, [formState.fields]);

  // Scroll to field
  const scrollToField = useCallback((fieldName: string) => {
    const element = fieldRefs.current[fieldName];
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      element.focus();
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback((onSubmit: (values: Record<string, unknown>) => void | Promise<void>) => {
    return async (event?: React.FormEvent) => {
      if (event) {
        event.preventDefault();
      }

      setFormState(prev => ({ ...prev, submitAttempted: true }));

      // Validate form if configured
      let isValid = true;
      if (config.validateOnSubmit) {
        isValid = await validateForm();
      }

      // Check if we should submit only when valid
      if (config.submitOnlyWhenValid && !isValid) {
        // Scroll to first error if configured
        if (config.scrollToFirstError) {
          const summary = getValidationSummary();
          if (summary.invalidFields.length > 0) {
            scrollToField(summary.invalidFields[0].name);
          }
        }
        return;
      }

      try {
        const values = getFormValues();
        await onSubmit(values);
        
        setFormState(prev => ({ ...prev, hasBeenSubmitted: true }));
      } catch (error) {
        // Handle submission error
        console.error('Form submission error:', error);
      }
    };
  }, [config.validateOnSubmit, config.submitOnlyWhenValid, config.scrollToFirstError, validateForm, getValidationSummary, scrollToField, getFormValues]);

  // Get field validation props for easy integration
  const getFieldValidationProps = useCallback((fieldName: string) => {
    const field = formState.fields[fieldName];
    
    return {
      value: field?.value ?? '',
      onChange: handleFieldChange(fieldName),
      onBlur: handleFieldBlur(fieldName),
      onFocus: handleFieldFocus(fieldName),
      error: field?.isValid === false,
      'aria-invalid': field?.isValid === false,
      'aria-describedby': field?.issues.length > 0 ? `${fieldName}-error` : undefined,
      ref: (element: HTMLElement) => {
        if (element) {
          fieldRefs.current[fieldName] = element;
        }
      },
    };
  }, [formState.fields, handleFieldChange, handleFieldBlur, handleFieldFocus]);

  // Computed form validity
  const isFormValid = useMemo(() => {
    const fieldValidities = Object.values(formState.fields).map(field => field.isValid);
    if (fieldValidities.some(validity => validity === null)) return null;
    return fieldValidities.every(Boolean);
  }, [formState.fields]);

  // Update form validity in state
  const fieldStates = formState.fields;

  return {
    formState: {
      ...formState,
      isValid: isFormValid,
    },
    fieldStates,
    
    getFieldValue,
    setFieldValue,
    getFieldError,
    getFieldIssues,
    isFieldValid,
    isFieldValidating,
    
    handleFieldChange,
    handleFieldBlur,
    handleFieldFocus,
    
    validateField,
    validateForm,
    resetField,
    resetForm,
    setFormValues,
    getFormValues,
    
    getValidationSummary,
    
    handleSubmit,
    
    scrollToField,
    getFieldValidationProps,
  };
}