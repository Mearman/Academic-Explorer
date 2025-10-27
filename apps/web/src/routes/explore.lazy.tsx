import { createLazyFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout/MainLayout";

function GraphExplorer() {
  return <MainLayout />;
}

export const Route = createLazyFileRoute("/explore")({
  component: GraphExplorer,
});

export default GraphExplorer;
