import { createFileRoute, Outlet } from '@tanstack/react-router';

function InstitutionsLayout() {
  // Use Outlet to render child routes (/institutions/index.tsx or /institutions/$id.tsx)
  return <Outlet />;
}

export const Route = createFileRoute('/institutions')({
  component: InstitutionsLayout,
});