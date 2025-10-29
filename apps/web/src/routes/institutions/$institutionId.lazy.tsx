import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { INSTITUTION_FIELDS, cachedOpenAlex, type InstitutionEntity, type InstitutionField } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { EntityDataDisplay } from "@/components/EntityDataDisplay";

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

  // Render content based on state
  let content;
  if (isLoading) {
    content = (
      <div className="p-4 text-center">
        <h2>Loading Institution...</h2>
        <p>Institution ID: {institutionId}</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Institution</h2>
        <p>Institution ID: {institutionId}</p>
        <p>Error: {String(error)}</p>
      </div>
    );
  } else {
    content = (
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">{institution?.display_name || "Institution"}</h1>
          <div className="text-sm text-gray-600 mb-4">
            <strong>Institution ID:</strong> {institutionId}<br />
            <strong>Select fields:</strong> {selectParam && typeof selectParam === 'string' ? selectParam : `default (${selectFields.join(", ")})`}
          </div>
          <button
            onClick={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Toggle {viewMode === "raw" ? "Rich" : "Raw"} View
          </button>
        </div>

        {viewMode === "raw" ? (
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[600px]">
            {JSON.stringify(institution, null, 2)}
          </pre>
        ) : (
          <EntityDataDisplay data={institution as Record<string, unknown>} />
        )}
      </div>
    );
  }

  return content;
}

export const Route = createLazyFileRoute("/institutions/$institutionId")({
  component: InstitutionRoute,
});

export default InstitutionRoute;
