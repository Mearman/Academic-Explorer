import { createFileRoute, Outlet } from '@tanstack/react-router';

function TopicsLayout() {
  // Use Outlet to render child routes (/topics/index.tsx)
  return <Outlet />;
}

export const Route = createFileRoute('/topics')({
  component: TopicsLayout,
});