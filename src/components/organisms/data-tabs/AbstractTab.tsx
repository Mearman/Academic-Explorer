import { Stack, Group, Text, Tabs, Paper, ScrollArea } from '@mantine/core';
import { IconCode } from '@tabler/icons-react';
import React from 'react';

import { AbstractStats } from '@/components/molecules/abstract-stats/AbstractStats';
import { ActionButtons } from '@/components/molecules/action-buttons/ActionButtons';

interface AbstractTabProps {
  reconstructedAbstract: string | null;
  uniqueTerms: number;
  copied: boolean;
  showDownload: boolean;
  maxHeight: number;
  onCopy: () => void;
  onDownload: () => void;
}

export function AbstractTab({
  reconstructedAbstract,
  uniqueTerms,
  copied,
  showDownload,
  maxHeight,
  onCopy,
  onDownload,
}: AbstractTabProps) {
  return (
    <Tabs.Panel value="abstract" pt="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Abstract reconstructed from inverted index
          </Text>
          <ActionButtons
            copied={copied}
            showDownload={showDownload}
            onCopy={onCopy}
            onDownload={onDownload}
            copyTitle="Copy reconstructed abstract"
            downloadTitle="Download abstract as text file"
          />
        </Group>

        <AbstractStats
          abstract={reconstructedAbstract}
          uniqueTerms={uniqueTerms}
        />
        
        <Paper withBorder>
          <ScrollArea h={Math.min(maxHeight, 400)} scrollbarSize={6}>
            <Text
              p="md"
              style={{ 
                fontSize: '14px',
                lineHeight: '1.6',
                fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                whiteSpace: 'pre-wrap',
                textAlign: 'justify',
              }}
            >
              {reconstructedAbstract || 'Unable to reconstruct abstract from inverted index.'}
            </Text>
          </ScrollArea>
        </Paper>

        {/* Show inverted index details */}
        <Paper withBorder p="sm">
          <Group gap="xs" mb="xs">
            <IconCode size={16} />
            <Text size="sm" fw={500}>Inverted Index Structure</Text>
          </Group>
          <Text size="xs" c="dimmed">
            The abstract is stored as an inverted index where each word maps to its position(s) in the original text. 
            This format is used by OpenAlex to save space and enable efficient text searching.
          </Text>
        </Paper>
      </Stack>
    </Tabs.Panel>
  );
}