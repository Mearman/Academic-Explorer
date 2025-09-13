import { createFileRoute, Outlet } from '@tanstack/react-router';

function PublishersLayout() {
  // Use Outlet to render child routes (/publishers/index.tsx)
  return <Outlet />;
}

export const Route = createFileRoute('/publishers')({
  component: PublishersLayout,
});