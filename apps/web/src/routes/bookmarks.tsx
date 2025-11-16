import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";
import type { EntityType } from "@academic-explorer/graph";

const BookmarksIndexPage = lazy(() => import("./bookmarks.lazy"));

export interface BookmarksSearch {
  search?: string;
  entityType?: EntityType;
  tags?: string[];
  matchAll?: boolean;
  sortBy?: "date" | "title" | "type";
  sortOrder?: "asc" | "desc";
  groupByType?: boolean;
}

export const Route = createFileRoute("/bookmarks")({
  component: () => (
    <LazyRoute>
      <BookmarksIndexPage />
    </LazyRoute>
  ),
  validateSearch: (search: Record<string, unknown>): BookmarksSearch => {
    return {
      search: typeof search.search === "string" ? search.search : undefined,
      entityType: typeof search.entityType === "string" ? search.entityType as EntityType : undefined,
      tags: Array.isArray(search.tags)
        ? search.tags.filter((t): t is string => typeof t === "string")
        : typeof search.tags === "string"
          ? search.tags.split(",").map(t => t.trim()).filter(Boolean)
          : undefined,
      matchAll: search.matchAll === "true" || search.matchAll === true,
      sortBy: search.sortBy === "date" || search.sortBy === "title" || search.sortBy === "type"
        ? search.sortBy
        : undefined,
      sortOrder: search.sortOrder === "asc" || search.sortOrder === "desc"
        ? search.sortOrder
        : undefined,
      groupByType: search.groupByType === "true" || search.groupByType === true,
    };
  },
});
