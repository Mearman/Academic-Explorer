import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { cachedOpenAlex } from "@academic-explorer/client";
import { PUBLISHER_FIELDS, type Publisher, type PublisherField } from "@academic-explorer/types/entities";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { EntityDataDisplay } from "@/components/EntityDataDisplay";

function PublisherRoute() {
  const { publisherId: rawPublisherId } = useParams({ strict: false });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the publisher ID in case it's URL-encoded (for external IDs with special characters)
  const publisherId = decodeEntityId(rawPublisherId);
  usePrettyUrl("publishers", rawPublisherId, publisherId);

  // Parse select parameter - only send select when explicitly provided in URL
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as PublisherField[]
    : undefined;

  // Fetch publisher data
  const { data: publisher, isLoading, error } = useQuery({
    queryKey: ["publisher", publisherId, selectParam],
    queryFn: async () => {
      if (!publisherId) {
        throw new Error("Publisher ID is required");
      }
      const response = await cachedOpenAlex.client.publishers.get(
        publisherId,
        selectFields ? { select: selectFields } : {}
      );
      return response as Publisher;
    },
    enabled: !!publisherId && publisherId !== "random",
  });

  // Render content based on state
  let content;
  if (isLoading) {
    content = (
      <div className="p-4 text-center">
        <h2>Loading Publisher...</h2>
        <p>Publisher ID: {publisherId}</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Publisher</h2>
        <p>Publisher ID: {publisherId}</p>
        <p>Error: {String(error)}</p>
      </div>
    );
  } else {
    content = (
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">{publisher?.display_name || "Publisher"}</h1>
          <div className="text-sm text-gray-600 mb-4">
            <strong>Publisher ID:</strong> {publisherId}<br />
            <strong>Select fields:</strong> {selectParam && typeof selectParam === 'string' ? selectParam : `default (${selectFields?.join(", ") || "all"})`}
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
            {JSON.stringify(publisher, null, 2)}
          </pre>
        ) : (
          <EntityDataDisplay data={publisher as Record<string, unknown>} />
        )}
      </div>
    );
  }

  return content;
}

export const Route = createLazyFileRoute("/publishers/$publisherId")({
  component: PublisherRoute,
});

export default PublisherRoute;
