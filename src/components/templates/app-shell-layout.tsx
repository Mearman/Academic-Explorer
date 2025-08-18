import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import { useEntityGraphHydration } from '@/hooks/use-entity-graph-hydration';

import { AppShellHeader } from '../molecules/app-shell-header';
import { AppShellNavbar } from '../molecules/app-shell-navbar';

interface AppShellLayoutProps {
  children: React.ReactNode;
}

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const [opened, { toggle }] = useDisclosure();

  // Ensure entity graph store is hydrated from IndexedDB on app startup
  useEntityGraphHydration();

  const handleNavItemClick = () => {
    if (window.innerWidth < 768) {
      toggle();
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <AppShellHeader opened={opened} onToggle={toggle} />
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShellNavbar onItemClick={handleNavItemClick} />
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}