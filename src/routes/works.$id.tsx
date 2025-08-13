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
  EntityErrorBoundary,
  Icon
} from '@/components';
import * as styles from './works.$id.css';

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
    <EntityPageTemplate entity={work}>
      <div className={styles.workContainer}>
        {/* Enhanced Key Metrics */}
        <div className={styles.metricsGrid}>
          <MetricBadge
            value={work.cited_by_count}
            label="Citations"
            variant="primary"
            size="xl"
          />
          <MetricBadge
            value={work.publication_year || 'N/A'}
            label="Published"
            variant="default"
            size="xl"
          />
          <MetricBadge
            value={work.authorships?.length || 0}
            label="Authors"
            variant="default"
            size="xl"
          />
          <MetricBadge
            value={work.open_access.is_oa ? 'Open Access' : 'Restricted'}
            label="Access Status"
            variant={work.open_access.is_oa ? 'success' : 'error'}
            size="xl"
          />
        </div>

        {/* Enhanced Publication Details */}
        <EntitySection title="Publication Details" icon="info">
          <div className={styles.detailsGrid}>
            {work.primary_location?.source && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Source Journal</div>
                <div className={styles.detailValue}>{work.primary_location.source.display_name}</div>
              </div>
            )}
            
            {work.publication_date && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Publication Date</div>
                <div className={styles.detailValue}>{work.publication_date}</div>
              </div>
            )}
            
            {work.ids.doi && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Digital Object Identifier</div>
                <div className={styles.detailValue}>
                  <a 
                    href={`https://doi.org/${work.ids.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.doiLink}
                  >
                    {work.ids.doi}
                  </a>
                </div>
              </div>
            )}
            
            {work.language && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Language</div>
                <div className={styles.detailValue}>{work.language}</div>
              </div>
            )}
          </div>
        </EntitySection>

        {/* Enhanced Abstract */}
        {work.abstract_inverted_index && (
          <EntitySection title="Abstract" icon="document">
            <div className={styles.abstractSection}>
              <p className={styles.abstractText}>
                <Icon name="info" size="sm" />
                Abstract available in inverted index format. 
                Full text reconstruction feature coming soon.
              </p>
            </div>
          </EntitySection>
        )}

        {/* Enhanced Topics */}
        {work.topics && work.topics.length > 0 && (
          <EntitySection title="Research Topics" icon="tag">
            <div className={styles.topicsContainer}>
              {work.topics.map((topic) => (
                <Badge
                  key={topic.id}
                  variant="secondary"
                  size="md"
                >
                  {topic.display_name}
                </Badge>
              ))}
            </div>
          </EntitySection>
        )}

        {/* Enhanced External Links */}
        <EntitySection title="Access & Resources" icon="link">
          <div className={styles.externalLinksContainer}>
            {externalLinks.map((link, index) => (
              link && (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.externalLink} ${styles.linkVariants[link.type]}`}
                >
                  <Icon 
                    name={link.type === 'pdf' ? 'download' : link.type === 'publisher' ? 'external' : 'info'} 
                    size="sm" 
                  />
                  {link.label}
                </a>
              )
            ))}
          </div>
        </EntitySection>
      </div>
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