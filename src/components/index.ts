// Atoms
export { Badge } from './atoms/badge';
export { EntityBadge } from './atoms/entity-badge';
export { Icon } from './atoms/icon';
export { MetricBadge } from './atoms/metric-badge';
export { StatusIndicator } from './atoms/status-indicator';
export { ExternalLink } from './atoms/external-link';
export { 
  LoadingSkeleton,
  SkeletonGroup,
  TextSkeleton,
  TitleSkeleton,
  ButtonSkeleton,
  AvatarSkeleton,
  BadgeSkeleton,
  CardSkeleton
} from './atoms/loading-skeleton';
export { 
  ErrorMessage,
  ErrorAlert,
  WarningAlert,
  InfoAlert,
  SuccessAlert
} from './atoms/error-message';

// Molecules
export { MetricDisplay } from './molecules/metric-display';
export { ExternalLinksGroup } from './molecules/external-links-group';

// Organisms
export { EntityHeader, EntityHeaderSkeleton } from './organisms/entity-header';

// Templates
export { 
  EntityPageTemplate,
  EntitySection,
  EmptyState,
  EntityPageLoadingTemplate,
  EntityPageErrorTemplate
} from './templates/entity-page-template';

// Utility components
export { default as EntityErrorBoundary } from './error-boundary';
export { EntityLoading, EntityPageSkeleton } from './loading';

// Types
export type {
  EntityType,
  OpenAlexEntity,
  SizeVariant,
  BadgeVariant,
  BaseComponentProps,
  BadgeProps,
  IconProps,
  MetricBadgeProps,
  StatusIndicatorProps,
  ExternalLinkProps,
  LoadingSkeletonProps,
  ErrorMessageProps,
  MetricDisplayProps,
  ExternalLinksGroupProps,
  EntityHeaderProps,
  EntityPageTemplateProps,
  EntityDetailsSectionProps,
  CollapsibleSectionProps,
  TabGroupProps,
  DataState,
  EntityFetcherProps,
  FormatterOptions,
  EntityErrorBoundaryProps,
} from './types';

// Design tokens
export { entityVars } from './design-tokens.css';
export { 
  getEntityColour, 
  getOpenAccessColour 
} from './design-tokens.utils';