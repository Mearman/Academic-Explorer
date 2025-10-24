import { createLazyFileRoute } from "@tanstack/react-router";
export const Route = createLazyFileRoute("/browse")({
  component: BrowsePage,
});

import { EntityBrowser } from "@/components/cache";

function BrowsePage() {
  return <EntityBrowser />;
}

export default BrowsePage;
