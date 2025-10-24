import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const SourcesRoute = lazy(() => import("./index.lazy"));

export const Route = createFileRoute("/sources/")({
  component: () => (
    <LazyRoute>
      <SourcesRoute />
    </LazyRoute>
  ),
});
