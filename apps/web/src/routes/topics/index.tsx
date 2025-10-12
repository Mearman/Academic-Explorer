import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const TopicsListRoute = lazy(() => import("./index.lazy"));

export const Route = createFileRoute("/topics/")({
  component: () => (
    <LazyRoute>
      <TopicsListRoute />
    </LazyRoute>
  ),
  validateSearch: (search: Record<string, unknown>) => ({
    filter: typeof search.filter === "string" ? search.filter : undefined,
  }),
});
