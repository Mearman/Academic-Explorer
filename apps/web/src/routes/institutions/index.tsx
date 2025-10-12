import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const InstitutionsListRoute = lazy(() => import("./index.lazy"));

export const Route = createFileRoute("/institutions/")({
  component: () => (
    <LazyRoute>
      <InstitutionsListRoute />
    </LazyRoute>
  ),
});
