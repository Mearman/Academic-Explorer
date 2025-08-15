'use client';

import { useNavigate } from '@tanstack/react-router';
import { forwardRef, Suspense } from 'react';

import { ErrorMessage } from '../atoms/error-message';
import { Icon } from '../atoms/icon';
import { LoadingSkeleton } from '../atoms/loading-skeleton';
import { EntityBreadcrumbs } from '../molecules/entity-breadcrumbs';
import { EntitySectionHeader } from '../molecules/entity-section-header';
import { FloatingActions } from '../molecules/floating-actions';
import { EntityHeader, EntityHeaderSkeleton } from '../organisms/entity-header';
import type { EntityPageTemplateProps } from '../types';

import * as styles from './entity-page-template.css.ts';


export const EntityPageTemplate = forwardRef<HTMLDivElement, EntityPageTemplateProps>(
  ({ 
    entity,
    breadcrumbs,
    sidebar,
    actions,
    children,
    className,
    'data-testid': testId,
    ...props 
  }, ref) => {
    const layoutClass = sidebar ? styles.layoutVariants.withSidebar : styles.layoutVariants.default;

    return (
      <div
        ref={ref}
        className={styles.container}
        data-testid={testId}
        {...props}
      >
        <div className={`${styles.pageWrapper} ${layoutClass} ${className || ''}`}>
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className={styles.breadcrumbsWrapper}>
              <EntityBreadcrumbs breadcrumbs={breadcrumbs} />
            </div>
          )}

          {/* Main content area */}
          <div style={{ gridColumn: sidebar ? '1' : 'span 1' }}>
            {/* Entity Header */}
            <div className={styles.headerWrapper}>
              <Suspense fallback={<EntityHeaderSkeleton />}>
                <EntityHeader
                  entity={entity}
                  showBreadcrumbs={false} // Already handled above
                  showActions={!!actions}
                  actions={actions}
                />
              </Suspense>
            </div>

            {/* Main content */}
            <main className={styles.mainContent}>
              {children}
            </main>
          </div>

          {/* Sidebar */}
          {sidebar && (
            <aside className={styles.sidebar}>
              {sidebar}
            </aside>
          )}
        </div>

        {/* Floating Actions */}
        <FloatingActions />
      </div>
    );
  }
);

EntityPageTemplate.displayName = 'EntityPageTemplate';

// Helper function to render section content
const renderSectionContent = (loading: boolean, children: React.ReactNode) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <LoadingSkeleton preset="title" width="60%" />
        <LoadingSkeleton preset="text" width="100%" />
        <LoadingSkeleton preset="text" width="80%" />
        <LoadingSkeleton preset="text" width="90%" />
      </div>
    );
  }
  return children;
};

// Section component for consistent styling
export const EntitySection = forwardRef<
  HTMLElement,
  {
    title: string;
    icon?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    loading?: boolean;
    error?: string;
    className?: string;
    'data-testid'?: string;
  }
>(({
  title,
  icon,
  actions,
  children,
  loading = false,
  error,
  className,
  'data-testid': testId,
  ...props
}, ref) => {
  if (error) {
    return (
      <section
        ref={ref}
        className={`${styles.section} ${className || ''}`}
        data-testid={testId}
        {...props}
      >
        <EntitySectionHeader title={title} icon={icon} />
        <ErrorMessage
          message={error}
          severity="error"
          actions={[
            {
              label: 'Retry',
              onClick: () => window.location.reload(),
            },
          ]}
        />
      </section>
    );
  }

  return (
    <section
      ref={ref}
      className={`${styles.section} ${className || ''}`}
      data-testid={testId}
      {...props}
    >
      <EntitySectionHeader title={title} icon={icon} actions={actions} />
      {renderSectionContent(loading, children)}
    </section>
  );
});

EntitySection.displayName = 'EntitySection';

// Empty state component
export const EmptyState = ({ 
  icon = 'info',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className={styles.emptyState}>
    <Icon name={icon} size="xl" aria-hidden="true" />
    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{title}</h3>
    {description && (
      <p style={{ margin: 0, color: 'inherit' }}>{description}</p>
    )}
    {action && action}
  </div>
);

// Loading template for entire page
export const EntityPageLoadingTemplate = () => (
  <div className={styles.container}>
    <div className={`${styles.pageWrapper} ${styles.layoutVariants.default}`}>
      <div className={styles.headerWrapper}>
        <EntityHeaderSkeleton />
      </div>
      
      <div className={styles.mainContent}>
        <div className={styles.section}>
          <LoadingSkeleton preset="title" width="40%" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
            <LoadingSkeleton preset="text" width="100%" />
            <LoadingSkeleton preset="text" width="85%" />
            <LoadingSkeleton preset="text" width="70%" />
          </div>
        </div>
        
        <div className={styles.section}>
          <LoadingSkeleton preset="title" width="30%" />
          <div className={styles.metricGrid}>
            <LoadingSkeleton preset="card" />
            <LoadingSkeleton preset="card" />
            <LoadingSkeleton preset="card" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Error template for entire page
export const EntityPageErrorTemplate = ({ 
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) => {
  const navigate = useNavigate();
  
  return (
  <div className={styles.container}>
    <div className={`${styles.pageWrapper} ${styles.layoutVariants.centered}`}>
      <div className={styles.errorContainer}>
        <Icon name="error" size="xl" aria-hidden="true" />
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
          Unable to Load Entity
        </h1>
        <ErrorMessage
          message={error}
          severity="error"
          actions={onRetry ? [
            {
              label: 'Try Again',
              onClick: onRetry,
            },
            {
              label: 'Go Home',
              onClick: () => navigate({ to: '/', replace: true }),
            },
          ] : undefined}
        />
      </div>
    </div>
  </div>
  );
};