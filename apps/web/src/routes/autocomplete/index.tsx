import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { z } from "zod";

import { LazyRoute } from "@/components/routing/LazyRoute";

const autocompleteSearchSchema = z.object({
  filter: z.string().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
});

const AutocompleteGeneralRoute = lazy(() => import("./index.lazy"));

export const Route = createFileRoute("/autocomplete/")({
  component: () => (
    <LazyRoute>
      <AutocompleteGeneralRoute />
    </LazyRoute>
  ),
  validateSearch: autocompleteSearchSchema,
});
