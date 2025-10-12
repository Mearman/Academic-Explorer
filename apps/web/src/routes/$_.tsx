import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const ExternalIdRoute = lazy(() => import("./$_.lazy"));

export const Route = createFileRoute("/$_")({
  component: () => (
    <LazyRoute>
      <ExternalIdRoute />
    </LazyRoute>
  ),
});
