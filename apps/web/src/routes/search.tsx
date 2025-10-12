import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const SearchPage = lazy(() => import("./search.lazy"));

export const Route = createFileRoute("/search")({
  component: () => (
    <LazyRoute>
      <SearchPage />
    </LazyRoute>
  ),
  validateSearch: (search: Record<string, unknown>) => {
    // Handle the case where q parameter might be a full OpenAlex URL
    // e.g., ?q=https://api.openalex.org/autocomplete/works?filter=...&search=...
    return {
      q: (search.q as string) || "",
      filter: (search.filter as string) || undefined,
      search: (search.search as string) || undefined,
    };
  },
});
