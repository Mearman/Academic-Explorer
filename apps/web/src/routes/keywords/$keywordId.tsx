import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";
import { z } from "zod";

const KeywordRoute = lazy(() =>
  import("./$keywordId.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/keywords/$keywordId")({
  component: () => (
    <LazyRoute>
      <KeywordRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
