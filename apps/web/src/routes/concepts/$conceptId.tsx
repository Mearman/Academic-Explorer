import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";
import { z } from "zod";

const ConceptRoute = lazy(() =>
  import("./$conceptId.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/concepts/$conceptId")({
  component: () => (
    <LazyRoute>
      <ConceptRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
