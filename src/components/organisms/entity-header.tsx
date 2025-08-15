'use client';

import { forwardRef } from 'react';

import type { ExternalIds } from '@/lib/openalex/types/entities';

import { Badge } from '../atoms/badge';
import { Icon } from '../atoms/icon';
import { LoadingSkeleton } from '../atoms/loading-skeleton';
import { StatusIndicator } from '../atoms/status-indicator';
import { ExternalLinksGroup } from '../molecules/external-links-group';
// import { getEntityColour } from '../design-tokens.css'; // Removed - not used after removing style prop
import type { EntityHeaderProps, OpenAlexEntity, EntityType } from '../types';

import * as styles from './entity-header.css';

// Type guards for different entity types
function hasOrcid(entity: OpenAlexEntity): entity is OpenAlexEntity & { orcid?: string } {
  return 'orcid' in entity;
}

function hasDisplayNameAlternatives(entity: OpenAlexEntity): entity is OpenAlexEntity & { display_name_alternatives?: string[] } {
  return 'display_name_alternatives' in entity;
}

function hasExternalIds(entity: OpenAlexEntity): entity is OpenAlexEntity & { ids: ExternalIds } {
  return 'ids' in entity && entity.ids !== undefined;
}

function hasLastKnownInstitutions(entity: OpenAlexEntity): entity is OpenAlexEntity & { 
  last_known_institutions?: Array<{ display_name: string; country_code?: string; type?: string; }> 
} {
  return 'last_known_institutions' in entity;
}

function hasPublicationYear(entity: OpenAlexEntity): entity is OpenAlexEntity & { publication_year?: number } {
  return 'publication_year' in entity;
}

function hasType(entity: OpenAlexEntity): entity is OpenAlexEntity & { type?: string } {
  return 'type' in entity;
}

function hasCountryCode(entity: OpenAlexEntity): entity is OpenAlexEntity & { country_code?: string } {
  return 'country_code' in entity;
}

function hasHostOrganization(entity: OpenAlexEntity): entity is OpenAlexEntity & { 
  host_organization_name?: string;
  country_code?: string;
} {
  return 'host_organization_name' in entity;
}

function hasIsOa(entity: OpenAlexEntity): entity is OpenAlexEntity & { is_oa?: boolean } {
  return 'is_oa' in entity;
}

// Get entity type from entity structure
function getEntityTypeFromEntity(entity: OpenAlexEntity): EntityType {
  if ('authorships' in entity) return 'work';
  if ('affiliations' in entity && !('authorships' in entity)) return 'author';
  if ('is_oa' in entity && 'is_in_doaj' in entity) return 'source';
  if ('type' in entity && 'geo' in entity) return 'institution';
  if ('hierarchy_level' in entity) return 'publisher';
  if ('grants_count' in entity) return 'funder';
  if ('subfield' in entity) return 'topic';
  if ('level' in entity) return 'concept';
  if ('display_name' in entity && 'works_count' in entity && 'cited_by_count' in entity) {
    if ('description' in entity) return 'region';
    return 'continent';
  }
  return 'work'; // fallback
}

