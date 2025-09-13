import { Alert, Button, Group, Stack } from '@mantine/core';
import type { DefaultMantineColor } from '@mantine/core';
import { forwardRef, useState } from 'react';

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
  actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary' }>;
  onDismiss?: () => void;
  className?: string;
  id?: string;
  'data-testid'?: string;
}

const SEVERITY_COLORS: Record<NonNullable<ErrorMessageProps['severity']>, DefaultMantineColor> = {
  error: 'red',
  warning: 'yellow',
  info: 'blue',
  success: 'green',
} as const;

export const ErrorMessage = forwardRef<HTMLDivElement, ErrorMessageProps>(
  (props, ref) => {
    const { title, message, details, severity = 'error', dismissible = false, compact = false, inline, actions, onDismiss, className, id, 'data-testid': testId, size } = props;
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    const handleDismiss = () => { 
      setIsVisible(false); 
      onDismiss?.(); 
    };

    const color = SEVERITY_COLORS[severity];

    return (
      <Alert
        ref={ref}
        {...(color && { color })}
        {...(title && { title })}
        withCloseButton={dismissible}
        onClose={handleDismiss}
        {...(className && { className })}
        {...(id && { id })}
        {...(testId && { 'data-testid': testId })}
      >
        <Stack gap={compact ? 'xs' : 'sm'}>
          <div>{message}</div>
          {details && (
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
              {details}
            </div>
          )}
          {actions && actions.length > 0 && (
            <Group gap="xs">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  size="xs"
                  variant={action.variant === 'primary' ? 'filled' : 'outline'}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
            </Group>
          )}
        </Stack>
      </Alert>
    );
  }
);

ErrorMessage.displayName = 'ErrorMessage';

// Alert type components for semantic convenience
export const ErrorAlert = forwardRef<HTMLDivElement, Omit<ErrorMessageProps, 'severity'>>(
  (props, ref) => <ErrorMessage ref={ref} severity="error" {...props} />
);
ErrorAlert.displayName = 'ErrorAlert';

export const WarningAlert = forwardRef<HTMLDivElement, Omit<ErrorMessageProps, 'severity'>>(
  (props, ref) => <ErrorMessage ref={ref} severity="warning" {...props} />
);
WarningAlert.displayName = 'WarningAlert';

export const InfoAlert = forwardRef<HTMLDivElement, Omit<ErrorMessageProps, 'severity'>>(
  (props, ref) => <ErrorMessage ref={ref} severity="info" {...props} />
);
InfoAlert.displayName = 'InfoAlert';

export const SuccessAlert = forwardRef<HTMLDivElement, Omit<ErrorMessageProps, 'severity'>>(
  (props, ref) => <ErrorMessage ref={ref} severity="success" {...props} />
);
SuccessAlert.displayName = 'SuccessAlert';