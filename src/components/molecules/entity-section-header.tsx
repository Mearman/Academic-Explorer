import { Group, Title } from '@mantine/core';

import { Icon } from '../atoms/icon';

interface EntitySectionHeaderProps {
  title: string;
  icon?: string;
  actions?: React.ReactNode;
}

export function EntitySectionHeader({ title, icon, actions }: EntitySectionHeaderProps) {
  return (
    <Group justify="space-between" align="center" mb="md">
      <Title order={2} size="h3">
        <Group gap="sm" align="center">
          {icon && <Icon name={icon} size="md" aria-hidden="true" />}
          {title}
        </Group>
      </Title>
      {actions && (
        <Group gap="sm">
          {actions}
        </Group>
      )}
    </Group>
  );
}