import { 
  Card, 
  Badge, 
  Group, 
  Stack, 
  Title, 
  Tabs
} from '@mantine/core';
import { IconFileText, IconTags, IconCode } from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

import { 
  RawDataView, 
  AuthorList, 
  ConceptList, 
  EntityError, 
  EntitySkeleton, 
  EntityFallback,
  EntityPageWithGraph,
  EntityErrorBoundary,
  WorkMetricsGrid,
  WorkPublicationDetails,
  WorkAbstract,
  WorkExternalLinks
} from '@/components';
import { useWorkData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import type { Work } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';


function WorkDisplay({ work }: { work: Work }) {
  return (
    <EntityPageWithGraph entity={work}>
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
            {/* Enhanced Key Metrics */}
            <WorkMetricsGrid work={work} />

            {/* Enhanced Publication Details */}
            <WorkPublicationDetails work={work} />

            {/* Enhanced Abstract */}
            <WorkAbstract work={work} />

            {/* Enhanced Authors */}
            {work.authorships && work.authorships.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconTags size={20} />
                  <Title order={2} size="lg">Authors & Affiliations</Title>
                  <Badge variant="light" color="blue" radius="sm">
                    {work.authorships.length} authors
                  </Badge>
                </Group>
                
                <AuthorList 
                  authorships={work.authorships}
                  showInstitutions={true}
                  showPositions={true}
                  maxAuthors={10}
                />
              </Card>
            )}

            {/* Enhanced Topics & Concepts */}
            {((work.topics && work.topics.length > 0) || (work.concepts && work.concepts.length > 0)) && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconTags size={20} />
                  <Title order={2} size="lg">Research Topics & Concepts</Title>
                </Group>
                
                <ConceptList 
                  topics={work.topics}
                  concepts={work.concepts}
                  showScores={true}
                  variant="detailed"
                  maxItems={15}
                />
              </Card>
            )}

            {/* Enhanced External Links */}
            <WorkExternalLinks work={work} />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="raw-data">
          <RawDataView 
            data={work}
            title="Work Raw Data"
            entityType="work"
            entityId={work.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageWithGraph>
  );
}

function WorkPage() {
  const { id } = Route.useParams();
  
  console.log(`[WorkPage] Rendering with id: ${id}`);
  
  // Handle numeric ID redirection to /entity/ route
  const isRedirecting = useNumericIdRedirect(id, EntityType.WORK);
  
  console.log(`[WorkPage] isRedirecting: ${isRedirecting}`);
  
  const { 
    data: work, 
    loading, 
    error, 
    retry,
    state 
  } = useWorkData(id, {
    enabled: !!id && !isRedirecting, // Don't fetch if redirecting
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onSuccess: (data) => {
      console.log('[WorkPage] Successfully loaded work data:', data?.display_name);
    },
    onError: (error) => {
      console.error('[WorkPage] Work fetch error:', error);
    }
  });

  console.log(`[WorkPage] Hook state: loading=${loading}, hasData=${!!work}, error=${!!error}, state=${state}`);

  // Show loading state for redirection
  if (isRedirecting) {
    console.log('[WorkPage] Rendering redirection skeleton');
    return (
      <EntityErrorBoundary entityType="works" entityId={id}>
        <EntitySkeleton entityType={EntityType.WORK} />
      </EntityErrorBoundary>
    );
  }

  // Show loading state for data fetch
  if (loading) {
    console.log('[WorkPage] Rendering loading skeleton');
    return (
      <EntityErrorBoundary entityType="works" entityId={id}>
        <EntitySkeleton entityType={EntityType.WORK} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    console.log('[WorkPage] Rendering error state:', error);
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
    console.log('[WorkPage] Rendering work data:', work.display_name);
    return (
      <EntityErrorBoundary entityType="works" entityId={id}>
        <WorkDisplay work={work} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  console.log('[WorkPage] Rendering fallback state');
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