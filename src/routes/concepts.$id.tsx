import { Stack, Tabs } from '@mantine/core';
import { IconFileText, IconCode } from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

import { 
  RawDataView,
  EntityError, 
  EntitySkeleton, 
  EntityFallback,
  EntityPageTemplate,
  EntityErrorBoundary,
  ConceptMetricsGrid,
  ConceptHierarchy,
  ConceptDescription,
  ConceptRelatedConcepts,
  ConceptInternationalNames,
  ConceptImages,
  ConceptMetadata,
  ConceptExternalLinksEnhanced
} from '@/components';
import { useConceptData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import type { Concept } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

function ConceptDisplay({ concept }: { concept: Concept }) {
  return (
    <EntityPageTemplate entity={concept}>
      <Tabs defaultValue="overview" keepMounted={false}>
        <Tabs.List grow mb="xl">
          <Tabs.Tab value="overview" leftSection={<IconFileText size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="raw-data" leftSection={<IconCode size={16} />}>
            Raw Data
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <Stack gap="xl">
            <ConceptMetricsGrid concept={concept} />
            <ConceptDescription concept={concept} />
            <ConceptHierarchy concept={concept} />
            <ConceptRelatedConcepts concept={concept} />
            <ConceptImages concept={concept} />
            <ConceptInternationalNames concept={concept} />
            <ConceptMetadata concept={concept} />
            <ConceptExternalLinksEnhanced concept={concept} />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="raw-data">
          <RawDataView 
            data={concept}
            title="Concept Raw Data"
            entityType="concept"
            entityId={concept.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageTemplate>
  );
}

function ConceptPage() {
  const { id } = Route.useParams();
  const isRedirecting = useNumericIdRedirect(id, EntityType.CONCEPT);
  
  const { 
    data: concept, 
    loading, 
    error, 
    retry 
  } = useConceptData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Concept fetch error:', error);
    }
  });

  // Show redirection loading state
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="concepts" entityId={id}>
        <EntitySkeleton entityType={EntityType.CONCEPT} />
      </EntityErrorBoundary>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <EntityErrorBoundary entityType="concepts" entityId={id}>
        <EntitySkeleton entityType={EntityType.CONCEPT} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="concepts" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.CONCEPT}
        />
      </EntityErrorBoundary>
    );
  }

  // Show concept data
  if (concept) {
    return (
      <EntityErrorBoundary entityType="concepts" entityId={id}>
        <ConceptDisplay concept={concept} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="concepts" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.CONCEPT}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/concepts/$id')({
  component: ConceptPage,
});