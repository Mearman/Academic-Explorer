import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const AuthorsListRoute = lazy(() => import("./index.lazy"));

export const Route = createFileRoute("/authors/")({
  component: () => (
    <LazyRoute>
      <AuthorsListRoute />
    </LazyRoute>
  ),
});
