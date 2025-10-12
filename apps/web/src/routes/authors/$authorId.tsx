import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";
import { z } from "zod";

const AuthorRoute = lazy(() => import("./$authorId.lazy"));

export const Route = createFileRoute("/authors/$authorId")({
  component: () => (
    <LazyRoute>
      <AuthorRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
