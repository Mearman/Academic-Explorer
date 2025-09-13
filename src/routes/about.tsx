import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: () => (
    <div className="p-2">
      <h3>About Academic Explorer</h3>
      <p>
        Academic Explorer is a PhD research project focused on academic literature
        exploration using the OpenAlex API.
      </p>
      <ul className="list-disc ml-6 mt-2">
        <li>React 19 with modern TypeScript</li>
        <li>TanStack Router with hash-based routing</li>
        <li>Vite for build tooling</li>
        <li>GitHub Pages compatible deployment</li>
      </ul>
    </div>
  ),
})