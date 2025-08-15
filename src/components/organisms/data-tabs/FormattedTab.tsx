import { Stack, Group, Text, Tabs } from '@mantine/core';
import React from 'react';

import { ActionButtons } from '@/components/molecules/action-buttons/ActionButtons';
import { CodeDisplay } from '@/components/molecules/code-display/CodeDisplay';
import { FormatControls } from '@/components/molecules/format-controls/FormatControls';

interface FormattedTabProps {
  formattedJson: string;
  copied: boolean;
  showDownload: boolean;
  wordWrap: boolean;
  prettyPrint: boolean;
  maxHeight: number;
  onCopy: () => void;
  onDownload: () => void;
  onWordWrapChange: (checked: boolean) => void;
  onPrettyPrintChange: (checked: boolean) => void;
}

export function FormattedTab({
  formattedJson,
  copied,
  showDownload,
  wordWrap,
  prettyPrint,
  maxHeight,
  onCopy,
  onDownload,
  onWordWrapChange,
  onPrettyPrintChange,
}: FormattedTabProps) {
  return (
    <Tabs.Panel value="formatted" pt="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Pretty-printed JSON with indentation
          </Text>
          <ActionButtons
            copied={copied}
            showDownload={showDownload}
            onCopy={onCopy}
            onDownload={onDownload}
            copyTitle="Copy formatted JSON"
            downloadTitle="Download formatted JSON"
          />
        </Group>

        <FormatControls
          wordWrap={wordWrap}
          onWordWrapChange={onWordWrapChange}
          showSmartBreaking
          smartBreaking={prettyPrint}
          onSmartBreakingChange={onPrettyPrintChange}
        />
        
        <CodeDisplay
          content={formattedJson}
          maxHeight={maxHeight}
          wordWrap={wordWrap}
        />
      </Stack>
    </Tabs.Panel>
  );
}