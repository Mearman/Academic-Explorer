import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const WorksListRoute = lazy(() => import("./index.lazy"));

export const Route = createFileRoute("/works/")({
  component: () => (
    <LazyRoute>
      <WorksListRoute />
    </LazyRoute>
  ),
});
