import React from 'react';

import * as styles from '../error-message.css';
import { Icon } from '../icon';

export function renderTitle(title?: string, compact?: boolean) {
  if (!title || compact) return null;
  return <h4 className={styles.titleStyle}>{title}</h4>;
}

export function renderDetails(details?: string, compact?: boolean) {
  if (!details || compact) return null;
  return (
    <details>
      <summary style={{ cursor: 'pointer', marginTop: '8px' }}>Technical Details</summary>
      <pre className={styles.detailsStyle}>{details}</pre>
    </details>
  );
}

export function renderActions(actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary' }>, compact?: boolean) {
  if (!actions?.length || compact) return null;
  return (
    <div className={styles.actionsStyle}>
      {actions.map((action, index) => (
        <button key={index} type="button" className={styles.buttonStyle} onClick={action.onClick}>
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function renderDismissButton(dismissible: boolean, onDismiss: () => void) {
  if (!dismissible) return null;
  return (
    <button type="button" className={styles.dismissButtonStyle} onClick={onDismiss} aria-label="Dismiss message">
      <Icon name="close" size="sm" />
    </button>
  );
}