import { createFileRoute, Outlet } from '@tanstack/react-router';

function FundersLayout() {
  // Use Outlet to render child routes (/funders/index.tsx)
  return <Outlet />;
}

export const Route = createFileRoute('/funders')({
  component: FundersLayout,
});