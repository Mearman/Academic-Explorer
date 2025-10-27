import { createLazyFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout/MainLayout";

/**
 * Integrated graph exploration route
 * Uses the MainLayout with full sidebar integration
 */
function GraphExplorer() {
  return <MainLayout />;
}

export const Route = createLazyFileRoute("/explore/graph")({
  component: GraphExplorer,
});

export default GraphExplorer;
