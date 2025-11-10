import { createLazyFileRoute } from "@tanstack/react-router";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { cachedOpenAlex } from "@academic-explorer/client";
import { AUTHOR_FIELDS, type Author, type AuthorField } from "@academic-explorer/types/entities";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { usePrettyUrl } from "@/hooks/use-pretty-url";
import { EntityDetailLayout, LoadingState, ErrorState, ENTITY_TYPE_CONFIGS } from "@/components/entity-detail";
import { useUrlNormalization } from "@/hooks/use-url-normalization";

const AUTHOR_ROUTE_PATH = "/authors/$_";

function AuthorRoute() {
  const { _splat: rawAuthorId } = useParams({ from: "/authors/$_" });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Fix browser address bar display issues with collapsed protocol slashes
  useUrlNormalization();

  // Extract author ID from URL hash as fallback since splat parameter isn't working
  // For hash routing with URLs containing slashes (like ORCID, ROR), we need to reconstruct the full ID
  const getAuthorIdFromHash = () => {
    if (typeof window !== 'undefined') {
      const hashParts = window.location.hash.split('/');
      return hashParts.length >= 3 ? hashParts.slice(2).join('/') : '';
    }
    return '';
  };

  const authorId = rawAuthorId || getAuthorIdFromHash();
  const decodedAuthorId = decodeEntityId(authorId);
  // Use the extracted authorId since rawAuthorId from TanStack Router doesn't work with hash routing
  usePrettyUrl("authors", authorId, decodedAuthorId);

  // Parse select parameter - if not provided, use all AUTHOR_FIELDS (default behavior)
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as AuthorField[]
    : [...AUTHOR_FIELDS];

  // Fetch author data
  const { data: author, isLoading, error } = useQuery({
    queryKey: ["author", decodedAuthorId, selectParam],
    queryFn: async () => {
      if (!decodedAuthorId) {
        throw new Error("Author ID is required");
      }
      const response = await cachedOpenAlex.client.authors.getAuthor(decodedAuthorId, {
        select: selectFields,
      });
      return response as Author;
    },
    enabled: !!decodedAuthorId && decodedAuthorId !== "random",
  });

  const config = ENTITY_TYPE_CONFIGS.author;

  if (isLoading) {
    return <LoadingState entityType="Author" entityId={decodedAuthorId || ''} config={config} />;
  }

  if (error) {
    return <ErrorState entityType="Author" entityId={decodedAuthorId || ''} error={error} />;
  }

  if (!author || !decodedAuthorId) {
    return null;
  }

  return (
    <EntityDetailLayout
      config={config}
      entityType="author"
      entityId={decodedAuthorId}
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
