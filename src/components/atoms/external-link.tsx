'use client';

import {
  IconFileTypePdf,
  IconMicroscope,
  IconBuilding,
  IconLink,
  IconBook,
  IconExternalLink,
  IconMail
} from '@tabler/icons-react';
import { forwardRef } from 'react';

import type { ExternalLinkProps } from '../types';

import * as styles from './external-link.css';

const getLinkIcon = (type: string) => {
  const icons = {
    doi: IconFileTypePdf,
    orcid: IconMicroscope,
    ror: IconBuilding,
    wikidata: IconLink,
    wikipedia: IconBook,
    website: IconExternalLink,
    email: IconMail,
  };
  return icons[type as keyof typeof icons] || IconLink;
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
  if (href.startsWith('http') || href.startsWith('mailto:')) {
    return href;
  }
  
  const prefixes = {
    doi: `https://doi.org/${href.replace(/^doi:/, '')}`,
    orcid: `https://orcid.org/${href}`,
    ror: `https://ror.org/${href}`,
    wikidata: `https://wikidata.org/wiki/${href}`,
    wikipedia: `https://en.wikipedia.org/wiki/${href}`,
    email: `mailto:${href}`,
  };
  
  return prefixes[type as keyof typeof prefixes] || `https://${href}`;
};

/**
 * Build CSS classes for external link
 */
function buildLinkClasses(type: string, className?: string): string {
  return [
    styles.base,
    styles.linkTypeVariants[type as keyof typeof styles.linkTypeVariants],
    className,
  ].filter(Boolean).join(' ');
}

/**
 * Render icon if enabled
 */
function renderIcon(showIcon: boolean, type: string) {
  if (!showIcon) return null;
  
  const IconComponent = getLinkIcon(type);
  
  return (
    <span className={styles.iconStyle} aria-hidden="true">
      <IconComponent size={14} />
    </span>
  );
}

/**
 * Render external indicator if external link
 */
function renderExternalIndicator(external: boolean) {
  if (!external) return null;
  
  return (
    <span className={styles.externalIconStyle} aria-hidden="true">
      <IconExternalLink size={12} />
    </span>
  );
}

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
    const cssClasses = buildLinkClasses(type, className);

    return (
      <a
        ref={ref}
        href={fullUrl}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={cssClasses}
        data-testid={testId}
        aria-label={`${type.toUpperCase()}: ${displayText}`}
        {...props}
      >
        {renderIcon(showIcon, type)}
        <span>{displayText}</span>
        {renderExternalIndicator(external)}
      </a>
    );
  }
);

ExternalLink.displayName = 'ExternalLink';