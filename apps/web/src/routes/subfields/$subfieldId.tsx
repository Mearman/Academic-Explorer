import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";
import { z } from "zod";

const SubfieldRoute = lazy(() =>
  import("./$subfieldId.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/subfields/$subfieldId" as any)({
  component: () => (
    <LazyRoute>
      <SubfieldRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
