import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <div className="p-2">
      <h3>Welcome to Academic Explorer!</h3>
      <p>This is a React 19 app with TanStack Router using hash-based routing for GitHub Pages compatibility.</p>
      <p>Navigate using the links above to test the routing.</p>
    </div>
  ),
})