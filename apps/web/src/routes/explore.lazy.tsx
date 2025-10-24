import { createLazyFileRoute } from "@tanstack/react-router";
export const Route = createLazyFileRoute("/explore")({
  component: GraphExplorer,
});

import { MainLayout } from "@/components/layout/MainLayout";

function GraphExplorer() {
  return <MainLayout />;
}

export default GraphExplorer;
