import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { cachedOpenAlex } from "@academic-explorer/client";
import { type Topic, type TopicField } from "@academic-explorer/types/entities";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { EntityDetailLayout } from "@/components/entity-detail/EntityDetailLayout";
import { LoadingState } from "@/components/entity-detail/LoadingState";
import { ErrorState } from "@/components/entity-detail/ErrorState";
import { ENTITY_TYPE_CONFIGS } from "@/components/entity-detail/EntityTypeConfig";
import { IncomingRelationships } from "@/components/relationship/IncomingRelationships";
import { OutgoingRelationships } from "@/components/relationship/OutgoingRelationships";
import { RelationshipCounts } from "@/components/relationship/RelationshipCounts";
import { useEntityRelationships } from "@/hooks/use-entity-relationships";

function SubfieldRoute() {
  const { subfieldId: rawSubfieldId } = useParams({ strict: false }) as { subfieldId: string };
  const { select: selectParam } = useSearch({ strict: false }) as { select?: string };
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the subfield ID in case it's URL-encoded
  const subfieldId = decodeEntityId(rawSubfieldId);

  // Use pretty URL hook to replace encoded IDs with decoded versions in the URL
  usePrettyUrl("subfields", rawSubfieldId, subfieldId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as TopicField[]
    : undefined;

  // Construct full OpenAlex subfield URL
  const fullSubfieldId = subfieldId ? `https://openalex.org/subfields/${subfieldId}` : '';

  // Fetch subfield data - subfields use the topics endpoint with full subfield URL
  const { data: subfield, isLoading, error } = useQuery({
    queryKey: ["subfield", subfieldId, selectParam],
    queryFn: async () => {
      if (!subfieldId) {
        throw new Error("Subfield ID is required");
      }
      const response = await cachedOpenAlex.client.topics.getTopic(
        fullSubfieldId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Topic;
    },
    enabled: !!subfieldId,
  });

  // Get relationship counts for summary display - MUST be called before early returns (Rules of Hooks)
  const { incomingCount, outgoingCount } = useEntityRelationships(
    fullSubfieldId,
    'topics'
  );

  // Handle loading state
  if (isLoading) {
    return <LoadingState entityType="Subfield" entityId={subfieldId || ''} config={ENTITY_TYPE_CONFIGS.topic} />;
  }

  // Handle error state
  if (error || !subfield) {
    return (
      <ErrorState
        error={error}
        entityType="Subfield"
        entityId={subfieldId || ''}
      />
    );
  }

  return (
    <EntityDetailLayout
      config={ENTITY_TYPE_CONFIGS.topic}
      entityType="topic"
      entityId={fullSubfieldId}
      displayName={subfield.display_name || "Subfield"}
      selectParam={typeof selectParam === 'string' ? selectParam : undefined}
      selectFields={selectFields || []}
      viewMode={viewMode}
      onToggleView={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
      data={subfield}>
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <IncomingRelationships entityId={fullSubfieldId} entityType="topics" />
      <OutgoingRelationships entityId={fullSubfieldId} entityType="topics" />
    </EntityDetailLayout>
  );
}

export const Route = createLazyFileRoute("/subfields/$subfieldId")({
  component: SubfieldRoute,
});

export default SubfieldRoute;
