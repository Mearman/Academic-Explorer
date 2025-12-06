/**
 * Metadata formatting utilities for relationship items
 * Converts raw metadata objects into human-readable strings
 * @module formatMetadata
 */

import type { RelationshipMetadata } from '@/types/relationship';

/**
 * Format authorship metadata into human-readable text
 */
function formatAuthorshipMetadata(metadata: {
  position?: number;
  isCorresponding?: boolean;
  affiliations?: string[];
}): string {
  const parts: string[] = [];

  if (metadata.position !== undefined) {
    const ordinal = getOrdinal(metadata.position);
    parts.push(`${ordinal} author`);
  }

  if (metadata.isCorresponding) {
    parts.push('corresponding');
  }

  if (metadata.affiliations && metadata.affiliations.length > 0) {
    const affiliationText =
      metadata.affiliations.length === 1
        ? metadata.affiliations[0]
        : `${metadata.affiliations.length} affiliations`;
    parts.push(affiliationText);
  }

  return parts.join(' · ');
}

/**
 * Format citation metadata into human-readable text
 */
function formatCitationMetadata(metadata: {
  year?: number;
  context?: string;
}): string {
  const parts: string[] = [];

  if (metadata.year !== undefined) {
    parts.push(String(metadata.year));
  }

  if (metadata.context) {
    // Truncate context to reasonable length for display
    const MAX_CONTEXT_LENGTH = 100;
    const truncatedContext =
      metadata.context.length > MAX_CONTEXT_LENGTH
        ? `${metadata.context.slice(0, MAX_CONTEXT_LENGTH)}…`
        : metadata.context;
    parts.push(`"${truncatedContext}"`);
  }

  return parts.join(' · ');
}

/**
 * Format affiliation metadata into human-readable text
 */
function formatAffiliationMetadata(metadata: {
  startDate?: string;
  endDate?: string;
  isPrimary?: boolean;
}): string {
  const parts: string[] = [];

  if (metadata.isPrimary) {
    parts.push('Primary');
  }

  if (metadata.startDate || metadata.endDate) {
    const dateRange = formatDateRange(metadata.startDate, metadata.endDate);
    if (dateRange) {
      parts.push(dateRange);
    }
  }

  return parts.join(' · ');
}

/**
 * Format funding metadata into human-readable text
 */
function formatFundingMetadata(metadata: {
  awardId?: string;
  amount?: number;
  currency?: string;
}): string {
  const parts: string[] = [];

  if (metadata.awardId) {
    parts.push(`Award: ${metadata.awardId}`);
  }

  if (metadata.amount !== undefined) {
    const formattedAmount = formatCurrency(metadata.amount, metadata.currency);
    parts.push(formattedAmount);
  }

  return parts.join(' · ');
}

/**
 * Format lineage metadata into human-readable text
 */
function formatLineageMetadata(metadata: { level?: number }): string {
  if (metadata.level === undefined) {
    return '';
  }

  switch (metadata.level) {
    case 1:
      return 'Direct parent';
    case 2:
      return 'Grandparent';
    default:
      return `Level ${metadata.level}`;
  }
}

/**
 * Format relationship metadata into a human-readable string
 * Uses discriminated union pattern to handle each metadata type appropriately
 */
export function formatMetadata(metadata: RelationshipMetadata): string {
  switch (metadata.type) {
    case 'authorship':
      return formatAuthorshipMetadata(metadata);
    case 'citation':
      return formatCitationMetadata(metadata);
    case 'affiliation':
      return formatAffiliationMetadata(metadata);
    case 'funding':
      return formatFundingMetadata(metadata);
    case 'lineage':
      return formatLineageMetadata(metadata);
    default:
      // Exhaustive check - TypeScript will error if we miss a case
      return exhaustiveCheck(metadata);
  }
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

/**
 * Format a date range string
 */
function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) {
    return '';
  }

  const formatDate = (date: string): string => {
    // Handle YYYY-MM-DD format by extracting year or formatting nicely
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return date; // Return as-is if not parseable
    }
    return parsed.getFullYear().toString();
  };

  if (startDate && endDate) {
    return `${formatDate(startDate)}–${formatDate(endDate)}`;
  }

  if (startDate) {
    return `${formatDate(startDate)}–present`;
  }

  return `Until ${formatDate(endDate!)}`;
}

/**
 * Format currency with proper locale formatting
 */
function formatCurrency(amount: number, currency?: string): string {
  const currencyCode = currency || 'USD';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback for unknown currency codes
    return `${amount.toLocaleString()} ${currencyCode}`;
  }
}

/**
 * Exhaustive type check helper - ensures all discriminated union cases are handled
 */
function exhaustiveCheck(value: never): string {
  // If we reach here, we've missed a case in the switch statement
  console.warn('Unhandled metadata type:', value);
  return '';
}
