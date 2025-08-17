/**
 * Theme Toggle Component
 * 
 * Provides a setting to switch between light, dark, and system theme modes.
 */

import { Card, Text, Group, SegmentedControl, Box } from '@mantine/core';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';

import { useAppStore } from '@/stores/app-store';

export function ThemeToggle() {
  const { theme, setTheme } = useAppStore();

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light',
      icon: IconSun,
    },
    {
      value: 'dark' as const,
      label: 'Dark', 
      icon: IconMoon,
    },
    {
      value: 'system' as const,
      label: 'System',
      icon: IconDeviceDesktop,
    },
  ];

  return (
    <Card>
      <Group justify="space-between" mb="md">
        <Box>
          <Text fw={500} size="sm">
            Theme Preference
          </Text>
          <Text size="xs" c="dimmed">
            Choose your preferred theme or follow system settings
          </Text>
        </Box>
      </Group>

      <SegmentedControl
        value={theme}
        onChange={(value) => {
          if (value === 'light' || value === 'dark' || value === 'system') {
            setTheme(value);
          }
        }}
        data={themeOptions.map(option => ({
          value: option.value,
          label: (
            <Group gap="xs" justify="center">
              <option.icon size={16} />
              <Text size="sm">{option.label}</Text>
            </Group>
          ),
        }))}
        fullWidth
      />
    </Card>
  );
}