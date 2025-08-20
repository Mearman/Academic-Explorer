/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useMemo } from 'react';

// ============================================================================
// Form Control Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FormControlProps {
  id?: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  description?: string;
  validation?: ValidationResult;
  'aria-describedby'?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface NumberRange {
  min?: number;
  max?: number;
  step?: number;
}

// ============================================================================
// Base Form Control Styles
// ============================================================================

const baseStyles = {
  formGroup: {
    marginBottom: '1rem',
  } as React.CSSProperties,
  
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--color-text)',
    marginBottom: '0.375rem',
    lineHeight: '1.4',
  } as React.CSSProperties,
  
  requiredAsterisk: {
    color: 'var(--color-error)',
    marginLeft: '0.25rem',
  } as React.CSSProperties,
  
  description: {
    fontSize: '0.75rem',
    color: 'var(--color-muted)',
    marginTop: '0.25rem',
    lineHeight: '1.4',
  } as React.CSSProperties,
  
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    backgroundColor: 'var(--color-cardBackground)',
    color: 'var(--color-text)',
    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
  } as React.CSSProperties,
  
  inputFocused: {
    borderColor: 'var(--color-primary)',
    outline: 'none',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)',
  } as React.CSSProperties,
  
  inputError: {
    borderColor: 'var(--color-error)',
  } as React.CSSProperties,
  
  inputDisabled: {
    backgroundColor: 'var(--color-muted)',
    cursor: 'not-allowed',
    opacity: 0.6,
  } as React.CSSProperties,
  
  validationMessage: {
    fontSize: '0.75rem',
    marginTop: '0.25rem',
    lineHeight: '1.4',
  } as React.CSSProperties,
  
  error: {
    color: 'var(--color-error)',
  } as React.CSSProperties,
  
  warning: {
    color: 'var(--color-warning)',
  } as React.CSSProperties,
};

// ============================================================================
// Validation Message Component
// ============================================================================

interface ValidationMessageProps {
  validation?: ValidationResult;
}

function ValidationMessage({ validation }: ValidationMessageProps) {
  if (!validation || (validation.errors.length === 0 && validation.warnings.length === 0)) {
    return null;
  }
  
  return (
    <div role="alert" aria-live="polite">
      {validation.errors.map((error, index) => (
        <div
          key={`error-${index}`}
          style={{ ...baseStyles.validationMessage, ...baseStyles.error }}
        >
          {error}
        </div>
      ))}
      {validation.warnings.map((warning, index) => (
        <div
          key={`warning-${index}`}
          style={{ ...baseStyles.validationMessage, ...baseStyles.warning }}
        >
          ⚠ {warning}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Text Input Control
// ============================================================================

export interface TextInputProps extends FormControlProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'url';
  maxLength?: number;
  pattern?: string;
  autoComplete?: string;
}

export function TextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  disabled,
  className,
  description,
  validation,
  maxLength,
  pattern,
  autoComplete,
  ...props
}: TextInputProps) {
  const hasError = validation && !validation.isValid;
  const inputId = id || `text-input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const descriptionId = `${inputId}-description`;
  
  const inputStyle = useMemo(() => ({
    ...baseStyles.input,
    ...(hasError ? baseStyles.inputError : {}),
    ...(disabled ? baseStyles.inputDisabled : {}),
  }), [hasError, disabled]);
  
  return (
    <div className={className} style={baseStyles.formGroup}>
      <label htmlFor={inputId} style={baseStyles.label}>
        {label}
        {required && <span style={baseStyles.requiredAsterisk}>*</span>}
      </label>
      
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        pattern={pattern}
        autoComplete={autoComplete}
        style={inputStyle}
        aria-describedby={description || validation ? descriptionId : undefined}
        {...props}
      />
      
      {description && (
        <div id={descriptionId} style={baseStyles.description}>
          {description}
        </div>
      )}
      
      <ValidationMessage validation={validation} />
    </div>
  );
}

// ============================================================================
// Number Input Control
// ============================================================================

export interface NumberInputProps extends FormControlProps {
  value: number;
  onChange: (value: number) => void;
  range?: NumberRange;
  unit?: string;
  precision?: number;
}

export function NumberInput({
  id,
  label,
  value,
  onChange,
  range = {},
  unit,
  precision = 0,
  required,
  disabled,
  className,
  description,
  validation,
  ...props
}: NumberInputProps) {
  const hasError = validation && !validation.isValid;
  const inputId = id || `number-input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const descriptionId = `${inputId}-description`;
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
      onChange(0);
      return;
    }
    
    const parsedValue = precision > 0 ? parseFloat(rawValue) : parseInt(rawValue, 10);
    if (!isNaN(parsedValue)) {
      onChange(parsedValue);
    }
  }, [onChange, precision]);
  
  const inputStyle = useMemo(() => ({
    ...baseStyles.input,
    ...(hasError ? baseStyles.inputError : {}),
    ...(disabled ? baseStyles.inputDisabled : {}),
  }), [hasError, disabled]);
  
  const displayValue = precision > 0 ? value.toFixed(precision) : value.toString();
  
  return (
    <div className={className} style={baseStyles.formGroup}>
      <label htmlFor={inputId} style={baseStyles.label}>
        {label}
        {unit && ` (${unit})`}
        {required && <span style={baseStyles.requiredAsterisk}>*</span>}
      </label>
      
      <input
        id={inputId}
        type="number"
        value={displayValue}
        onChange={handleChange}
        min={range.min}
        max={range.max}
        step={range.step || (precision > 0 ? Math.pow(10, -precision) : 1)}
        required={required}
        disabled={disabled}
        style={inputStyle}
        aria-describedby={description || validation ? descriptionId : undefined}
        {...props}
      />
      
      {description && (
        <div id={descriptionId} style={baseStyles.description}>
          {description}
        </div>
      )}
      
      <ValidationMessage validation={validation} />
    </div>
  );
}

