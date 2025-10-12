import { createLazyFileRoute } from "@tanstack/react-router";
export const Route = createLazyFileRoute("/cache")({
  component: CacheBrowserPage,
});

import { CacheBrowser } from '@/components/cache'

function CacheBrowserPage() {
  return <CacheBrowser />
}

export default CacheBrowserPage;
