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

function FieldRoute() {
  const params = useParams({ from: "/fields/$fieldId" });
  const rawFieldId = params.fieldId;
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the field ID in case it's URL-encoded
  const fieldId = decodeEntityId(rawFieldId);

  // Use pretty URL hook to replace encoded IDs with decoded versions in the URL
  usePrettyUrl("fields", rawFieldId, fieldId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as TopicField[]
    : undefined;

  // Construct full OpenAlex field URL
  const fullFieldId = fieldId ? `https://openalex.org/fields/${fieldId}` : '';

  // Fetch field data - fields use the topics endpoint with full field URL
  const { data: field, isLoading, error } = useQuery({
    queryKey: ["field", fieldId, selectParam],
    queryFn: async () => {
      if (!fieldId) {
        throw new Error("Field ID is required");
      }
      const response = await cachedOpenAlex.client.topics.getTopic(
        fullFieldId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Topic;
    },
    enabled: !!fieldId,
  });

  // Get relationship counts for summary display - MUST be called before early returns (Rules of Hooks)
  const { incomingCount, outgoingCount } = useEntityRelationships(
    fullFieldId,
    'topics'
  );

  // Handle loading state
  if (isLoading) {
    return <LoadingState entityType="Field" entityId={fieldId || ''} config={ENTITY_TYPE_CONFIGS.topic} />;
  }

  // Handle error state
  if (error || !field) {
    return (
      <ErrorState
        error={error}
        entityType="Field"
        entityId={fieldId || ''}
      />
    );
  }

  return (
    <EntityDetailLayout
      config={ENTITY_TYPE_CONFIGS.topic}
      entityType="topics"
      entityId={fullFieldId}
      displayName={field.display_name || "Field"}
      selectParam={typeof selectParam === 'string' ? selectParam : undefined}
      selectFields={selectFields || []}
      viewMode={viewMode}
      onToggleView={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
      data={field}>
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <IncomingRelationships entityId={fullFieldId} entityType="topics" />
      <OutgoingRelationships entityId={fullFieldId} entityType="topics" />
    </EntityDetailLayout>
  );
}

export const Route = createLazyFileRoute("/fields/$fieldId")({
  component: FieldRoute,
});

export default FieldRoute;