// ============================================================================
// Select Control
// ============================================================================

export interface SelectProps extends FormControlProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
  className,
  description,
  validation,
  ...props
}: SelectProps) {
  const hasError = validation && !validation.isValid;
  const inputId = id || `select-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const descriptionId = `${inputId}-description`;
  
  const selectStyle = useMemo(() => ({
    ...baseStyles.input,
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...(hasError ? baseStyles.inputError : {}),
    ...(disabled ? baseStyles.inputDisabled : {}),
  }), [hasError, disabled]);
  
  return (
    <div className={className} style={baseStyles.formGroup}>
      <label htmlFor={inputId} style={baseStyles.label}>
        {label}
        {required && <span style={baseStyles.requiredAsterisk}>*</span>}
      </label>
      
      <select
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        style={selectStyle}
        aria-describedby={description || validation ? descriptionId : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            title={option.description}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {description && (
        <div id={descriptionId} style={baseStyles.description}>
          {description}
        </div>
      )}
      
      <ValidationMessage validation={validation} />
    </div>
  );
}

// ============================================================================
// Checkbox Control
// ============================================================================

export interface CheckboxProps extends FormControlProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({
  id,
  label,
  checked,
  onChange,
  required,
  disabled,
  className,
  description,
  validation,
  ...props
}: CheckboxProps) {
  const inputId = id || `checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const descriptionId = `${inputId}-description`;
  
  const labelStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--color-text)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }), [disabled]);
  
  const checkboxStyle = useMemo(() => ({
    width: '1rem',
    height: '1rem',
    marginTop: '0.125rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
  }), [disabled]);
  
  return (
    <div className={className} style={baseStyles.formGroup}>
      <label htmlFor={inputId} style={labelStyle}>
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required={required}
          disabled={disabled}
          style={checkboxStyle}
          aria-describedby={description || validation ? descriptionId : undefined}
          {...props}
        />
        <div>
          <div style={{ fontWeight: '500', lineHeight: '1.4' }}>
            {label}
            {required && <span style={baseStyles.requiredAsterisk}>*</span>}
          </div>
          {description && (
            <div id={descriptionId} style={baseStyles.description}>
              {description}
            </div>
          )}
        </div>
      </label>
      
      <ValidationMessage validation={validation} />
    </div>
  );
}

