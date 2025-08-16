import { createFileRoute, Outlet } from '@tanstack/react-router';

function ConceptsLayout() {
  return <Outlet />;
}

export const Route = createFileRoute('/concepts')({
  component: ConceptsLayout,
});