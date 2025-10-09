import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/funders/$funderId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/funders/$funderId"!</div>
}
