import { createLazyFileRoute } from "@tanstack/react-router";
/**
 * Integrated graph exploration route
 * Uses the MainLayout with full sidebar integration
 */

export const Route = createLazyFileRoute("/explore/graph")({
  component: GraphExplorer,
});

import { MainLayout } from "@/components/layout/MainLayout";

function GraphExplorer() {
  return <MainLayout />;
}

export default GraphExplorer;
