import { createFileRoute, useParams } from "@tanstack/react-router";
import { lazy } from "react";
import { LazyRoute } from "@/components/routing/LazyRoute";
import { z } from "zod";

const AuthorRoute = lazy(() =>
  import("./$authorId.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/authors/$authorId")({
  component: () => (
    <LazyRoute>
      <AuthorRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
  // Add error component to catch and display errors gracefully
  errorComponent: ({ error }) => (
    <div className="p-4 text-center">
      <h2 className="text-xl font-bold mb-4">Temporary Author Route Issue</h2>
      <p className="text-gray-600 mb-4">
        We're aware of a React Hook error affecting this route. This is a known issue being investigated.
      </p>
      <p className="text-sm text-gray-500 mb-4">Error: {error.message}</p>
      <div className="space-x-4">
        <a
          href="#/"
          className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go Home
        </a>
        <button
          onClick={() => window.location.reload()}
          className="inline-block px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reload Page
        </button>
      </div>
    </div>
  ),
});
