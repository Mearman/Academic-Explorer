import { Group, Switch, Text } from '@mantine/core';
import { IconTextWrap } from '@tabler/icons-react';
import React from 'react';

interface FormatControlsProps {
  wordWrap: boolean;
  onWordWrapChange: (checked: boolean) => void;
  showSmartBreaking?: boolean;
  smartBreaking?: boolean;
  onSmartBreakingChange?: (checked: boolean) => void;
  backgroundColor?: string;
}

export function FormatControls({
  wordWrap,
  onWordWrapChange,
  showSmartBreaking = false,
  smartBreaking = false,
  onSmartBreakingChange,
  backgroundColor = "gray.0",
}: FormatControlsProps) {
  return (
    <Group gap="md" bg={backgroundColor} p="sm" style={{ borderRadius: '4px' }}>
      {showSmartBreaking && (
        <Text size="sm" fw={500}>Formatting Options:</Text>
      )}
      <Group gap="xs">
        <IconTextWrap size={16} />
        <Switch
          size="sm"
          label="Word Wrap"
          checked={wordWrap}
          onChange={(event) => onWordWrapChange(event.currentTarget.checked)}
        />
      </Group>
      {showSmartBreaking && onSmartBreakingChange && (
        <Group gap="xs">
          <Switch
            size="sm"
            label="Smart Line Breaking"
            checked={smartBreaking}
            onChange={(event) => onSmartBreakingChange(event.currentTarget.checked)}
            description="Break long strings at word boundaries"
          />
        </Group>
      )}
    </Group>
  );
}