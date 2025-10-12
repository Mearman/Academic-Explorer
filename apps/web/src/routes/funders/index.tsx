import { createFileRoute } from '@tanstack/react-router';
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const FundersRoute = lazy(() => import("./index.lazy"));

export const Route = createFileRoute('/funders/')({
  component: () => (
    <LazyRoute>
      <FundersRoute />
    </LazyRoute>
  ),
});
