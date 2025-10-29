import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { cachedOpenAlex, type Concept } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";

function ConceptRoute() {
  const { conceptId: rawConceptId } = useParams({ strict: false });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the concept ID in case it's URL-encoded (for external IDs with special characters)
  const conceptId = decodeEntityId(rawConceptId);

  // Parse select parameter if provided
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim())
    : undefined;

  // Fetch concept data
  const { data: concept, isLoading, error } = useQuery({
    queryKey: ["concept", conceptId, selectParam],
    queryFn: async () => {
      if (!conceptId) {
        throw new Error("Concept ID is required");
      }
      const response = await cachedOpenAlex.client.concepts.getConcept(conceptId, {
        select: selectFields,
      });
      return response as Concept;
    },
    enabled: !!conceptId && conceptId !== "random",
  });

  // Render content based on state
  let content;
  if (isLoading) {
    content = (
      <div className="p-4 text-center">
        <h2>Loading Concept...</h2>
        <p>Concept ID: {conceptId}</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Concept</h2>
        <p>Concept ID: {conceptId}</p>
        <p>Error: {String(error)}</p>
      </div>
    );
  } else {
    content = (
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">{concept?.display_name || "Concept"}</h1>
          <div className="text-sm text-gray-600 mb-4">
            <strong>Concept ID:</strong> {conceptId}<br />
            <strong>Select fields:</strong> {selectParam && typeof selectParam === 'string' ? selectParam : 'default (all fields)'}
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
            {JSON.stringify(concept, null, 2)}
          </pre>
        ) : (
          <div className="space-y-4">
            {concept?.display_name && (
              <div>
                <strong>Name:</strong> {concept.display_name}
              </div>
            )}
            {concept?.description && (
              <div>
                <strong>Description:</strong> {concept.description}
              </div>
            )}
            {concept?.level !== undefined && (
              <div>
                <strong>Level:</strong> {concept.level}
              </div>
            )}
            {concept?.works_count !== undefined && (
              <div>
                <strong>Works:</strong> {concept.works_count.toLocaleString()}
              </div>
            )}
            {concept?.cited_by_count !== undefined && (
              <div>
                <strong>Citations:</strong> {concept.cited_by_count.toLocaleString()}
              </div>
            )}
            {concept?.wikidata && (
              <div>
                <strong>Wikidata:</strong>{" "}
                <a
                  href={concept.wikidata}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {concept.wikidata}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return content;
}

export const Route = createLazyFileRoute("/concepts/$conceptId")({
  component: ConceptRoute,
});

export default ConceptRoute;
