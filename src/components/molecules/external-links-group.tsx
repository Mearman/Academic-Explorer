'use client';

import { forwardRef } from 'react';
import { ExternalLink } from '../atoms/external-link';
import { Icon } from '../atoms/icon';
import * as styles from './external-links-group.css';
import type { ExternalLinksGroupProps, ExternalLinkProps } from '../types';

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

export const ExternalLinksGroup = forwardRef<HTMLDivElement, ExternalLinksGroupProps>(
  ({ 
    externalIds,
    layout = 'horizontal',
    showLabels = true,
    className,
    'data-testid': testId,
    ...props 
  }, ref) => {
    // Process external IDs into structured links
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

    if (processedLinks.length === 0) {
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

    const baseClasses = [
      styles.base,
      styles.layoutVariants[layout],
      className,
    ].filter(Boolean).join(' ');

    // Group links by category if layout is vertical or grid
    if (layout === 'vertical' || layout === 'grid') {
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

    // Simple horizontal layout
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