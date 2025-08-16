import { createFileRoute, Outlet } from '@tanstack/react-router';

function InstitutionsLayout() {
  return <Outlet />;
}

export const Route = createFileRoute('/institutions')({
  component: InstitutionsLayout,
});