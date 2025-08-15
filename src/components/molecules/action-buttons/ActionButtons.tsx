import { Group, ActionIcon } from '@mantine/core';
import { IconCopy, IconCheck, IconDownload } from '@tabler/icons-react';
import React from 'react';

interface ActionButtonsProps {
  copied: boolean;
  showDownload: boolean;
  onCopy: () => void;
  onDownload: () => void;
  copyTitle?: string;
  downloadTitle?: string;
}

export function ActionButtons({
  copied,
  showDownload,
  onCopy,
  onDownload,
  copyTitle = "Copy",
  downloadTitle = "Download",
}: ActionButtonsProps) {
  return (
    <Group gap="xs">
      <ActionIcon
        variant="light"
        size="sm"
        onClick={onCopy}
        title={copyTitle}
      >
        {copied ? <IconCheck size={14} color="green" /> : <IconCopy size={14} />}
      </ActionIcon>
      {showDownload && (
        <ActionIcon
          variant="light"
          size="sm"
          onClick={onDownload}
          title={downloadTitle}
        >
          <IconDownload size={14} />
        </ActionIcon>
      )}
    </Group>
  );
}