export const EntityHeader = forwardRef<HTMLElement, EntityHeaderProps>(
  ({ 
    entity,
    // showBreadcrumbs = false, // Currently unused
    showActions = true,
    actions,
    className,
    'data-testid': testId,
    ...props 
  }, ref) => {
    const entityType = getEntityTypeFromEntity(entity);
    // const entityColour = getEntityColour(entityType); // Removed - not used after removing style prop

    const getSubtitle = (): string => {
      // Author subtitle
      if (hasLastKnownInstitutions(entity) && entity.last_known_institutions?.[0]) {
        const inst = entity.last_known_institutions[0];
        return `${inst.display_name}${inst.country_code ? ` (${inst.country_code})` : ''}`;
      }
      
      // Work subtitle
      if (hasPublicationYear(entity) && entity.publication_year) {
        return `Published ${entity.publication_year}`;
      }
      
      // Institution subtitle
      if (hasType(entity) && hasCountryCode(entity)) {
        const parts = [];
        if (entity.type) parts.push(entity.type.charAt(0).toUpperCase() + entity.type.slice(1));
        if (entity.country_code) parts.push(entity.country_code);
        return parts.join(' • ');
      }
      
      // Source subtitle
      if (hasHostOrganization(entity)) {
        const parts = [];
        if (entity.host_organization_name) parts.push(entity.host_organization_name);
        if (hasCountryCode(entity) && entity.country_code) parts.push(entity.country_code);
        return parts.join(' • ');
      }
      
      return '';
    };

    const getStatusInfo = () => {
      const status = [];
      
      // Work open access status
      if ('open_access' in entity && entity.open_access) {
        status.push(
          <StatusIndicator
            key="oa-status"
            status={entity.open_access.is_oa ? 'active' : 'inactive'}
            showLabel={true}
            size="sm"
          />
        );
      }
      
      // Source open access status
      if (hasIsOa(entity) && typeof entity.is_oa === 'boolean') {
        status.push(
          <StatusIndicator
            key="source-oa"
            status={entity.is_oa ? 'active' : 'inactive'}
            showLabel={true}
            size="sm"
          />
        );
      }
      
      return status;
    };

    const getMetaInfo = () => {
      const metaItems = [];
      
      if ('updated_date' in entity && entity.updated_date) {
        metaItems.push({
          label: 'Last Updated',
          value: new Date(entity.updated_date).toLocaleDateString('en-GB'),
        });
      }
      
      if ('created_date' in entity && entity.created_date) {
        metaItems.push({
          label: 'Created',
          value: new Date(entity.created_date).toLocaleDateString('en-GB'),
        });
      }
      
      return metaItems;
    };

    const baseClasses = [
      styles.base,
      className,
    ].filter(Boolean).join(' ');

    const subtitle = getSubtitle();
    const statusInfo = getStatusInfo();
    const metaInfo = getMetaInfo();

    return (
      <header
        ref={ref}
        className={baseClasses}
        data-testid={testId}
        {...props}
      >
        <div className={styles.topRow}>
          <div className={styles.headerContent}>
            {/* Badges Row */}
            <div className={styles.badgeRow}>
              <Badge
                variant="default"
              >
                <Icon name={entityType} size="sm" color={entityType} aria-hidden="true" />
                {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
              </Badge>
              
              <div className={styles.entityId}>
                {entity.id}
              </div>
              
              {hasOrcid(entity) && entity.orcid && (
                <Badge variant="warning" size="sm">
                  <Icon name="orcid" size="sm" aria-hidden="true" />
                  ORCID
                </Badge>
              )}
            </div>

            {/* Title */}
            <div className={styles.titleContainer}>
              <h1 className={styles.title}>
                {entity.display_name || 'Unknown Entity'}
              </h1>
              
              {subtitle && (
                <h2 className={styles.subtitle}>
                  {subtitle}
                </h2>
              )}
              
              {hasDisplayNameAlternatives(entity) && 
               entity.display_name_alternatives && 
               entity.display_name_alternatives.length > 0 && (
                <div className={styles.alternativeNames}>
                  Also known as: {entity.display_name_alternatives.slice(0, 3).join(', ')}
                  {entity.display_name_alternatives.length > 3 && '...'}
                </div>
              )}
            </div>

            {/* Status Information */}
            {statusInfo.length > 0 && (
              <div className={styles.statusContainer}>
                {statusInfo}
              </div>
            )}
          </div>

          {/* Actions */}
          {showActions && actions && (
            <div className={styles.actionsContainer}>
              {actions}
            </div>
          )}
        </div>

        {/* External Links */}
        {hasExternalIds(entity) && Object.keys(entity.ids).length > 0 && (
          <ExternalLinksGroup
            externalIds={entity.ids}
            entityType={entityType}
            layout="horizontal"
            showLabels={true}
          />
        )}

        {/* Meta Information */}
        {metaInfo.length > 0 && (
          <div className={styles.metaInfo}>
            {metaInfo.map((item, index) => (
              <div key={index} className={styles.metaRow}>
                <span className={styles.metaLabel}>{item.label}</span>
                <span className={styles.metaValue}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </header>
    );
  }
);

EntityHeader.displayName = 'EntityHeader';

// Loading state component
export const EntityHeaderSkeleton = ({ className }: { className?: string }) => (
  <div className={`${styles.base} ${styles.loadingState} ${className || ''}`}>
    <div className={styles.topRow}>
      <div className={styles.headerContent}>
        <div className={styles.badgeRow}>
          <LoadingSkeleton preset="badge" />
          <LoadingSkeleton width="120px" height="20px" />
        </div>
        <div className={styles.titleContainer}>
          <LoadingSkeleton preset="title" width="70%" />
          <LoadingSkeleton preset="subtitle" width="50%" />
        </div>
      </div>
    </div>
    <LoadingSkeleton width="100%" height="40px" />
  </div>
);