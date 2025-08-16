import { createFileRoute, Outlet } from '@tanstack/react-router';

function PublishersLayout() {
  return <Outlet />;
}

export const Route = createFileRoute('/publishers')({
  component: PublishersLayout,
});