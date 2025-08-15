import { Icon } from '../atoms/icon';

import * as styles from './entity-section-header.css';

interface EntitySectionHeaderProps {
  title: string;
  icon?: string;
  actions?: React.ReactNode;
}

export function EntitySectionHeader({ title, icon, actions }: EntitySectionHeaderProps) {
  return (
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionTitle}>
        {icon && <Icon name={icon} size="md" aria-hidden="true" />}
        {title}
      </h2>
      {actions && (
        <div className={styles.sectionActions}>
          {actions}
        </div>
      )}
    </div>
  );
}