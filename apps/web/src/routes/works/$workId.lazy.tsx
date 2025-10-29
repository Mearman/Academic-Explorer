import { createLazyFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { WORK_FIELDS, cachedOpenAlex, type Work, type WorkField } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";

function WorkRoute() {
  const { workId: rawWorkId } = useParams({ strict: false });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the work ID and fix any collapsed protocol slashes
  const workId = decodeEntityId(rawWorkId);

  // Parse select parameter - if not provided, use all WORK_FIELDS (default behavior)
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as WorkField[]
    : [...WORK_FIELDS];

  // Fetch work data
  const { data: work, isLoading, error } = useQuery({
    queryKey: ["work", workId, selectParam],
    queryFn: async () => {
      if (!workId) {
        throw new Error("Work ID is required");
      }
      const response = await cachedOpenAlex.client.works.getWork(workId, {
        select: selectFields,
      });
      return response as Work;
    },
    enabled: !!workId && workId !== "random",
  });

  // Render content based on state
  let content;
  if (isLoading) {
    content = (
      <div className="p-4 text-center">
        <h2>Loading Work...</h2>
        <p>Work ID: {workId}</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Work</h2>
        <p>Work ID: {workId}</p>
        <p>Error: {String(error)}</p>
      </div>
    );
  } else {
    content = (
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">{work?.display_name || work?.title || "Work"}</h1>
          <div className="text-sm text-gray-600 mb-4">
            <strong>Work ID:</strong> {workId}<br />
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
            {JSON.stringify(work, null, 2)}
          </pre>
        ) : (
          <div className="space-y-4">
            {work?.display_name && (
              <div>
                <strong>Title:</strong> {work.display_name}
              </div>
            )}
            {work?.publication_year && (
              <div>
                <strong>Year:</strong> {work.publication_year}
              </div>
            )}
            {work?.cited_by_count && (
              <div>
                <strong>Citations:</strong> {work.cited_by_count}
              </div>
            )}
            {work?.type && (
              <div>
                <strong>Type:</strong> {work.type}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return content;
}

export const Route = createLazyFileRoute("/works/$workId")({
  component: WorkRoute,
});
