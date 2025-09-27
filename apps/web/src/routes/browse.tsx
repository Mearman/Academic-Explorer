import { createFileRoute } from '@tanstack/react-router'
import { EntityBrowser } from '@/components/cache'

export const Route = createFileRoute('/browse')({
  component: BrowsePage,
})

function BrowsePage() {
  return <EntityBrowser />
}