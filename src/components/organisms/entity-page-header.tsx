import React from 'react';

import type { ExternalIds } from '@/lib/openalex/types/entities';
import type { EntityType } from '@/lib/openalex/utils/entity-detection';

import { Badge } from '../atoms/badge';
import { Icon } from '../atoms/icon';
import { ExternalLinksGroup } from '../molecules/external-links-group';

import * as styles from './entity-page-header.css';

interface EntityPageHeaderProps {
  /** Entity type for theming and icons */
  entityType: EntityType;
  /** Primary title/name */
  title: string;
  /** Entity ID */
  entityId: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Alternative names */
  alternativeNames?: string[];
  /** External IDs for links */
  externalIds?: ExternalIds;
  /** Status indicators */
  statusInfo?: React.ReactNode[];
  /** Quick action buttons */
  quickActions?: React.ReactNode;
  /** Additional metadata */
  metadata?: Array<{
    label: string;
    value: string;
  }>;
  /** Additional badges */
  badges?: React.ReactNode[];
  /** Whether entity has ORCID */
  hasOrcid?: boolean;
}

export function EntityPageHeader({
  entityType,
  title,
  entityId,
  subtitle,
  alternativeNames,
  externalIds,
  statusInfo = [],
  quickActions,
  metadata = [],
  badges = [],
  hasOrcid = false,
}: EntityPageHeaderProps) {
  return (
    <div className={styles.headerContainer}>
      <div className={styles.topRow}>
        <div className={styles.titleSection}>
          {/* Badges Row */}
          <div className={styles.badgeRow}>
            <Badge variant="default">
              <Icon name={entityType} size="sm" color={entityType} aria-hidden="true" />
              {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
            </Badge>
            
            <div className={styles.entityId}>
              {entityId}
            </div>
            
            {hasOrcid && (
              <Badge variant="warning" size="sm">
                <Icon name="orcid" size="sm" aria-hidden="true" />
                ORCID
              </Badge>
            )}
            
            {badges.map((badge, index) => (
              <React.Fragment key={index}>{badge}</React.Fragment>
            ))}
          </div>

          {/* Title */}
          <h1 className={styles.title}>{title}</h1>
          
          {subtitle && (
            <h2 className={styles.subtitle}>{subtitle}</h2>
          )}
          
          {alternativeNames && alternativeNames.length > 0 && (
            <div className={styles.alternativeNames}>
              Also known as: {alternativeNames.slice(0, 3).join(', ')}
              {alternativeNames.length > 3 && '...'}
            </div>
          )}

          {/* Status Information */}
          {statusInfo.length > 0 && (
            <div className={styles.statusContainer}>
              {statusInfo}
            </div>
          )}
        </div>
        
        {/* Quick Actions */}
        {quickActions && (
          <div className={styles.quickActions}>
            {quickActions}
          </div>
        )}
      </div>

      {/* External Links */}
      {externalIds && Object.keys(externalIds).length > 0 && (
        <div className={styles.externalLinksRow}>
          <ExternalLinksGroup
            externalIds={externalIds}
            entityType={entityType}
            layout="horizontal"
            showLabels={true}
          />
        </div>
      )}

      {/* Metadata Row */}
      {metadata.length > 0 && (
        <div className={styles.metaRow}>
          <div className={styles.metaInfo}>
            {metadata.map((item, index) => (
              <div key={index} className={styles.metaItem}>
                <span className={styles.metaLabel}>{item.label}:</span>
                <span className={styles.metaValue}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}