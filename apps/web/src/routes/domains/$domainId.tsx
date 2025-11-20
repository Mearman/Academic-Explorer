import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";
import { z } from "zod";

const DomainRoute = lazy(() =>
  import("./$domainId.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/domains/$domainId")({
  component: () => (
    <LazyRoute>
      <DomainRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
