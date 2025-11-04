import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const AutocompletePage = lazy(() => import("./autocomplete.lazy"));

export const Route = createFileRoute("/autocomplete")({
  component: () => (
    <LazyRoute>
      <AutocompletePage />
    </LazyRoute>
  ),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      q: (search.q as string) || "",
      filter: (search.filter as string) || undefined,
      search: (search.search as string) || undefined,
    };
  },
});