// ============================================================================
// Switch Control (Toggle)
// ============================================================================

export interface SwitchProps extends FormControlProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Switch({
  id,
  label,
  checked,
  onChange,
  required,
  disabled,
  className,
  description,
  validation,
  ...props
}: SwitchProps) {
  const inputId = id || `switch-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const descriptionId = `${inputId}-description`;
  
  const switchTrackStyle = useMemo(() => ({
    width: '3rem',
    height: '1.5rem',
    backgroundColor: checked ? 'var(--color-primary)' : 'var(--color-border)',
    borderRadius: '0.75rem',
    position: 'relative' as const,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'background-color 0.2s ease-in-out',
  }), [checked, disabled]);
  
  const switchThumbStyle = useMemo(() => ({
    width: '1.25rem',
    height: '1.25rem',
    backgroundColor: 'white',
    borderRadius: '50%',
    position: 'absolute' as const,
    top: '0.125rem',
    left: checked ? '1.625rem' : '0.125rem',
    transition: 'left 0.2s ease-in-out',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  }), [checked]);
  
  const labelStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.875rem',
    color: 'var(--color-text)',
    cursor: disabled ? 'not-allowed' : 'pointer',
  }), [disabled]);
  
  return (
    <div className={className} style={baseStyles.formGroup}>
      <label htmlFor={inputId} style={labelStyle}>
        <div style={switchTrackStyle} onClick={() => !disabled && onChange(!checked)}>
          <div style={switchThumbStyle} />
          <input
            id={inputId}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            required={required}
            disabled={disabled}
            style={{ display: 'none' }}
            aria-describedby={description || validation ? descriptionId : undefined}
            {...props}
          />
        </div>
        <div>
          <div style={{ fontWeight: '500', lineHeight: '1.4' }}>
            {label}
            {required && <span style={baseStyles.requiredAsterisk}>*</span>}
          </div>
          {description && (
            <div id={descriptionId} style={baseStyles.description}>
              {description}
            </div>
          )}
        </div>
      </label>
      
      <ValidationMessage validation={validation} />
    </div>
  );
}

// ============================================================================
// Color Picker Control
// ============================================================================

export interface ColorPickerProps extends FormControlProps {
  value: string;
  onChange: (value: string) => void;
  alpha?: boolean;
}

export function ColorPicker({
  id,
  label,
  value,
  onChange,
  alpha: _alpha = false,
  required,
  disabled,
  className,
  description,
  validation,
  ...props
}: ColorPickerProps) {
  const hasError = validation && !validation.isValid;
  const inputId = id || `color-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const descriptionId = `${inputId}-description`;
  
  const inputStyle = useMemo(() => ({
    ...baseStyles.input,
    height: '2.5rem',
    padding: '0.25rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...(hasError ? baseStyles.inputError : {}),
    ...(disabled ? baseStyles.inputDisabled : {}),
  }), [hasError, disabled]);
  
  return (
    <div className={className} style={baseStyles.formGroup}>
      <label htmlFor={inputId} style={baseStyles.label}>
        {label}
        {required && <span style={baseStyles.requiredAsterisk}>*</span>}
      </label>
      
      <input
        id={inputId}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        style={inputStyle}
        aria-describedby={description || validation ? descriptionId : undefined}
        {...props}
      />
      
      {description && (
        <div id={descriptionId} style={baseStyles.description}>
          {description}
        </div>
      )}
      
      <ValidationMessage validation={validation} />
    </div>
  );
}

// ============================================================================
// Range Slider Control
// ============================================================================

export interface RangeSliderProps extends FormControlProps {
  value: number;
  onChange: (value: number) => void;
  range: Required<NumberRange>;
  showValue?: boolean;
  unit?: string;
}

