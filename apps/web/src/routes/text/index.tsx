import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";
import { z } from "zod";

const textSearchSchema = z.object({
  title: z.string().optional().catch(undefined),
  abstract: z.string().optional().catch(undefined),
  text: z.string().optional().catch(undefined),
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
