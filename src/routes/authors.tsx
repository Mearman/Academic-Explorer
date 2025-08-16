import { createFileRoute, Outlet } from '@tanstack/react-router';

function AuthorsLayout() {
  return <Outlet />;
}

export const Route = createFileRoute('/authors')({
  component: AuthorsLayout,
});