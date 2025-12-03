import { createLazyFileRoute } from "@tanstack/react-router";

import { CacheBrowser } from "@/components/cache";

const CacheBrowserPage = () => <CacheBrowser />;

export const Route = createLazyFileRoute("/cache")({
  component: CacheBrowserPage,
});

export default CacheBrowserPage;
