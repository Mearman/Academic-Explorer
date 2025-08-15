'use client';

import { forwardRef } from 'react';

import { ExternalLink } from '../atoms/external-link';
import { Icon } from '../atoms/icon';
import type { ExternalLinksGroupProps, ExternalLinkProps } from '../types';

import * as styles from './external-links-group.css';

interface ProcessedLink {
  type: ExternalLinkProps['type'];
  href: string;
  label: string;
  category: string;
}

// Link categories for organizing external links
// Note: Not using Object.entries() to avoid type coercion issues
// const linkCategories = {
//   identifiers: ['doi', 'orcid', 'ror'],
//   knowledge: ['wikidata', 'wikipedia'],
//   web: ['website', 'email'],
// } as const;

const linkLabels = {
  doi: 'DOI',
  orcid: 'ORCID',
  ror: 'ROR',
  wikidata: 'Wikidata',
  wikipedia: 'Wikipedia',
  website: 'Website',
  email: 'Email',
} as const;

// Process external IDs into structured links
function processExternalIds(externalIds: Record<string, unknown>): ProcessedLink[] {
  const processedLinks: ProcessedLink[] = [];

  Object.entries(externalIds).forEach(([key, value]) => {
    if (!value) return;

    const linkType = key as ExternalLinkProps['type'];
    
    // Handle arrays (like ISSN)
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item) {
          processedLinks.push({
            type: linkType,
            href: item,
            label: `${linkLabels[linkType] || linkType.toUpperCase()}${value.length > 1 ? ` ${index + 1}` : ''}`,
            category: getCategoryForLinkType(linkType),
          });
        }
      });
    } else if (typeof value === 'string') {
      processedLinks.push({
        type: linkType,
        href: value,
        label: linkLabels[linkType] || linkType.toUpperCase(),
        category: getCategoryForLinkType(linkType),
      });
    }
  });

  return processedLinks;
}

// Render empty state when no links are available
function renderEmptyState(
  ref: React.ForwardedRef<HTMLDivElement>,
  className: string | undefined,
  testId: string | undefined,
  props: React.HTMLAttributes<HTMLDivElement>
) {
  return (
    <div
      ref={ref}
      className={`${styles.emptyState} ${className || ''}`}
      data-testid={testId}
      {...props}
    >
      <Icon name="info" size="sm" aria-hidden="true" />
      <span>No external links available</span>
    </div>
  );
}

// Render grouped layout (vertical or grid)
function renderGroupedLayout(
  ref: React.ForwardedRef<HTMLDivElement>,
  processedLinks: ProcessedLink[],
  layout: 'vertical' | 'grid',
  showLabels: boolean,
  className: string | undefined,
  testId: string | undefined,
  props: React.HTMLAttributes<HTMLDivElement>
) {
  const groupedLinks = groupLinksByCategory(processedLinks);
  
  return (
    <div
      ref={ref}
      className={`${styles.groupContainer} ${className || ''}`}
      data-testid={testId}
      {...props}
    >
      {Object.entries(groupedLinks).map(([category, links]) => (
        <div key={category} className={styles.typeGroupStyle}>
          <h4 className={styles.typeHeaderStyle}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
            <span className={styles.countBadge}>
              {links.length}
            </span>
          </h4>
          <div className={`${styles.base} ${styles.layoutVariants[layout]}`}>
            {links.map((link, index) => renderLinkItem(link, index, showLabels))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Render simple horizontal layout
function renderHorizontalLayout(
  ref: React.ForwardedRef<HTMLDivElement>,
  processedLinks: ProcessedLink[],
  layout: 'horizontal',
  showLabels: boolean,
  className: string | undefined,
  testId: string | undefined,
  props: React.HTMLAttributes<HTMLDivElement>
) {
  const baseClasses = [
    styles.base,
    styles.layoutVariants[layout],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={baseClasses}
      data-testid={testId}
      {...props}
    >
      {processedLinks.map((link, index) => renderLinkItem(link, index, showLabels))}
    </div>
  );
}

export const ExternalLinksGroup = forwardRef<HTMLDivElement, ExternalLinksGroupProps>(
  ({ 
    externalIds,
    layout = 'horizontal',
    showLabels = true,
    className,
    'data-testid': testId,
    ...props 
  }, ref) => {
    const processedLinks = processExternalIds(externalIds);

    if (processedLinks.length === 0) {
      return renderEmptyState(ref, className, testId, props);
    }

    // Group links by category if layout is vertical or grid
    if (layout === 'vertical' || layout === 'grid') {
      return renderGroupedLayout(ref, processedLinks, layout, showLabels, className, testId, props);
    }

    // Simple horizontal layout
    return renderHorizontalLayout(ref, processedLinks, layout, showLabels, className, testId, props);
  }
);

ExternalLinksGroup.displayName = 'ExternalLinksGroup';

// Helper functions
function getCategoryForLinkType(linkType: string): string {
  // Check identifiers category
  if (linkType === 'doi' || linkType === 'orcid' || linkType === 'ror') {
    return 'identifiers';
  }
  
  // Check knowledge category
  if (linkType === 'wikidata' || linkType === 'wikipedia') {
    return 'knowledge';
  }
  
  // Check web category
  if (linkType === 'website' || linkType === 'email') {
    return 'web';
  }
  
  return 'other';
}

function groupLinksByCategory(links: ProcessedLink[]): Record<string, ProcessedLink[]> {
  return links.reduce((groups, link) => {
    const category = link.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(link);
    return groups;
  }, {} as Record<string, ProcessedLink[]>);
}

function renderLinkItem(link: ProcessedLink, index: number, showLabels: boolean) {
  return (
    <ExternalLink
      key={`${link.type}-${index}`}
      href={link.href}
      type={link.type}
      className={`${styles.linkItem} ${!showLabels ? styles.linkItemCompact : ''}`}
      showIcon={true}
      external={true}
    >
      {showLabels ? link.label : undefined}
    </ExternalLink>
  );
}