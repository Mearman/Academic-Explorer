'use client';

import { useNavigate } from '@tanstack/react-router';
import { forwardRef, useState, useEffect, Suspense } from 'react';

import { ErrorMessage } from '../atoms/error-message';
import { Icon } from '../atoms/icon';
import { LoadingSkeleton } from '../atoms/loading-skeleton';
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
    const [showBackToTop, setShowBackToTop] = useState(false);

    // Handle scroll to show/hide back to top button
    useEffect(() => {
      const handleScroll = () => {
        setShowBackToTop(window.scrollY > 300);
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
            <nav className={styles.breadcrumbsWrapper} aria-label="Breadcrumb">
              <ol style={{ display: 'flex', gap: '8px', margin: 0, padding: 0, listStyle: 'none' }}>
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {index > 0 && (
                      <Icon name="forward" size="sm" aria-hidden="true" />
                    )}
                    {crumb.href ? (
                      <a 
                        href={crumb.href}
                        style={{ 
                          textDecoration: 'none', 
                          color: 'inherit',
                          fontSize: '14px',
                        }}
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
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
        <div className={styles.floatingActions}>
          {showBackToTop && (
            <button
              className={styles.backToTop}
              onClick={scrollToTop}
              aria-label="Back to top"
              title="Back to top"
            >
              <Icon name="up" size="md" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

EntityPageTemplate.displayName = 'EntityPageTemplate';

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
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {icon && <Icon name={icon} size="md" aria-hidden="true" />}
            {title}
          </h2>
        </div>
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
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          {icon && <Icon name={icon} size="md" aria-hidden="true" />}
          {title}
        </h2>
        {actions && (
          <div className={styles.sectionActions}>
            {actions}
          </div>
        )}
      </div>
      
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <LoadingSkeleton preset="title" width="60%" />
          <LoadingSkeleton preset="text" width="100%" />
          <LoadingSkeleton preset="text" width="80%" />
          <LoadingSkeleton preset="text" width="90%" />
        </div>
      ) : (
        children
      )}
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