import { createFileRoute } from '@tanstack/react-router';
import type { Work } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useWorkData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';
import { 
  EntityPageTemplate,
  EntitySection,
  Badge,
  MetricBadge,
  EntityErrorBoundary
} from '@/components';

function WorkDisplay({ work }: { work: Work }) {
  // External links for the work
  const externalLinks = [
    work.primary_location?.landing_page_url && {
      url: work.primary_location.landing_page_url,
      label: 'Publisher Page',
      type: 'publisher' as const
    },
    work.best_oa_location?.pdf_url && {
      url: work.best_oa_location.pdf_url,
      label: 'Free PDF Access',
      type: 'pdf' as const
    },
    {
      url: `https://openalex.org/${work.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const
    }
  ].filter(Boolean);

  return (
    <EntityPageTemplate
      entity={work}
    >
      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <MetricBadge
          value={work.cited_by_count}
          label="Citations"
          variant="primary"
          size="lg"
        />
        <MetricBadge
          value={work.publication_year || 'N/A'}
          label="Published"
          variant="default"
          size="lg"
        />
        <MetricBadge
          value={work.authorships?.length || 0}
          label="Authors"
          variant="default"
          size="lg"
        />
        <MetricBadge
          value={work.open_access.is_oa ? 'Open' : 'Closed'}
          label="Access"
          variant={work.open_access.is_oa ? 'success' : 'warning'}
          size="lg"
        />
      </div>

      {/* Publication Details */}
      <EntitySection title="Publication Details" icon="info">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {work.primary_location?.source && (
            <div>
              <dt style={{ fontWeight: '500', marginBottom: '4px' }}>Source</dt>
              <dd>{work.primary_location.source.display_name}</dd>
            </div>
          )}
          
          {work.publication_date && (
            <div>
              <dt style={{ fontWeight: '500', marginBottom: '4px' }}>Publication Date</dt>
              <dd>{work.publication_date}</dd>
            </div>
          )}
          
          {work.ids.doi && (
            <div>
              <dt style={{ fontWeight: '500', marginBottom: '4px' }}>DOI</dt>
              <dd>
                <a 
                  href={`https://doi.org/${work.ids.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                >
                  {work.ids.doi}
                </a>
              </dd>
            </div>
          )}
          
          {work.language && (
            <div>
              <dt style={{ fontWeight: '500', marginBottom: '4px' }}>Language</dt>
              <dd>{work.language}</dd>
            </div>
          )}
        </div>
      </EntitySection>

      {/* Abstract */}
      {work.abstract_inverted_index && (
        <EntitySection title="Abstract" icon="document">
          <p style={{ fontStyle: 'italic', opacity: 0.7 }}>
            Abstract available (inverted index format). 
            Implementation needed to reconstruct full text.
          </p>
        </EntitySection>
      )}

      {/* Topics */}
      {work.topics && work.topics.length > 0 && (
        <EntitySection title="Topics" icon="tag">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {work.topics.map((topic) => (
              <Badge
                key={topic.id}
                variant="secondary"
                size="sm"
              >
                {topic.display_name}
              </Badge>
            ))}
          </div>
        </EntitySection>
      )}

      {/* External Links */}
      <EntitySection title="External Links" icon="link">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {externalLinks.map((link, index) => (
            link && (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-card-background, #f8f9fa)',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: 'var(--color-primary, #3b82f6)',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary, #3b82f6)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-card-background, #f8f9fa)';
                  e.currentTarget.style.color = 'var(--color-primary, #3b82f6)';
                }}
              >
                {link.label}
              </a>
            )
          ))}
        </div>
      </EntitySection>
    </EntityPageTemplate>
  );
}

function WorkPage() {
  const { id } = Route.useParams();
  
  const { 
    data: work, 
    loading, 
    error, 
    retry 
  } = useWorkData(id, {
    enabled: !!id,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Work fetch error:', error);
    }
  });

  // Show loading state
  if (loading) {
    return (
      <EntityErrorBoundary entityType="works" entityId={id}>
        <EntitySkeleton entityType={EntityType.WORK} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="works" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.WORK}
        />
      </EntityErrorBoundary>
    );
  }

  // Show work data
  if (work) {
    return (
      <EntityErrorBoundary entityType="works" entityId={id}>
        <WorkDisplay work={work} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="works" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.WORK}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/works/$id')({
  component: WorkPage,
});