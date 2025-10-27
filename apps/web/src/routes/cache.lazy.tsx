import { createLazyFileRoute } from "@tanstack/react-router";
import { CacheBrowser } from "@/components/cache";

function CacheBrowserPage() {
  return <CacheBrowser />;
}

export const Route = createLazyFileRoute("/cache")({
  component: CacheBrowserPage,
});

export default CacheBrowserPage;
