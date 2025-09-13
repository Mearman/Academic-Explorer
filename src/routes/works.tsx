import { createFileRoute, Outlet } from '@tanstack/react-router';

function WorksLayout() {
  // Use Outlet to render child routes (/works/index.tsx or /works/$id.tsx)
  return <Outlet />;
}

export const Route = createFileRoute('/works')({
  component: WorksLayout,
});