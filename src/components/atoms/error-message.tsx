'use client';

import { forwardRef, useState } from 'react';
import { Icon } from './icon';
import * as styles from './error-message.css';
import type { SizeVariant } from '../types';

export interface ErrorMessageProps {
  title?: string;
  message: string;
  details?: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  size?: SizeVariant;
  dismissible?: boolean;
  compact?: boolean;
  inline?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  onDismiss?: () => void;
  className?: string;
  'data-testid'?: string;
}

const getSeverityIcon = (severity: string): string => {
  const iconMap = {
    error: 'error',
    warning: 'warning',
    info: 'info',
    success: 'success',
  };
  return iconMap[severity as keyof typeof iconMap] || 'info';
};

export const ErrorMessage = forwardRef<HTMLDivElement, ErrorMessageProps>(
  ({ 
    title,
    message,
    details,
    severity = 'error',
    size = 'md',
    dismissible = false,
    compact = false,
    inline = false,
    actions,
    onDismiss,
    className,
    'data-testid': testId,
    ...props 
  }, ref) => {
    const [isVisible, setIsVisible] = useState(true);

    const handleDismiss = () => {
      setIsVisible(false);
      onDismiss?.();
    };

    if (!isVisible) {
      return null;
    }

    // Map size to available CSS variants
    const mapSize = (size: SizeVariant): 'sm' | 'md' | 'lg' => {
      if (size === 'xs') return 'sm';
      if (size === 'xl') return 'lg';
      if (size === 'sm') return 'sm';
      if (size === 'md') return 'md';
      if (size === 'lg') return 'lg';
      return 'md'; // default fallback
    };

    const baseClasses = [
      styles.base,
      styles.severityVariants[severity],
      styles.sizeVariants[mapSize(size)],
      compact && styles.compactStyle,
      inline && styles.inlineStyle,
      dismissible && styles.dismissibleStyle,
      className,
    ].filter(Boolean).join(' ');

    const ariaRole = severity === 'error' ? 'alert' : 'status';
    const ariaLive = severity === 'error' ? 'assertive' : 'polite';

    return (
      <div
        ref={ref}
        className={baseClasses}
        role={ariaRole}
        aria-live={ariaLive}
        data-testid={testId}
        {...props}
      >
        <Icon
          name={getSeverityIcon(severity)}
          size={size}
          className={styles.iconStyle}
          aria-hidden="true"
        />
        
        <div className={styles.contentStyle}>
          {title && !compact && (
            <h4 className={styles.titleStyle}>
              {title}
            </h4>
          )}
          
          <div className={styles.messageStyle}>
            {message}
          </div>
          
          {details && !compact && (
            <details>
              <summary style={{ cursor: 'pointer', marginTop: '8px' }}>
                Technical Details
              </summary>
              <pre className={styles.detailsStyle}>
                {details}
              </pre>
            </details>
          )}
          
          {actions && actions.length > 0 && !compact && (
            <div className={styles.actionsStyle}>
              {actions.map((action, index) => (
                <button
                  key={index}
                  type="button"
                  className={styles.buttonStyle}
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {dismissible && (
          <button
            type="button"
            className={styles.dismissButtonStyle}
            onClick={handleDismiss}
            aria-label="Dismiss message"
          >
            <Icon name="close" size="sm" />
          </button>
        )}
      </div>
    );
  }
);

ErrorMessage.displayName = 'ErrorMessage';

// Convenience components for different severities
export const ErrorAlert = (props: Omit<ErrorMessageProps, 'severity'>) => (
  <ErrorMessage severity="error" {...props} />
);

export const WarningAlert = (props: Omit<ErrorMessageProps, 'severity'>) => (
  <ErrorMessage severity="warning" {...props} />
);

export const InfoAlert = (props: Omit<ErrorMessageProps, 'severity'>) => (
  <ErrorMessage severity="info" {...props} />
);

export const SuccessAlert = (props: Omit<ErrorMessageProps, 'severity'>) => (
  <ErrorMessage severity="success" {...props} />
);