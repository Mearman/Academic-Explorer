import { createFileRoute, Outlet } from '@tanstack/react-router';

function SourcesLayout() {
  return <Outlet />;
}

export const Route = createFileRoute('/sources')({
  component: SourcesLayout,
});