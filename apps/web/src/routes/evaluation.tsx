import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const EvaluationDashboard = lazy(() => import("./evaluation.lazy"));

export const Route = createFileRoute("/evaluation")({
  component: () => (
    <LazyRoute>
      <EvaluationDashboard />
    </LazyRoute>
  ),
});
