import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const ApiOpenAlexRoute = lazy(() => import("./$.lazy"));

export const Route = createFileRoute("/api-openalex-org/$")({
  component: () => (
    <LazyRoute>
      <ApiOpenAlexRoute />
    </LazyRoute>
  ),
});
