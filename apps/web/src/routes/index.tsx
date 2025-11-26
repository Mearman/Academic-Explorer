import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const IndexRoute = lazy(() =>
  import("./index.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/")({
  component: () => (
    <LazyRoute>
      <IndexRoute />
    </LazyRoute>
  ),
});
