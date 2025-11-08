import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const CataloguePage = lazy(() => import("./catalogue.lazy"));

export const Route = createFileRoute("/catalogue")({
  component: () => (
    <LazyRoute>
      <CataloguePage />
    </LazyRoute>
  ),
});