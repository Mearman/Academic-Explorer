'use client';

import { forwardRef } from 'react';
import * as styles from './external-link.css';
import type { ExternalLinkProps } from '../types';

const getLinkIcon = (type: string): string => {
  const icons = {
    doi: '📄',
    orcid: '🔬',
    ror: '🏛️',
    wikidata: '🔗',
    wikipedia: '📖',
    website: '🌐',
    email: '✉️',
  };
  return icons[type as keyof typeof icons] || '🔗';
};

const formatLinkLabel = (href: string, type: string): string => {
  switch (type) {
    case 'doi':
      return href.replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
    case 'orcid':
      return href.replace(/^https?:\/\/orcid\.org\//, '');
    case 'ror':
      return href.replace(/^https?:\/\/ror\.org\//, '');
    case 'wikidata':
      return href.replace(/^https?:\/\/wikidata\.org\/wiki\//, '');
    case 'wikipedia':
      return href.replace(/^https?:\/\/[^.]+\.wikipedia\.org\/wiki\//, '');
    case 'email':
      return href.replace(/^mailto:/, '');
    default:
      try {
        const url = new URL(href);
        return url.hostname;
      } catch {
        return href;
      }
  }
};

const getFullUrl = (href: string, type: string): string => {
  // Handle relative URLs and add proper prefixes
  switch (type) {
    case 'doi':
      return href.startsWith('http') ? href : `https://doi.org/${href.replace(/^doi:/, '')}`;
    case 'orcid':
      return href.startsWith('http') ? href : `https://orcid.org/${href}`;
    case 'ror':
      return href.startsWith('http') ? href : `https://ror.org/${href}`;
    case 'wikidata':
      return href.startsWith('http') ? href : `https://wikidata.org/wiki/${href}`;
    case 'wikipedia':
      return href.startsWith('http') ? href : `https://en.wikipedia.org/wiki/${href}`;
    case 'email':
      return href.startsWith('mailto:') ? href : `mailto:${href}`;
    default:
      return href.startsWith('http') ? href : `https://${href}`;
  }
};

export const ExternalLink = forwardRef<HTMLAnchorElement, ExternalLinkProps>(
  ({ 
    href, 
    type, 
    children, 
    showIcon = true, 
    external = true,
    className,
    'data-testid': testId,
    ...props 
  }, ref) => {
    const fullUrl = getFullUrl(href, type);
    const displayText = children || formatLinkLabel(href, type);
    
    const baseClasses = [
      styles.base,
      styles.linkTypeVariants[type],
      className,
    ].filter(Boolean).join(' ');

    return (
      <a
        ref={ref}
        href={fullUrl}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={baseClasses}
        data-testid={testId}
        aria-label={`${type.toUpperCase()}: ${displayText}`}
        {...props}
      >
        {showIcon && (
          <span className={styles.iconStyle} aria-hidden="true">
            {getLinkIcon(type)}
          </span>
        )}
        <span>{displayText}</span>
        {external && (
          <span className={styles.externalIconStyle} aria-hidden="true">
            ↗
          </span>
        )}
      </a>
    );
  }
);

ExternalLink.displayName = 'ExternalLink';