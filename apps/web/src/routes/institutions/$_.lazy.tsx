import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { INSTITUTION_FIELDS, cachedOpenAlex, type InstitutionEntity, type InstitutionField } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { EntityDetailLayout, LoadingState, ErrorState, ENTITY_TYPE_CONFIGS } from "@/components/entity-detail";
import { useUrlNormalization } from "@/hooks/use-url-normalization";

function InstitutionRoute() {
  const { _splat: rawInstitutionId } = useParams({ from: "/institutions/$_" });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Fix browser address bar display issues with collapsed protocol slashes
  useUrlNormalization();

  // Extract institution ID from URL hash as fallback since splat parameter isn't working
  const getInstitutionIdFromHash = () => {
    if (typeof window !== 'undefined') {
      const hashParts = window.location.hash.split('/');
      return hashParts.length >= 3 ? hashParts[2] : '';
    }
    return '';
  };

  const institutionId = rawInstitutionId || getInstitutionIdFromHash();
  const decodedInstitutionId = decodeEntityId(institutionId);

  // Update URL with pretty display name if needed
  usePrettyUrl("institutions", rawInstitutionId, decodedInstitutionId);

  // Parse select parameter - if not provided, use all INSTITUTION_FIELDS (default behavior)
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as InstitutionField[]
    : [...INSTITUTION_FIELDS];

  // Fetch institution data
  const { data: institution, isLoading, error } = useQuery({
    queryKey: ["institution", decodedInstitutionId, selectParam],
    queryFn: async () => {
      if (!decodedInstitutionId) {
        throw new Error("Institution ID is required");
      }
      const response = await cachedOpenAlex.client.institutions.getInstitution(decodedInstitutionId, {
        select: selectFields,
      });
      return response as InstitutionEntity;
    },
    enabled: !!decodedInstitutionId && decodedInstitutionId !== "random",
  });

  const config = ENTITY_TYPE_CONFIGS.institution;

  if (isLoading) {
    return <LoadingState entityType="Institution" entityId={decodedInstitutionId || ''} config={config} />;
  }

  if (error) {
    return <ErrorState entityType="Institution" entityId={decodedInstitutionId || ''} error={error} />;
  }

  if (!institution || !decodedInstitutionId) {
    return null;
  }

  return (
    <EntityDetailLayout
      config={config}
      entityType="institution"
      entityId={decodedInstitutionId}
      displayName={institution.display_name || "Institution"}
      selectParam={(selectParam as string) || ''}
      selectFields={selectFields}
      viewMode={viewMode}
      onToggleView={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
      data={institution as Record<string, unknown>}
    />
  );
}

export const Route = createLazyFileRoute("/institutions/$_")({
  component: InstitutionRoute,
});

export default InstitutionRoute;
