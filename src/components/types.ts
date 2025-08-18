import React, { ReactNode } from 'react';

import type { 
  Work, 
  Author, 
  Source, 
  Institution, 
  Publisher, 
  Funder, 
  Topic, 
  Concept, 
  Keyword,
  Continent,
  Region,
  ExternalIds,
  CountsByYear,
} from '@/lib/openalex/types/entities';

// Base component props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  'data-testid'?: string;
}

// Entity type union
export type EntityType = 'work' | 'author' | 'source' | 'institution' | 'publisher' | 'funder' | 'topic' | 'concept' | 'keyword' | 'continent' | 'region';

export type OpenAlexEntity = Work | Author | Source | Institution | Publisher | Funder | Topic | Concept | Keyword | Continent | Region;

// Size variants
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Badge variants
export type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

// Badge component props
export interface BadgeProps extends BaseComponentProps, Omit<React.HTMLAttributes<HTMLSpanElement>, 'className' | 'children'> {
  variant?: BadgeVariant;
  size?: SizeVariant;
  pill?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

// Metric display props
export interface MetricProps extends BaseComponentProps, Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'> {
  label: string;
  value: number | string;
  format?: 'number' | 'percentage' | 'currency' | 'compact';
  trend?: 'up' | 'down' | 'neutral';
  size?: SizeVariant;
  inline?: boolean;
}

// External link props
export interface ExternalLinkProps extends BaseComponentProps {
  href: string;
  type: 'doi' | 'orcid' | 'ror' | 'wikidata' | 'wikipedia' | 'website' | 'email';
  children?: ReactNode;
  showIcon?: boolean;
  external?: boolean;
  style?: React.CSSProperties;
}

// Icon props
export interface IconProps extends BaseComponentProps {
  name: string;
  size?: SizeVariant;
  color?: string;
  'aria-label'?: string;
}

// Entity badge props
export interface EntityBadgeProps extends BaseComponentProps, Omit<React.HTMLAttributes<HTMLSpanElement>, 'className' | 'children'> {
  entityType: EntityType;
  size?: SizeVariant;
  showIcon?: boolean;
}

// Open access badge props
export interface OpenAccessBadgeProps extends BaseComponentProps {
  status: 'gold' | 'green' | 'hybrid' | 'bronze' | 'closed';
  size?: SizeVariant;
  showIcon?: boolean;
}

// Metric card props
export interface MetricCardProps extends BaseComponentProps {
  title: string;
  metrics: Array<{
    label: string;
    value: number | string;
    format?: 'number' | 'percentage' | 'currency' | 'compact';
    trend?: 'up' | 'down' | 'neutral';
  }>;
  icon?: string;
  entityType?: EntityType;
}

// External links group props
export interface ExternalLinksGroupProps extends BaseComponentProps {
  externalIds: ExternalIds;
  entityType?: EntityType;
  layout?: 'horizontal' | 'vertical' | 'grid';
  showLabels?: boolean;
}

// Status indicator props
export interface StatusIndicatorProps extends BaseComponentProps {
  status: 'active' | 'inactive' | 'deprecated' | 'pending' | 'verified';
  size?: SizeVariant;
  showLabel?: boolean;
  inline?: boolean;
}

// Entity header props
export interface EntityHeaderProps extends BaseComponentProps, Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'> {
  entity: OpenAlexEntity;
  showBreadcrumbs?: boolean;
  showActions?: boolean;
  actions?: ReactNode;
}

// Entity details section props
export interface EntityDetailsSectionProps extends BaseComponentProps {
  title: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  headerActions?: ReactNode;
}

// Related entities list props
export interface RelatedEntitiesListProps extends BaseComponentProps {
  entities: Array<{
    id: string;
    displayName: string;
    entityType: EntityType;
    metadata?: Record<string, unknown>;
  }>;
  title?: string;
  limit?: number;
  showMore?: boolean;
  layout?: 'list' | 'grid' | 'compact';
}

// Timeline chart props
export interface TimelineChartProps extends BaseComponentProps {
  data: CountsByYear[];
  metric: 'works_count' | 'cited_by_count';
  title?: string;
  height?: number;
  showTooltip?: boolean;
  interactive?: boolean;
}

// Entity page template props
export interface EntityPageTemplateProps extends BaseComponentProps {
  entity: OpenAlexEntity;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  sidebar?: ReactNode;
  actions?: ReactNode;
}

// Summary stats props (common across many entities)
export interface SummaryStatsProps extends BaseComponentProps {
  stats: {
    '2yr_mean_citedness': number;
    h_index: number;
    i10_index: number;
  };
  layout?: 'horizontal' | 'vertical' | 'grid';
  showLabels?: boolean;
}

