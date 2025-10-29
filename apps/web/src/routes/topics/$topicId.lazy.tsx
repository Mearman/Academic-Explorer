import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { TOPIC_FIELDS, cachedOpenAlex, type Topic, type TopicField } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";

function TopicRoute() {
  const { topicId: rawTopicId } = useParams({ strict: false });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the topic ID in case it's URL-encoded (for external IDs with special characters)
  const topicId = decodeEntityId(rawTopicId);

  // Parse select parameter - if not provided, use all TOPIC_FIELDS (default behavior)
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as TopicField[]
    : [...TOPIC_FIELDS];

  // Fetch topic data
  const { data: topic, isLoading, error } = useQuery({
    queryKey: ["topic", topicId, selectParam],
    queryFn: async () => {
      if (!topicId) {
        throw new Error("Topic ID is required");
      }
      const response = await cachedOpenAlex.client.topics.getTopic(topicId, {
        select: selectFields,
      });
      return response as Topic;
    },
    enabled: !!topicId && topicId !== "random",
  });

  // Render content based on state
  let content;
  if (isLoading) {
    content = (
      <div className="p-4 text-center">
        <h2>Loading Topic...</h2>
        <p>Topic ID: {topicId}</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Topic</h2>
        <p>Topic ID: {topicId}</p>
        <p>Error: {String(error)}</p>
      </div>
    );
  } else {
    content = (
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">{topic?.display_name || "Topic"}</h1>
          <div className="text-sm text-gray-600 mb-4">
            <strong>Topic ID:</strong> {topicId}<br />
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
            {JSON.stringify(topic, null, 2)}
          </pre>
        ) : (
          <div className="space-y-4">
            {topic?.display_name && (
              <div>
                <strong>Name:</strong> {topic.display_name}
              </div>
            )}
            {topic?.works_count !== undefined && (
              <div>
                <strong>Works:</strong> {topic.works_count}
              </div>
            )}
            {topic?.cited_by_count !== undefined && (
              <div>
                <strong>Citations:</strong> {topic.cited_by_count}
              </div>
            )}
            {topic?.description && (
              <div>
                <strong>Description:</strong> {topic.description}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return content;
}

export const Route = createLazyFileRoute("/topics/$topicId")({
  component: TopicRoute,
});

export default TopicRoute;
