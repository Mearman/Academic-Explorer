import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { INSTITUTION_FIELDS, cachedOpenAlex, type Institution } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";

function InstitutionRoute() {
  const { institutionId } = useParams({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Fetch institution data
  const { data: institution, isLoading, error } = useQuery({
    queryKey: ["institution", institutionId],
    queryFn: async () => {
      if (!institutionId) {
        throw new Error("Institution ID is required");
      }
      const response = await cachedOpenAlex.client.institutions.getInstitution(institutionId, {
        select: [...INSTITUTION_FIELDS],
      });
      return response as Institution;
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
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">{institution?.display_name || "Institution"}</h1>
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
          <div className="space-y-4">
            {institution?.display_name && (
              <div>
                <strong>Name:</strong> {institution.display_name}
              </div>
            )}
            {institution?.works_count !== undefined && (
              <div>
                <strong>Works:</strong> {institution.works_count}
              </div>
            )}
            {institution?.cited_by_count !== undefined && (
              <div>
                <strong>Citations:</strong> {institution.cited_by_count}
              </div>
            )}
            {institution?.type && (
              <div>
                <strong>Type:</strong> {institution.type}
              </div>
            )}
            {institution?.country_code && (
              <div>
                <strong>Country:</strong> {institution.country_code}
              </div>
            )}
            {institution?.ror && (
              <div>
                <strong>ROR:</strong> {institution.ror}
              </div>
            )}
          </div>
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
