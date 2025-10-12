import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";
import { z } from "zod";

const TopicRoute = lazy(() => import("./$topicId.lazy"));

export const Route = createFileRoute("/topics/$topicId")({
  component: () => (
    <LazyRoute>
      <TopicRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
