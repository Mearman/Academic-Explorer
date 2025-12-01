import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const CataloguePage = lazy(() => import("./catalogue.lazy"));

// T064: Define search params schema for share URL detection and list selection
export interface CatalogueSearch {
  data?: string; // Compressed share data parameter
  list?: string; // Selected list ID for direct navigation
}

export const Route = createFileRoute("/catalogue")({
  validateSearch: (search: Record<string, unknown>): CatalogueSearch => {
    return {
      data: (search.data as string) || undefined,
      list: (search.list as string) || undefined,
    };
  },
  component: () => (
    <LazyRoute>
      <CataloguePage />
    </LazyRoute>
  ),
});