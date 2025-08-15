import { Group, Burger, Title } from '@mantine/core';
import { Link } from '@tanstack/react-router';

import { TopbarSearch } from './topbar-search';

interface AppShellHeaderProps {
  opened: boolean;
  onToggle: () => void;
}

export function AppShellHeader({ opened, onToggle }: AppShellHeaderProps) {
  return (
    <Group h="100%" px="md" justify="space-between">
      <Group>
        <Burger opened={opened} onClick={onToggle} hiddenFrom="sm" size="sm" />
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Title order={3} c="blue">
            Academic Explorer
          </Title>
        </Link>
      </Group>
      
      <Group visibleFrom="md" style={{ flex: 1, justifyContent: 'center' }}>
        <TopbarSearch width={400} />
      </Group>
      
      <Group>
        {/* Future: User menu, settings, etc. */}
      </Group>
    </Group>
  );
}