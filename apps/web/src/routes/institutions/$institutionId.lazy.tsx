import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { INSTITUTION_FIELDS, cachedOpenAlex, type InstitutionEntity, type InstitutionField } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { EntityDetailLayout, LoadingState, ErrorState, ENTITY_TYPE_CONFIGS } from "@/components/entity-detail";

function InstitutionRoute() {
  const { institutionId: rawInstitutionId } = useParams({ strict: false });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the institution ID and fix any collapsed protocol slashes
  const institutionId = decodeEntityId(rawInstitutionId);

  // Parse select parameter - if not provided, use all INSTITUTION_FIELDS (default behavior)
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as InstitutionField[]
    : [...INSTITUTION_FIELDS];

  // Fetch institution data
  const { data: institution, isLoading, error } = useQuery({
    queryKey: ["institution", institutionId, selectParam],
    queryFn: async () => {
      if (!institutionId) {
        throw new Error("Institution ID is required");
      }
      const response = await cachedOpenAlex.client.institutions.getInstitution(institutionId, {
        select: selectFields,
      });
      return response as InstitutionEntity;
    },
    enabled: !!institutionId && institutionId !== "random",
  });

  const config = ENTITY_TYPE_CONFIGS.institution;

  if (isLoading) {
    return <LoadingState entityType="Institution" entityId={institutionId} config={config} />;
  }

  if (error) {
    return <ErrorState entityType="Institution" entityId={institutionId} error={error} />;
  }

  if (!institution) {
    return null;
  }

  return (
    <EntityDetailLayout
      config={config}
      entityType="institution"
      entityId={institutionId}
      displayName={institution.display_name || "Institution"}
      selectParam={selectParam as string}
      selectFields={selectFields}
      viewMode={viewMode}
      onToggleView={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
      data={institution as Record<string, unknown>}
    />
  );
}

export const Route = createLazyFileRoute("/institutions/$institutionId")({
  component: InstitutionRoute,
});

export default InstitutionRoute;
