import { createFileRoute, Outlet } from '@tanstack/react-router';

function ConceptsLayout() {
  // Use Outlet to render child routes (/concepts/index.tsx)
  return <Outlet />;
}

export const Route = createFileRoute('/concepts')({
  component: ConceptsLayout,
});