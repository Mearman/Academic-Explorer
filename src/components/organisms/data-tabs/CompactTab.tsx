import { Stack, Group, Text, Tabs } from '@mantine/core';
import React from 'react';

import { ActionButtons } from '@/components/molecules/action-buttons/ActionButtons';
import { CodeDisplay } from '@/components/molecules/code-display/CodeDisplay';
import { FormatControls } from '@/components/molecules/format-controls/FormatControls';

interface CompactTabProps {
  compactJson: string;
  copied: boolean;
  showDownload: boolean;
  wordWrap: boolean;
  maxHeight: number;
  onCopy: () => void;
  onDownload: () => void;
  onWordWrapChange: (checked: boolean) => void;
}

export function CompactTab({
  compactJson,
  copied,
  showDownload,
  wordWrap,
  maxHeight,
  onCopy,
  onDownload,
  onWordWrapChange,
}: CompactTabProps) {
  return (
    <Tabs.Panel value="compact" pt="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Compact JSON without formatting (smaller file size)
          </Text>
          <ActionButtons
            copied={copied}
            showDownload={showDownload}
            onCopy={onCopy}
            onDownload={onDownload}
            copyTitle="Copy compact JSON"
            downloadTitle="Download compact JSON"
          />
        </Group>

        <FormatControls
          wordWrap={wordWrap}
          onWordWrapChange={onWordWrapChange}
          showSmartBreaking
        />
        
        <CodeDisplay
          content={compactJson}
          maxHeight={maxHeight}
          wordWrap={wordWrap}
        />
      </Stack>
    </Tabs.Panel>
  );
}