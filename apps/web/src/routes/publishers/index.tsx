import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const PublishersRoute = lazy(() => import("./index.lazy"));

export const Route = createFileRoute("/publishers/")({
  component: () => (
    <LazyRoute>
      <PublishersRoute />
    </LazyRoute>
  ),
});
