import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { AUTHOR_FIELDS, cachedOpenAlex, type Author, type AuthorField } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { EntityDetailLayout, LoadingState, ErrorState, ENTITY_TYPE_CONFIGS } from "@/components/entity-detail";

const AUTHOR_ROUTE_PATH = "/authors/$authorId";

function AuthorRoute() {
  const { authorId: rawAuthorId } = useParams({ strict: false });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the author ID and fix any collapsed protocol slashes
  const authorId = decodeEntityId(rawAuthorId);
  usePrettyUrl("authors", rawAuthorId, authorId);

  // Parse select parameter - if not provided, use all AUTHOR_FIELDS (default behavior)
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as AuthorField[]
    : [...AUTHOR_FIELDS];

  // Fetch author data
  const { data: author, isLoading, error } = useQuery({
    queryKey: ["author", authorId, selectParam],
    queryFn: async () => {
      if (!authorId) {
        throw new Error("Author ID is required");
      }
      const response = await cachedOpenAlex.client.authors.getAuthor(authorId, {
        select: selectFields,
      });
      return response as Author;
    },
    enabled: !!authorId && authorId !== "random",
  });

  const config = ENTITY_TYPE_CONFIGS.author;

  if (isLoading) {
    return <LoadingState entityType="Author" entityId={authorId || ''} config={config} />;
  }

  if (error) {
    return <ErrorState entityType="Author" entityId={authorId || ''} error={error} />;
  }

  if (!author || !authorId) {
    return null;
  }

  return (
    <EntityDetailLayout
      config={config}
      entityType="author"
      entityId={authorId}
      displayName={author.display_name || "Author"}
      selectParam={(selectParam as string) || ''}
      selectFields={selectFields}
      viewMode={viewMode}
      onToggleView={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
      data={author as Record<string, unknown>}
    />
  );
}

export const Route = createLazyFileRoute(AUTHOR_ROUTE_PATH)({
  component: AuthorRoute,
});

export default AuthorRoute;
