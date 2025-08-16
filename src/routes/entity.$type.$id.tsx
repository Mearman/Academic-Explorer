import { createFileRoute } from '@tanstack/react-router';
import React from 'react';

import { EntityPageWithGraph, EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback } from '@/components';
import { AuthorDisplay } from '@/components/entity-displays/AuthorDisplay';
import { ConceptDisplay } from '@/components/entity-displays/ConceptDisplay';
import { FunderDisplay } from '@/components/entity-displays/FunderDisplay';
import { InstitutionDisplay } from '@/components/entity-displays/InstitutionDisplay';
import { PublisherDisplay } from '@/components/entity-displays/PublisherDisplay';
import { SourceDisplay } from '@/components/entity-displays/SourceDisplay';
import { TopicDisplay } from '@/components/entity-displays/TopicDisplay';
import { WorkDisplay } from '@/components/entity-displays/WorkDisplay';
import { useEntityData } from '@/hooks/use-entity-data';
import type { EntityData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
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
  
  if (!DisplayComponent) {
    return (
      <EntityPageWithGraph entity={entity}>
        <div style={{ padding: '20px' }}>
          <h1>{entity.display_name}</h1>
          <p>Entity type: {entityType}</p>
          <p>ID: {entity.id}</p>
          <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
            {JSON.stringify(entity, null, 2)}
          </pre>
        </div>
      </EntityPageWithGraph>
    );
  }
  
  // TypeScript needs help understanding that entity matches the component's expected type
  return <DisplayComponent entity={entity as any} />;
}

function EntityPage() {
  const { type, id } = Route.useParams();
  
  // Convert URL type to EntityType enum
  const entityType = URL_TO_ENTITY_TYPE[type];
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, entityType);
  
  const { 
    data: entity, 
    loading, 
    error, 
    retry 
  } = useEntityData(id, entityType, {
    enabled: !!id && !isRedirecting && !!entityType,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error: any) => {
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
          entityType={type as any}
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