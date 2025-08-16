import { createFileRoute, Outlet } from '@tanstack/react-router';

function WorksLayout() {
  return <Outlet />;
}

export const Route = createFileRoute('/works')({
  component: WorksLayout,
});