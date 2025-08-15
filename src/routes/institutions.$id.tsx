import { Stack, Tabs } from '@mantine/core';
import { IconBuilding, IconCode } from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

import { 
  RawDataView,
  EntityError, 
  EntitySkeleton, 
  EntityFallback,
  EntityPageTemplate,
  EntityErrorBoundary,
  InstitutionMetrics,
  InstitutionDetails,
  InstitutionRelations,
  InstitutionExternalLinks
} from '@/components';
import { useInstitutionData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import type { Institution } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

function InstitutionDisplay({ institution }: { institution: Institution }) {
  return (
    <EntityPageTemplate entity={institution}>
      <Tabs defaultValue="overview" keepMounted={false}>
        <Tabs.List grow mb="xl">
          <Tabs.Tab value="overview" leftSection={<IconBuilding size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="raw-data" leftSection={<IconCode size={16} />}>
            Raw Data
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <Stack gap="xl">
            <InstitutionMetrics institution={institution} />
            <InstitutionDetails institution={institution} />
            <InstitutionRelations institution={institution} />
            <InstitutionExternalLinks institution={institution} />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="raw-data">
          <RawDataView 
            data={institution}
            title="Institution Raw Data"
            entityType="institution"
            entityId={institution.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageTemplate>
  );
}

function InstitutionPage() {
  const { id } = Route.useParams();
  const isRedirecting = useNumericIdRedirect(id, EntityType.INSTITUTION);
  
  const { 
    data: institution, 
    loading, 
    error, 
    retry 
  } = useInstitutionData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Institution fetch error:', error);
    }
  });

  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="institutions" entityId={id}>
        <EntitySkeleton entityType={EntityType.INSTITUTION} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="institutions" entityId={id}>
        <EntitySkeleton entityType={EntityType.INSTITUTION} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="institutions" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.INSTITUTION}
        />
      </EntityErrorBoundary>
    );
  }

  // Show institution data
  if (institution) {
    return (
      <EntityErrorBoundary entityType="institutions" entityId={id}>
        <InstitutionDisplay institution={institution} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="institutions" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.INSTITUTION}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/institutions/$id')({
  component: InstitutionPage,
});