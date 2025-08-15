import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { AppShellLayout } from '../components/templates/app-shell-layout';

export const Route = createRootRoute({
  component: () => (
    <AppShellLayout>
      <Outlet />
      <TanStackRouterDevtools />
    </AppShellLayout>
  ),
});