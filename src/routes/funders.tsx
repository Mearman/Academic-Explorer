import { createFileRoute, Outlet } from '@tanstack/react-router';

function FundersLayout() {
  return <Outlet />;
}

export const Route = createFileRoute('/funders')({
  component: FundersLayout,
});