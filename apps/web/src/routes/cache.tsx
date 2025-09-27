import { createFileRoute } from '@tanstack/react-router'
import { CacheBrowser } from '@/components/cache'

export const Route = createFileRoute('/cache')({
  component: CacheBrowserPage,
})

function CacheBrowserPage() {
  return <CacheBrowser />
}