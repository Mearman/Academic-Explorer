import { AppShell, NavLink, Text, rem } from '@mantine/core';
import {
  IconSearch,
  IconUsers,
  IconBook,
  IconBuilding,
  IconCoin,
  IconTags,
  IconWorld,
} from '@tabler/icons-react';
import { Link, useLocation } from '@tanstack/react-router';

import { BuildInfo } from '../atoms/build-info';

const navigationItems = [
  { icon: IconSearch, label: 'Search', href: '/' },
  { icon: IconBook, label: 'Works', href: '/works' },
  { icon: IconUsers, label: 'Authors', href: '/authors' },
  { icon: IconBuilding, label: 'Institutions', href: '/institutions' },
  { icon: IconBook, label: 'Sources', href: '/sources' },
  { icon: IconCoin, label: 'Funders', href: '/funders' },
  { icon: IconTags, label: 'Topics', href: '/topics' },
  { icon: IconWorld, label: 'Publishers', href: '/publishers' },
];

interface AppShellNavbarProps {
  onItemClick: () => void;
}

export function AppShellNavbar({ onItemClick }: AppShellNavbarProps) {
  const location = useLocation();

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <AppShell.Section>
        <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="md">
          Navigation
        </Text>
        
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(item.href);
          
          return (
            <NavLink
              key={item.href}
              component={Link}
              to={item.href}
              label={item.label}
              leftSection={<Icon style={{ width: rem(16), height: rem(16) }} />}
              active={active}
              mb="xs"
              onClick={onItemClick}
            />
          );
        })}
      </AppShell.Section>

      <AppShell.Section grow mt="md">
        <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="md">
          Recent Searches
        </Text>
        {/* Future: Recent search history */}
        <Text size="sm" c="dimmed">
          No recent searches
        </Text>
      </AppShell.Section>

      <AppShell.Section>
        <BuildInfo className="mt-4 pt-4 border-t border-gray-200" />
      </AppShell.Section>
    </>
  );
}