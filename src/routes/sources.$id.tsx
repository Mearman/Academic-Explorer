import { Stack, Tabs } from '@mantine/core';
import { IconBook2, IconCode } from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

import { 
  RawDataView,
  EntityError, 
  EntitySkeleton, 
  EntityFallback,
  EntityPageTemplate,
  EntityErrorBoundary,
  SourceMetricsGrid,
  SourcePublicationDetails,
  SourceExternalLinks
} from '@/components';
import { useSourceData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import type { Source } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

function SourceDisplay({ source }: { source: Source }) {
  return (
    <EntityPageTemplate entity={source}>
      <Tabs defaultValue="overview" keepMounted={false}>
        <Tabs.List grow mb="xl">
          <Tabs.Tab value="overview" leftSection={<IconBook2 size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="raw-data" leftSection={<IconCode size={16} />}>
            Raw Data
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <Stack gap="xl">
            <SourceMetricsGrid source={source} />
            <SourcePublicationDetails source={source} />
            <SourceExternalLinks source={source} />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="raw-data">
          <RawDataView 
            data={source}
            title="Source Raw Data"
            entityType="source"
            entityId={source.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageTemplate>
  );
}

function SourcePage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to /entity/ route
  const isRedirecting = useNumericIdRedirect(id, EntityType.SOURCE);
  
  const { 
    data: source, 
    loading, 
    error, 
    retry 
  } = useSourceData(id, {
    enabled: !!id && !isRedirecting, // Don't fetch if redirecting
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Source fetch error:', error);
    }
  });

  // Show loading state for redirection
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <EntitySkeleton entityType={EntityType.SOURCE} />
      </EntityErrorBoundary>
    );
  }

  // Show loading state for data fetch
  if (loading) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <EntitySkeleton entityType={EntityType.SOURCE} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.SOURCE}
        />
      </EntityErrorBoundary>
    );
  }

  // Show source data
  if (source) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <SourceDisplay source={source} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="sources" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.SOURCE}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/sources/$id')({
  component: SourcePage,
});