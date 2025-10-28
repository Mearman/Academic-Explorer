import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { AUTHOR_FIELDS, cachedOpenAlex, type Author } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";

function AuthorRoute() {
  const { authorId } = useParams({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Fetch author data
  const { data: author, isLoading, error } = useQuery({
    queryKey: ["author", authorId],
    queryFn: async () => {
      if (!authorId) {
        throw new Error("Author ID is required");
      }
      const response = await cachedOpenAlex.client.authors.getAuthor(authorId, {
        select: [...AUTHOR_FIELDS],
      });
      return response as Author;
    },
    enabled: !!authorId && authorId !== "random",
  });

  // Render content based on state
  let content;
  if (isLoading) {
    content = (
      <div className="p-4 text-center">
        <h2>Loading Author...</h2>
        <p>Author ID: {authorId}</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Author</h2>
        <p>Author ID: {authorId}</p>
        <p>Error: {String(error)}</p>
      </div>
    );
  } else {
    content = (
      <div className="p-4">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">{author?.display_name || "Author"}</h1>
          <button
            onClick={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Toggle {viewMode === "raw" ? "Rich" : "Raw"} View
          </button>
        </div>

        {viewMode === "raw" ? (
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[600px]">
            {JSON.stringify(author, null, 2)}
          </pre>
        ) : (
          <div className="space-y-4">
            {author?.display_name && (
              <div>
                <strong>Name:</strong> {author.display_name}
              </div>
            )}
            {author?.works_count && (
              <div>
                <strong>Works:</strong> {author.works_count}
              </div>
            )}
            {author?.cited_by_count && (
              <div>
                <strong>Citations:</strong> {author.cited_by_count}
              </div>
            )}
            {author?.summary_stats && (
              <div>
                <strong>H-index:</strong> {author.summary_stats.h_index}
                <br />
                <strong>i10-index:</strong> {author.summary_stats.i10_index}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return content;
}

export const Route = createFileRoute("/authors/$authorId")({
  component: AuthorRoute,
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
