import { createFileRoute, Outlet } from '@tanstack/react-router';

function AuthorsLayout() {
  // Use Outlet to render child routes (/authors/index.tsx or /authors/$id.tsx)
  return <Outlet />;
}

export const Route = createFileRoute('/authors')({
  component: AuthorsLayout,
});