// Author affiliation props
export interface AuthorAffiliationProps extends BaseComponentProps {
  affiliations: Array<{
    institution: {
      id: string;
      display_name: string;
      country_code?: string;
      type?: string;
    };
    years: number[];
  }>;
  compact?: boolean;
  limit?: number;
}

// Citation count props
export interface CitationCountProps extends BaseComponentProps {
  count: number;
  percentile?: {
    min: number;
    max: number;
  };
  showPercentile?: boolean;
  size?: SizeVariant;
}

// Open access indicator props
export interface OpenAccessIndicatorProps extends BaseComponentProps {
  openAccess: {
    is_oa: boolean;
    oa_status: 'gold' | 'green' | 'hybrid' | 'bronze' | 'closed';
    oa_url?: string;
  };
  showUrl?: boolean;
  size?: SizeVariant;
}

// Work type badge props
export interface WorkTypeBadgeProps extends BaseComponentProps {
  type?: string;
  typeCrossref?: string;
  size?: SizeVariant;
}

// Institution type badge props
export interface InstitutionTypeBadgeProps extends BaseComponentProps {
  type: 'education' | 'healthcare' | 'company' | 'archive' | 'nonprofit' | 'government' | 'facility' | 'other';
  size?: SizeVariant;
}

// Source type badge props
export interface SourceTypeBadgeProps extends BaseComponentProps {
  type: 'journal' | 'repository' | 'conference' | 'ebook-platform' | 'book-series' | 'other';
  size?: SizeVariant;
}

// Loading skeleton props
export interface LoadingSkeletonProps extends BaseComponentProps {
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' | string;
  height?: SizeVariant | string;
  shape?: 'rectangle' | 'rounded' | 'pill' | 'circle' | 'square';
  preset?: 'text' | 'title' | 'subtitle' | 'button' | 'avatar' | 'badge' | 'card';
  animation?: 'pulse' | 'wave' | 'none';
  inline?: boolean;
}

// Error message props
export interface ErrorMessageProps extends BaseComponentProps {
  title?: string;
  message: string;
  details?: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  size?: SizeVariant;
  dismissible?: boolean;
  compact?: boolean;
  inline?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  onDismiss?: () => void;
}

// Metric badge props
export interface MetricBadgeProps extends BaseComponentProps {
  value: number | string;
  label?: string;
  format?: 'number' | 'percentage' | 'currency' | 'compact';
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'muted';
  size?: SizeVariant;
  icon?: ReactNode;
  compact?: boolean;
  inline?: boolean;
}

// Metric display props
export interface MetricDisplayProps extends BaseComponentProps {
  label: string;
  value: number | string;
  description?: string;
  icon?: string;
  format?: 'number' | 'percentage' | 'currency' | 'compact';
  layout?: 'horizontal' | 'vertical' | 'compact';
  size?: SizeVariant;
  variant?: 'default' | 'highlighted' | 'muted';
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value?: number | string;
    label?: string;
  };
  loading?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  accessories?: ReactNode;
}

// Collapsible section props
export interface CollapsibleSectionProps extends BaseComponentProps {
  title: string;
  icon?: string;
  defaultExpanded?: boolean;
  headerActions?: ReactNode;
  size?: SizeVariant;
  variant?: 'default' | 'bordered' | 'filled';
}

// Tab group props
export interface TabGroupProps extends BaseComponentProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: string;
    content: ReactNode;
    disabled?: boolean;
  }>;
  defaultActiveTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: SizeVariant;
}

// Entity details section props (updated)
export interface EntityDetailsSectionProps extends BaseComponentProps {
  title: string;
  icon?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  headerActions?: ReactNode;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

// Data fetching state
export interface DataState<T> {
  data?: T;
  loading: boolean;
  error?: string;
  lastFetched?: Date;
  retry?: () => void;
}

// Client-side entity fetcher props
export interface EntityFetcherProps<T = OpenAlexEntity> {
  entityId: string;
  entityType: EntityType;
  onData?: (data: T) => void;
  onError?: (error: string) => void;
  children: (state: DataState<T>) => ReactNode;
}

// Utility types for formatting
export interface FormatterOptions {
  locale?: string;
  notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

// Error boundary props
export interface EntityErrorBoundaryProps extends BaseComponentProps {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  entityType?: EntityType;
  entityId?: string;
}

// Loading spinner props
export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
}

// Skeleton props
export interface SkeletonProps extends BaseComponentProps {
  width?: string;
  height?: string;
  rounded?: boolean;
}

// Entity loading props
export interface EntityLoadingProps extends BaseComponentProps {
  entityType?: string;
  entityId?: string;
  message?: string;
}