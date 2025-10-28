import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { FUNDER_FIELDS, cachedOpenAlex, type Funder, type FunderField } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";

function FunderRoute() {
  const { funderId } = useParams({ strict: false });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Parse select parameter - if not provided, use all FUNDER_FIELDS (default behavior)
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as FunderField[]
    : [...FUNDER_FIELDS];

  // Fetch funder data
  const { data: funder, isLoading, error } = useQuery({
    queryKey: ["funder", funderId, selectParam],
    queryFn: async () => {
      if (!funderId) {
        throw new Error("Funder ID is required");
      }
      const response = await cachedOpenAlex.client.funders.getFunder(funderId, {
        select: selectFields,
      });
      return response as Funder;
    },
    enabled: !!funderId && funderId !== "random",
  });

  // Render content based on state
  let content;
  if (isLoading) {
    content = (
      <div className="p-4 text-center">
        <h2>Loading Funder...</h2>
        <p>Funder ID: {funderId}</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Funder</h2>
        <p>Funder ID: {funderId}</p>
        <p>Error: {String(error)}</p>
      </div>
    );
  } else {
    content = (
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">{funder?.display_name || "Funder"}</h1>
          <div className="text-sm text-gray-600 mb-4">
            <strong>Funder ID:</strong> {funderId}<br />
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
            {JSON.stringify(funder, null, 2)}
          </pre>
        ) : (
          <div className="space-y-4">
            {funder?.display_name && (
              <div>
                <strong>Name:</strong> {funder.display_name}
              </div>
            )}
            {funder?.grants_count !== undefined && (
              <div>
                <strong>Grants:</strong> {funder.grants_count}
              </div>
            )}
            {funder?.works_count !== undefined && (
              <div>
                <strong>Works:</strong> {funder.works_count}
              </div>
            )}
            {funder?.cited_by_count !== undefined && (
              <div>
                <strong>Citations:</strong> {funder.cited_by_count}
              </div>
            )}
            {funder?.country_code && (
              <div>
                <strong>Country:</strong> {funder.country_code}
              </div>
            )}
            {funder?.description && (
              <div>
                <strong>Description:</strong> {funder.description}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return content;
}

export const Route = createLazyFileRoute("/funders/$funderId")({
  component: FunderRoute,
});

export default FunderRoute;