export function RangeSlider({
  id,
  label,
  value,
  onChange,
  range,
  showValue = true,
  unit,
  required,
  disabled,
  className,
  description,
  validation,
  ...props
}: RangeSliderProps) {
  const _hasError = validation && !validation.isValid;
  const inputId = id || `range-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const descriptionId = `${inputId}-description`;
  
  const sliderStyle = useMemo(() => ({
    width: '100%',
    height: '0.25rem',
    borderRadius: '0.125rem',
    backgroundColor: 'var(--color-border)',
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }), [disabled]);
  
  const valueDisplay = `${value}${unit ? ` ${unit}` : ''}`;
  
  return (
    <div className={className} style={baseStyles.formGroup}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label htmlFor={inputId} style={baseStyles.label}>
          {label}
          {required && <span style={baseStyles.requiredAsterisk}>*</span>}
        </label>
        {showValue && (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: '500' }}>
            {valueDisplay}
          </span>
        )}
      </div>
      
      <input
        id={inputId}
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={range.min}
        max={range.max}
        step={range.step}
        required={required}
        disabled={disabled}
        style={sliderStyle}
        aria-describedby={description || validation ? descriptionId : undefined}
        {...props}
      />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
        <span>{range.min}{unit ? ` ${unit}` : ''}</span>
        <span>{range.max}{unit ? ` ${unit}` : ''}</span>
      </div>
      
      {description && (
        <div id={descriptionId} style={baseStyles.description}>
          {description}
        </div>
      )}
      
      <ValidationMessage validation={validation} />
    </div>
  );
}

// ============================================================================
// Form Section Component
// ============================================================================

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  collapsible = false,
  defaultExpanded = true,
  className,
}: FormSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  
  const headerStyle = useMemo(() => ({
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid var(--color-border)',
  }), []);
  
  const titleStyle = useMemo(() => ({
    margin: 0,
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--color-text)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: collapsible ? 'pointer' : 'default',
  }), [collapsible]);
  
  const contentStyle = useMemo(() => ({
    paddingLeft: '0.5rem',
  }), []);
  
  return (
    <section className={className} style={{ marginBottom: '2rem' }}>
      <div style={headerStyle}>
        <h3
          style={titleStyle}
          onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
        >
          {title}
          {collapsible && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
        </h3>
        {description && (
          <p style={{
            margin: '0.25rem 0 0 0',
            fontSize: '0.875rem',
            color: 'var(--color-muted)',
            lineHeight: '1.4',
          }}>
            {description}
          </p>
        )}
      </div>
      
      {(!collapsible || isExpanded) && (
        <div style={contentStyle}>
          {children}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Validation Utilities
// ============================================================================

export const ValidationUtils = {
  required: (value: unknown, fieldName: string): ValidationResult => {
    const isEmpty = value === null || value === undefined || value === '';
    return {
      isValid: !isEmpty,
      errors: isEmpty ? [`${fieldName} is required`] : [],
      warnings: [],
    };
  },
  
  number: (value: number, range?: NumberRange, fieldName = 'Value'): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (isNaN(value)) {
      errors.push(`${fieldName} must be a valid number`);
    } else {
      if (range?.min !== undefined && value < range.min) {
        errors.push(`${fieldName} must be at least ${range.min}`);
      }
      if (range?.max !== undefined && value > range.max) {
        errors.push(`${fieldName} must be at most ${range.max}`);
      }
      
      // Performance warnings for large numbers
      if (range?.max !== undefined && value > range.max * 0.8) {
        warnings.push(`High ${fieldName.toLowerCase()} may impact performance`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
  
  color: (value: string, fieldName = 'Color'): ValidationResult => {
    const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
    const isValid = hexColorRegex.test(value);
    
    return {
      isValid,
      errors: isValid ? [] : [`${fieldName} must be a valid hex color (e.g., #FF0000)`],
      warnings: [],
    };
  },
  
  combine: (...results: ValidationResult[]): ValidationResult => {
    const errors = results.flatMap(r => r.errors);
    const warnings = results.flatMap(r => r.warnings);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};