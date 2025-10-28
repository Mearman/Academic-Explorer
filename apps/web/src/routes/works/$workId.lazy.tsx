import { createLazyFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { WORK_FIELDS, cachedOpenAlex, type Work } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";

function WorkRoute() {
  const { workId } = useParams({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Fetch work data
  const { data: work, isLoading, error } = useQuery({
    queryKey: ["work", workId],
    queryFn: async () => {
      if (!workId) {
        throw new Error("Work ID is required");
      }
      const response = await cachedOpenAlex.client.works.getWork(workId, {
        select: [...WORK_FIELDS],
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
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">{work?.display_name || work?.title || "Work"}</h1>
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
