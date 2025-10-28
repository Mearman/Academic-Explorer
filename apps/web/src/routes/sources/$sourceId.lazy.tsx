import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { SOURCE_FIELDS, cachedOpenAlex, type Source } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";

function SourceRoute() {
  const { sourceId } = useParams({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Fetch source data
  const { data: source, isLoading, error } = useQuery({
    queryKey: ["source", sourceId],
    queryFn: async () => {
      if (!sourceId) {
        throw new Error("Source ID is required");
      }
      const response = await cachedOpenAlex.client.sources.getSource(sourceId, {
        select: [...SOURCE_FIELDS],
      });
      return response as Source;
    },
    enabled: !!sourceId && sourceId !== "random",
  });

  // Render content based on state
  let content;
  if (isLoading) {
    content = (
      <div className="p-4 text-center">
        <h2>Loading Source...</h2>
        <p>Source ID: {sourceId}</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Source</h2>
        <p>Source ID: {sourceId}</p>
        <p>Error: {String(error)}</p>
      </div>
    );
  } else {
    content = (
      <div className="p-4">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">{source?.display_name || "Source"}</h1>
          <button
            onClick={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Toggle {viewMode === "raw" ? "Rich" : "Raw"} View
          </button>
        </div>

        {viewMode === "raw" ? (
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[600px]">
            {JSON.stringify(source, null, 2)}
          </pre>
        ) : (
          <div className="space-y-4">
            {source?.display_name && (
              <div>
                <strong>Name:</strong> {source.display_name}
              </div>
            )}
            {source?.works_count !== undefined && (
              <div>
                <strong>Works:</strong> {source.works_count}
              </div>
            )}
            {source?.cited_by_count !== undefined && (
              <div>
                <strong>Citations:</strong> {source.cited_by_count}
              </div>
            )}
            {source?.type && (
              <div>
                <strong>Type:</strong> {source.type}
              </div>
            )}
            {source?.issn_l && (
              <div>
                <strong>ISSN-L:</strong> {source.issn_l}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return content;
}

export const Route = createLazyFileRoute("/sources/$sourceId")({
  component: SourceRoute,
});

export default SourceRoute;
