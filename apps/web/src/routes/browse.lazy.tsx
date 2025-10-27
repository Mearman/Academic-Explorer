import { createLazyFileRoute } from "@tanstack/react-router";

import { EntityBrowser } from "@/components/cache";

function BrowsePage() {
  return <EntityBrowser />;
}

export const Route = createLazyFileRoute("/browse")({
  component: BrowsePage,
});

export default BrowsePage;
