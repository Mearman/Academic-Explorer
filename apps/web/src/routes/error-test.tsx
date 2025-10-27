import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const ErrorTestComponent = lazy(() =>
  import("./error-test.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/error-test")({
  component: () => (
    <LazyRoute>
      <ErrorTestComponent />
    </LazyRoute>
  ),
  // Only show in development
  beforeLoad: () => {
    const isDev = import.meta.env.DEV ?? false;
    if (!isDev) {
      throw new Error("Error test page is only available in development mode");
    }
  },
});
