import { createFileRoute } from '@tanstack/react-router';
import React, { useMemo } from 'react';

import { TwoPaneLayout, EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback } from '@/components';
import { GraphSection } from '@/components/organisms/graph-section/GraphSection';
import { useEntityGraphStats } from '@/hooks/use-entity-graph-stats';
import { useEntityGraphTracking } from '@/hooks/use-entity-graph-tracking';
import { useEntityGraphStore } from '@/stores/entity-graph-store';
import { AuthorDisplay } from '@/components/entity-displays/AuthorDisplay';
import { ConceptDisplay } from '@/components/entity-displays/ConceptDisplay';
import { FunderDisplay } from '@/components/entity-displays/FunderDisplay';
import { InstitutionDisplay } from '@/components/entity-displays/InstitutionDisplay';
import { PublisherDisplay } from '@/components/entity-displays/PublisherDisplay';
import { SourceDisplay } from '@/components/entity-displays/SourceDisplay';
import { TopicDisplay } from '@/components/entity-displays/TopicDisplay';
import { WorkDisplay } from '@/components/entity-displays/WorkDisplay';
import type { EntityData, EntityError as EntityErrorType } from '@/hooks/use-entity-data';
import { useEntityDataWithTracking } from '@/hooks/use-entity-data-with-tracking';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import type { Work, Author, Source, Institution, Funder, Topic, Concept, Publisher } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

// Entity-specific display components

// Mapping of entity types to their display components
const ENTITY_DISPLAY_COMPONENTS = {
  [EntityType.AUTHOR]: AuthorDisplay,
  [EntityType.WORK]: WorkDisplay,
  [EntityType.SOURCE]: SourceDisplay,
  [EntityType.INSTITUTION]: InstitutionDisplay,
  [EntityType.FUNDER]: FunderDisplay,
  [EntityType.TOPIC]: TopicDisplay,
  [EntityType.CONCEPT]: ConceptDisplay,
  [EntityType.PUBLISHER]: PublisherDisplay,
  [EntityType.KEYWORD]: WorkDisplay, // Fallback to work display
  [EntityType.CONTINENT]: InstitutionDisplay, // Fallback to institution display
  [EntityType.REGION]: InstitutionDisplay, // Fallback to institution display
} as const;

// Mapping of URL entity types to EntityType enum
const URL_TO_ENTITY_TYPE: Record<string, EntityType> = {
  'authors': EntityType.AUTHOR,
  'works': EntityType.WORK,
  'sources': EntityType.SOURCE,
  'institutions': EntityType.INSTITUTION,
  'funders': EntityType.FUNDER,
  'topics': EntityType.TOPIC,
  'concepts': EntityType.CONCEPT,
  'publishers': EntityType.PUBLISHER,
  'keywords': EntityType.KEYWORD,
  'continents': EntityType.CONTINENT,
  'regions': EntityType.REGION,
};

function GenericEntityDisplay({ entity, entityType }: { entity: EntityData; entityType: EntityType }) {
  const DisplayComponent = ENTITY_DISPLAY_COMPONENTS[entityType];
  
  // Graph-related hooks
  const { trackEntityData } = useEntityGraphTracking({
    autoTrack: true,
    extractRelationships: true,
  });

  const { graph, isGraphVisible } = useEntityGraphStore();
  const graphStats = useEntityGraphStats(entity?.id);

  // Track entity data when entity loads
  React.useEffect(() => {
    if (entity && entityType && entity.id && entity.display_name) {
      trackEntityData(entity, entityType, entity.id);
    }
  }, [entity, entityType, trackEntityData]);

  const handleVertexClick = (vertex: any) => {
    // Navigate to the clicked entity
    // This would typically use the router to navigate
    console.log('Vertex clicked:', vertex);
  };

  // Create the graph pane content
  const graphPane = (
    <GraphSection
      isVisible={isGraphVisible}
      graphHeight={400}
      graphStats={graphStats}
      totalVisits={graph.metadata.totalVisits}
      onVertexClick={handleVertexClick}
    />
  );

  if (!DisplayComponent) {
    // Fallback display with two-pane layout
    const dataPane = (
      <div style={{ padding: '20px' }}>
        <h1>{entity.display_name}</h1>
        <p>Entity type: {entityType}</p>
        <p>ID: {entity.id}</p>
        <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(entity, null, 2)}
        </pre>
      </div>
    );

    return (
      <TwoPaneLayout
        leftPane={dataPane}
        rightPane={graphPane}
        stateKey={`entity-${entityType}-${entity.id}`}
        leftTitle={`${entityType} Details`}
        rightTitle="Related Entities"
        showHeaders={true}
        mobileTabLabels={{ left: 'Details', right: 'Graph' }}
      />
    );
  }
  
  // Render the specific entity component with two-pane layout
  const entityDisplayProps = {
    entity: entity as Work & Author & Source & Institution & Funder & Topic & Concept & Publisher,
    useTwoPaneLayout: true,
    graphPane,
  };

  return <DisplayComponent {...entityDisplayProps} />;
}

function EntityPage() {
  const { type, id } = Route.useParams();
  
  // Convert URL type to EntityType enum
  const entityType = URL_TO_ENTITY_TYPE[type];
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, entityType);
  
  // Memoize tracking metadata to prevent unnecessary re-renders
  const trackingMetadata = useMemo(() => ({
    route: '/entity/$type/$id',
    urlType: type,
  }), [type]);
  
  const { 
    data: entity, 
    loading, 
    error, 
    retry 
  } = useEntityDataWithTracking(id, entityType, {
    enabled: !!id && !isRedirecting && !!entityType,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    enableTracking: true,
    visitSource: 'direct',
    trackingMetadata,
    onError: (error: EntityErrorType) => {
      console.error(`${entityType} fetch error:`, error);
    }
  });

  // Handle invalid entity type
  if (!entityType) {
    return (
      <EntityErrorBoundary entityType={type} entityId={id}>
        <EntityError 
          error={new Error(`Unknown entity type: ${type}`)}
          onRetry={() => window.location.reload()}
          entityId={id} 
          entityType={undefined}
        />
      </EntityErrorBoundary>
    );
  }

  // Show loading state for redirection
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType={type} entityId={id}>
        <EntitySkeleton entityType={entityType} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType={type} entityId={id}>
        <EntitySkeleton entityType={entityType} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType={type} entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={entityType}
        />
      </EntityErrorBoundary>
    );
  }

  // Show entity data
  if (entity) {
    return (
      <EntityErrorBoundary entityType={type} entityId={id}>
        <GenericEntityDisplay entity={entity} entityType={entityType} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType={type} entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={entityType}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/entity/$type/$id')({
  component: EntityPage,
});