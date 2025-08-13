'use client';

import { useState } from 'react';
import { 
  Card, 
  Group, 
  Stack, 
  Text, 
  Title, 
  Code, 
  ScrollArea,
  Tabs,
  Paper,
  Badge,
  ActionIcon,
  Notification
} from '@mantine/core';
import { IconCode, IconCopy, IconCheck, IconDownload, IconEye } from '@tabler/icons-react';

interface RawDataViewProps {
  /** The raw data object to display */
  data: unknown;
  /** Optional title for the component */
  title?: string;
  /** Maximum height for the scrollable area */
  maxHeight?: number;
  /** Whether to show download button */
  showDownload?: boolean;
  /** Entity type for context */
  entityType?: string;
  /** Entity ID for context */
  entityId?: string;
}

/**
 * Component to display raw API data with copy and download functionality
 */
export function RawDataView({ 
  data, 
  title = "Raw API Data",
  maxHeight = 600,
  showDownload = true,
  entityType,
  entityId
}: RawDataViewProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('formatted');
  
  // Format JSON with proper indentation
  const formattedJson = JSON.stringify(data, null, 2);
  const compactJson = JSON.stringify(data);
  
  // Get data size and basic stats
  const dataSize = new Blob([formattedJson]).size;
  const dataSizeKB = (dataSize / 1024).toFixed(1);
  const objectKeys = data && typeof data === 'object' ? Object.keys(data as object).length : 0;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownload = (text: string, format: 'json' | 'compact' = 'json') => {
    const filename = `${entityType || 'entity'}-${entityId || 'data'}-${format}.json`;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card withBorder radius="md" p="xl">
      <Group mb="lg" justify="space-between">
        <Group>
          <IconCode size={20} />
          <Title order={2} size="lg">{title}</Title>
        </Group>
        
        {/* Data Stats */}
        <Group gap="xs">
          <Badge variant="light" size="sm">
            {dataSizeKB} KB
          </Badge>
          {objectKeys > 0 && (
            <Badge variant="light" size="sm" color="blue">
              {objectKeys} fields
            </Badge>
          )}
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
        <Tabs.List grow>
          <Tabs.Tab value="formatted" leftSection={<IconEye size={14} />}>
            Formatted
          </Tabs.Tab>
          <Tabs.Tab value="compact" leftSection={<IconCode size={14} />}>
            Compact
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="formatted" pt="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Pretty-printed JSON with indentation
              </Text>
              <Group gap="xs">
                <ActionIcon
                  variant="light"
                  size="sm"
                  onClick={() => handleCopy(formattedJson)}
                  title="Copy formatted JSON"
                >
                  {copied ? <IconCheck size={14} color="green" /> : <IconCopy size={14} />}
                </ActionIcon>
                {showDownload && (
                  <ActionIcon
                    variant="light"
                    size="sm"
                    onClick={() => handleDownload(formattedJson, 'json')}
                    title="Download formatted JSON"
                  >
                    <IconDownload size={14} />
                  </ActionIcon>
                )}
              </Group>
            </Group>
            
            <Paper withBorder>
              <ScrollArea h={maxHeight} scrollbarSize={6}>
                <Code 
                  block
                  p="md"
                  style={{ 
                    fontSize: '12px',
                    lineHeight: '1.4',
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    whiteSpace: 'pre'
                  }}
                >
                  {formattedJson}
                </Code>
              </ScrollArea>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="compact" pt="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Compact JSON without formatting (smaller file size)
              </Text>
              <Group gap="xs">
                <ActionIcon
                  variant="light"
                  size="sm"
                  onClick={() => handleCopy(compactJson)}
                  title="Copy compact JSON"
                >
                  {copied ? <IconCheck size={14} color="green" /> : <IconCopy size={14} />}
                </ActionIcon>
                {showDownload && (
                  <ActionIcon
                    variant="light"
                    size="sm"
                    onClick={() => handleDownload(compactJson, 'compact')}
                    title="Download compact JSON"
                  >
                    <IconDownload size={14} />
                  </ActionIcon>
                )}
              </Group>
            </Group>
            
            <Paper withBorder>
              <ScrollArea h={maxHeight} scrollbarSize={6}>
                <Code 
                  block
                  p="md"
                  style={{ 
                    fontSize: '12px',
                    lineHeight: '1.4',
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    wordBreak: 'break-all'
                  }}
                >
                  {compactJson}
                </Code>
              </ScrollArea>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {copied && (
        <Notification
          icon={<IconCheck size={18} />}
          color="teal"
          title="Copied!"
          onClose={() => setCopied(false)}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
          }}
        >
          JSON data copied to clipboard
        </Notification>
      )}
    </Card>
  );
}