import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";
import { z } from "zod";

const FunderRoute = lazy(() => import("./$funderId.lazy"));

export const Route = createFileRoute("/funders/$funderId")({
  component: () => (
    <LazyRoute>
      <FunderRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
