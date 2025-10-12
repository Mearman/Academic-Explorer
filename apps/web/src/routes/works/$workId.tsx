import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";
import { z } from "zod";

const WorkRoute = lazy(() => import("./$workId.lazy"));

export const Route = createFileRoute("/works/$workId")({
  component: () => (
    <LazyRoute>
      <WorkRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
