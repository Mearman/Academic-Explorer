import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const BookmarksIndexPage = lazy(() => import("./bookmarks.lazy"));

// TODO: Define search params schema if bookmarks route needs query parameters
// Example: export interface BookmarksSearch { ... }

export const Route = createFileRoute("/bookmarks")({
  component: () => (
    <LazyRoute>
      <BookmarksIndexPage />
    </LazyRoute>
  ),
  // TODO: Add validateSearch if query parameters are needed
  // validateSearch: (search: Record<string, unknown>): BookmarksSearch => { ... },
});
