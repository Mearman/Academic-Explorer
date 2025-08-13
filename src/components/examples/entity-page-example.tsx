'use client';

import { Suspense } from 'react';
import {
  EntityPageTemplate,
  EntitySection,
  MetricDisplay,
  ExternalLinksGroup,
  MetricBadge,
  StatusIndicator,
  EmptyState,
  EntityPageLoadingTemplate,
  EntityPageErrorTemplate,
} from '../index';
import { EntityFetcher } from '../utils/entity-fetcher';
import type { OpenAlexEntity, EntityType } from '../types';
import type { ExternalIds } from '@/lib/openalex/types/entities';

interface EntityPageExampleProps {
  entityId: string;
  entityType: EntityType;
}

// Type guard to check if entity has external IDs
function hasExternalIds(entity: OpenAlexEntity): entity is OpenAlexEntity & { ids: ExternalIds } {
  return 'ids' in entity && entity.ids !== undefined;
}

/**
 * Complete example of an entity detail page using the new component system
 * This demonstrates the full Atomic Design hierarchy in action
 */
export function EntityPageExample({ entityId, entityType }: EntityPageExampleProps) {
  return (
    <EntityFetcher entityId={entityId} entityType={entityType}>
      {({ data: entity, loading, error, retry }) => {
        if (loading) {
          return <EntityPageLoadingTemplate />;
        }

        if (error) {
          return <EntityPageErrorTemplate error={error} onRetry={retry} />;
        }

        if (!entity) {
          return (
            <EntityPageErrorTemplate 
              error="Entity not found" 
              onRetry={retry} 
            />
          );
        }

        return <EntityPageContent entity={entity} />;
      }}
    </EntityFetcher>
  );
}

function EntityPageContent({ entity }: { entity: OpenAlexEntity }) {
  // Example breadcrumbs
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Search', href: '/search' },
    { label: entity.display_name },
  ];

  // Example actions
  const actions = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button 
        style={{ 
          padding: '8px 16px', 
          borderRadius: '6px', 
          border: '1px solid #ccc',
          background: 'white',
          cursor: 'pointer',
        }}
      >
        Share
      </button>
      <button 
        style={{ 
          padding: '8px 16px', 
          borderRadius: '6px', 
          border: '1px solid #ccc',
          background: 'white',
          cursor: 'pointer',
        }}
      >
        Export
      </button>
    </div>
  );

  // Example sidebar content
  const sidebar = (
    <>
      <EntitySection title="Quick Stats" icon="citation">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {hasWorksCount(entity) && (
            <MetricDisplay
              label="Publications"
              value={entity.works_count}
              format="compact"
              icon="publication"
              size="sm"
              layout="compact"
            />
          )}
          {hasCitedByCount(entity) && (
            <MetricDisplay
              label="Citations"
              value={entity.cited_by_count}
              format="compact"
              icon="citation"
              size="sm"
              layout="compact"
            />
          )}
          {hasSummaryStats(entity) && (
            <MetricDisplay
              label="h-index"
              value={entity.summary_stats.h_index}
              format="number"
              icon="hindex"
              size="sm"
              layout="compact"
            />
          )}
        </div>
      </EntitySection>

      {hasExternalIds(entity) && (
        <EntitySection title="External Links" icon="website">
          <ExternalLinksGroup
            externalIds={entity.ids}
            layout="vertical"
            showLabels={true}
          />
        </EntitySection>
      )}

      <EntitySection title="Status" icon="info">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <StatusIndicator status="verified" showLabel={true} />
          {hasOpenAccess(entity) && (
            <StatusIndicator 
              status={entity.open_access.is_oa ? 'active' : 'inactive'} 
              showLabel={true} 
            />
          )}
        </div>
      </EntitySection>
    </>
  );

  return (
    <EntityPageTemplate
      entity={entity}
      breadcrumbs={breadcrumbs}
      sidebar={sidebar}
      actions={actions}
    >
      {/* Main Metrics Section */}
      <EntitySection title="Key Metrics" icon="citation">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '16px' 
        }}>
          {hasWorksCount(entity) && (
            <MetricDisplay
              label="Publications"
              value={entity.works_count}
              format="compact"
              icon="publication"
              description="Total number of published works"
              variant="highlighted"
            />
          )}
          {hasCitedByCount(entity) && (
            <MetricDisplay
              label="Citations"
              value={entity.cited_by_count}
              format="compact"
              icon="citation"
              description="Total citation count across all works"
              variant="highlighted"
            />
          )}
          {hasSummaryStats(entity) && (
            <>
              <MetricDisplay
                label="h-index"
                value={entity.summary_stats.h_index}
                format="number"
                icon="hindex"
                description="Researcher productivity and impact metric"
              />
              <MetricDisplay
                label="2-year Mean Citedness"
                value={entity.summary_stats['2yr_mean_citedness']}
                format="number"
                icon="trend_up"
                description="Average citations per paper in recent years"
              />
            </>
          )}
        </div>
      </EntitySection>

      {/* Entity-specific sections */}
      {isAuthor(entity) && <AuthorSpecificSections entity={entity} />}
      {isWork(entity) && <WorkSpecificSections entity={entity} />}
      {isInstitution(entity) && <InstitutionSpecificSections entity={entity} />}

      {/* Timeline Section */}
      {hasCountsByYear(entity) && entity.counts_by_year.length > 0 && (
        <EntitySection title="Activity Timeline" icon="trend_up">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            maxHeight: '300px',
            overflowY: 'auto',
          }}>
            {entity.counts_by_year
              .slice(-10)
              .reverse()
              .map((yearData) => (
                <div 
                  key={yearData.year}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  <span style={{ fontWeight: '500' }}>{yearData.year}</span>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                    <MetricBadge
                      value={yearData.works_count}
                      label="works"
                      format="number"
                      size="sm"
                      variant="primary"
                      compact
                    />
                    <MetricBadge
                      value={yearData.cited_by_count}
                      label="citations"
                      format="compact"
                      size="sm"
                      variant="success"
                      compact
                    />
                  </div>
                </div>
              ))}
          </div>
        </EntitySection>
      )}
    </EntityPageTemplate>
  );
}

