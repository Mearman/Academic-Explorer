import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const BookmarksPage = lazy(() => import("./bookmarks.lazy"));

export const Route = createFileRoute("/bookmarks")({
  component: () => (
    <LazyRoute>
      <BookmarksPage />
    </LazyRoute>
  ),
});
