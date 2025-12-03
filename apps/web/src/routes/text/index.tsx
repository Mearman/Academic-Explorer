import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { z } from "zod";

import { LazyRoute } from "@/components/routing/LazyRoute";

const textSearchSchema = z.object({
  title: z.string().optional().catch(),
  abstract: z.string().optional().catch(),
  text: z.string().optional().catch(),
});

const TextAnalysisRoute = lazy(() => import("./index.lazy"));

export const Route = createFileRoute("/text/")({
  component: () => (
    <LazyRoute>
      <TextAnalysisRoute />
    </LazyRoute>
  ),
  validateSearch: textSearchSchema,
});