// Entity-specific section components
function AuthorSpecificSections({ entity }: { entity: any }) {
  if (!entity.affiliations || entity.affiliations.length === 0) {
    return null;
  }

  return (
    <EntitySection title="Affiliation History" icon="institution">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {entity.affiliations.slice(0, 5).map((affiliation: any, index: number) => (
          <div key={index} style={{ 
            padding: '12px', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            borderLeft: '4px solid #3b82f6'
          }}>
            <h4 style={{ margin: '0 0 4px 0', fontWeight: '600' }}>
              {affiliation.institution.display_name}
            </h4>
            <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
              {affiliation.institution.type && (
                <span style={{ textTransform: 'capitalize' }}>
                  {affiliation.institution.type}
                </span>
              )}
              {affiliation.institution.country_code && (
                <span> • {affiliation.institution.country_code}</span>
              )}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
              Years: {affiliation.years.join(', ')}
            </p>
          </div>
        ))}
      </div>
    </EntitySection>
  );
}

function WorkSpecificSections({ entity }: { entity: any }) {
  return (
    <>
      {entity.authorships && entity.authorships.length > 0 && (
        <EntitySection title="Authors" icon="author">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
            {entity.authorships.slice(0, 12).map((authorship: any, index: number) => (
              <div key={index} style={{ 
                padding: '8px 12px', 
                backgroundColor: '#f9fafb', 
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <div style={{ fontWeight: '500' }}>
                  {authorship.author.display_name}
                </div>
                {authorship.institutions.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    {authorship.institutions[0].display_name}
                  </div>
                )}
              </div>
            ))}
            {entity.authorships.length > 12 && (
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: '#f3f4f6', 
                borderRadius: '6px',
                fontSize: '14px',
                color: '#6b7280',
                textAlign: 'center'
              }}>
                +{entity.authorships.length - 12} more authors
              </div>
            )}
          </div>
        </EntitySection>
      )}

      {entity.topics && entity.topics.length > 0 && (
        <EntitySection title="Research Topics" icon="topic">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {entity.topics.slice(0, 10).map((topic: any) => (
              <MetricBadge
                key={topic.id}
                value={topic.display_name}
                variant="muted"
                size="sm"
              />
            ))}
          </div>
        </EntitySection>
      )}
    </>
  );
}

function InstitutionSpecificSections({ entity }: { entity: any }) {
  return (
    <EntitySection title="Institution Details" icon="institution">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {entity.type && (
          <div>
            <dt style={{ fontWeight: '500', marginBottom: '4px' }}>Type</dt>
            <dd style={{ margin: 0, textTransform: 'capitalize' }}>{entity.type}</dd>
          </div>
        )}
        {entity.country_code && (
          <div>
            <dt style={{ fontWeight: '500', marginBottom: '4px' }}>Country</dt>
            <dd style={{ margin: 0 }}>{entity.country_code}</dd>
          </div>
        )}
        {entity.geo?.city && (
          <div>
            <dt style={{ fontWeight: '500', marginBottom: '4px' }}>Location</dt>
            <dd style={{ margin: 0 }}>{entity.geo.city}</dd>
          </div>
        )}
      </div>
    </EntitySection>
  );
}

// Type guards
function hasWorksCount(entity: any): entity is { works_count: number } {
  return 'works_count' in entity && typeof entity.works_count === 'number';
}

function hasCitedByCount(entity: any): entity is { cited_by_count: number } {
  return 'cited_by_count' in entity && typeof entity.cited_by_count === 'number';
}

function hasSummaryStats(entity: any): entity is { summary_stats: any } {
  return 'summary_stats' in entity && entity.summary_stats;
}

function hasOpenAccess(entity: any): entity is { open_access: any } {
  return 'open_access' in entity && entity.open_access;
}

function hasCountsByYear(entity: any): entity is { counts_by_year: any[] } {
  return 'counts_by_year' in entity && Array.isArray(entity.counts_by_year);
}

function isAuthor(entity: any): boolean {
  return 'affiliations' in entity && !('authorships' in entity);
}

function isWork(entity: any): boolean {
  return 'authorships' in entity;
}

function isInstitution(entity: any): boolean {
  return 'type' in entity && 'geo' in entity;
}