import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";
import { z } from "zod";

const SourceRoute = lazy(() => import("./$sourceId.lazy"));

export const Route = createFileRoute("/sources/$sourceId")({
  component: () => (
    <LazyRoute>
      <SourceRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
