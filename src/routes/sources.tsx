import { createFileRoute, Outlet } from '@tanstack/react-router';

function SourcesLayout() {
  // Use Outlet to render child routes (/sources/index.tsx or /sources/$id.tsx)
  return <Outlet />;
}

export const Route = createFileRoute('/sources')({
  component: SourcesLayout,
});