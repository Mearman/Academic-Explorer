'use client';

import React, { forwardRef, useState } from 'react';

import type { SizeVariant } from '../types';

import * as styles from './error-message.css';
import { Icon } from './icon';
import { renderTitle, renderDetails, renderActions, renderDismissButton } from './utils/error-render-utils';
import { SEVERITY_ICONS, mapSizeToVariant, getAriaAttributes } from './utils/error-utils';

export interface ErrorMessageProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'className'> {
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
  'data-testid'?: string;
}

const buildClassNames = (
  severity: 'error' | 'warning' | 'info' | 'success',
  sizeVariant: SizeVariant, 
  compact: boolean,
  inline: boolean, 
  dismissible: boolean,
  className?: string
) => {
  const classes = [styles.base, styles.severityVariants[severity], styles.sizeVariants[sizeVariant]];
  if (compact) classes.push(styles.compactStyle);
  if (inline) classes.push(styles.inlineStyle);
  if (dismissible) classes.push(styles.dismissibleStyle);
  if (className) classes.push(className);
  return classes.join(' ');
};

export const ErrorMessage = forwardRef<HTMLDivElement, ErrorMessageProps>(
  ({ title, message, details, severity = 'error', size = 'md', dismissible = false, compact = false, inline = false, actions, onDismiss, className, 'data-testid': testId, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    const handleDismiss = () => { setIsVisible(false); onDismiss?.(); };
    const sizeVariant = mapSizeToVariant(size);
    const { role, ariaLive } = getAriaAttributes(severity);
    const classes = buildClassNames(severity, sizeVariant, compact, inline, dismissible, className);

    return (
      <div ref={ref} className={classes} data-testid={testId} role={role} aria-live={ariaLive} {...props}>
        <Icon name={SEVERITY_ICONS[severity] || 'info'} size={size} className={styles.iconStyle} aria-hidden="true" />
        <div className={styles.contentStyle}>
          {renderTitle(title, compact)}
          <div className={styles.messageStyle}>{message}</div>
          {renderDetails(details, compact)}
          {renderActions(actions, compact)}
        </div>
        {renderDismissButton(dismissible, handleDismiss)}
      </div>
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