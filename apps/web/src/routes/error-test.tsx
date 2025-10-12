import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";

const ErrorTestComponent = lazy(() => import("./error-test.lazy"));

export const Route = createFileRoute("/error-test")({
	component: () => (
    <LazyRoute>
      <ErrorTestComponent />
    </LazyRoute>
  ),
	// Only show in development
	beforeLoad: () => {
		if (!import.meta.env.DEV) {
			throw new Error("Error test page is only available in development mode");
		}
	},
});
