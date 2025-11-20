import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { cachedOpenAlex } from "@academic-explorer/client";
import { type Domain } from "@academic-explorer/types/entities";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { EntityDetailLayout } from "@/components/entity-detail/EntityDetailLayout";
import { LoadingState } from "@/components/entity-detail/LoadingState";
import { ErrorState } from "@/components/entity-detail/ErrorState";
import { ENTITY_TYPE_CONFIGS } from "@/components/entity-detail/EntityTypeConfig";
// Relationship components disabled for taxonomy entities (domains/fields/subfields)
// These entities have hierarchical parent/child relationships, not edge-based relationships
// import { IncomingRelationships } from "@/components/relationship/IncomingRelationships";
// import { OutgoingRelationships } from "@/components/relationship/OutgoingRelationships";
// import { RelationshipCounts } from "@/components/relationship/RelationshipCounts";
// import { useEntityRelationships } from "@/hooks/use-entity-relationships";

function DomainRoute() {
  const { domainId: rawDomainId } = useParams({ strict: false }) as { domainId: string };
  const { select: selectParam } = useSearch({ strict: false }) as { select?: string };
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the domain ID in case it's URL-encoded
  const domainId = decodeEntityId(rawDomainId);

  // Use pretty URL hook to replace encoded IDs with decoded versions in the URL
  usePrettyUrl("domains", rawDomainId, domainId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim())
    : undefined;

  // Construct full OpenAlex domain URL
  const fullDomainId = domainId ? `https://openalex.org/domains/${domainId}` : '';

  // Fetch domain data - domains use the domains endpoint
  const { data: domain, isLoading, error } = useQuery({
    queryKey: ["domain", domainId, selectParam],
    queryFn: async () => {
      if (!domainId) {
        throw new Error("Domain ID is required");
      }
      const response = await cachedOpenAlex.getById(
        'domains',
        domainId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Domain;
    },
    enabled: !!domainId,
  });

  // Relationship counts disabled for taxonomy entities
  // const { incomingCount, outgoingCount } = useEntityRelationships(
  //   fullDomainId,
  //   'domains'
  // );

  // Handle loading state
  if (isLoading) {
    return <LoadingState entityType="Domain" entityId={domainId || ''} config={ENTITY_TYPE_CONFIGS.topic} />;
  }

  // Handle error state
  if (error || !domain) {
    return (
      <ErrorState
        error={error}
        entityType="Domain"
        entityId={domainId || ''}
      />
    );
  }

  return (
    <EntityDetailLayout
      config={ENTITY_TYPE_CONFIGS.topic}
      entityType="domain"
      entityId={fullDomainId}
      displayName={domain.display_name || "Domain"}
      selectParam={typeof selectParam === 'string' ? selectParam : undefined}
      selectFields={selectFields || []}
      viewMode={viewMode}
      onToggleView={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
      data={domain}>
      {/* Relationship components disabled - taxonomy entities have hierarchical structure */}
    </EntityDetailLayout>
  );
}

export const Route = createLazyFileRoute("/domains/$domainId")({
  component: DomainRoute,
});

export default DomainRoute;
