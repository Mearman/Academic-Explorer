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
  Notification,
  Switch
} from '@mantine/core';
import { IconCode, IconCopy, IconCheck, IconDownload, IconEye, IconTextWrap, IconFileText } from '@tabler/icons-react';
import { reconstructAbstract } from '@/lib/openalex/utils/transformers';

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
 * Custom JSON replacer to handle long strings and improve readability
 */
function jsonReplacer(key: string, value: unknown): unknown {
  if (typeof value === 'string') {
    // Split very long strings into multiple lines for better readability
    if (value.length > 100) {
      // Break at word boundaries if possible, otherwise at character limit
      const chunks = [];
      let remaining = value;
      
      while (remaining.length > 80) {
        let breakPoint = 80;
        // Try to find a good break point (space, slash, etc.)
        const possibleBreaks = [' ', '/', '&', '?', '=', '.', ',', ';'];
        for (const breakChar of possibleBreaks) {
          const lastBreak = remaining.lastIndexOf(breakChar, 80);
          if (lastBreak > 60) { // Only use if it's not too early
            breakPoint = lastBreak + 1;
            break;
          }
        }
        
        chunks.push(remaining.slice(0, breakPoint));
        remaining = remaining.slice(breakPoint);
      }
      if (remaining) chunks.push(remaining);
      
      return chunks.join('\n    '); // Add indentation for continuation lines
    }
  }
  return value;
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
  const [wordWrap, setWordWrap] = useState(true);
  const [prettyPrint, setPrettyPrint] = useState(true);
  
  // Check if data has an abstract inverted index (for OpenAlex Works)
  const hasAbstractIndex: boolean = Boolean(
    data && 
    typeof data === 'object' && 
    'abstract_inverted_index' in data && 
    data.abstract_inverted_index &&
    typeof data.abstract_inverted_index === 'object' &&
    Object.keys(data.abstract_inverted_index).length > 0
  );
  
  const reconstructedAbstract = hasAbstractIndex && 
    data && 
    typeof data === 'object' && 
    'abstract_inverted_index' in data &&
    data.abstract_inverted_index &&
    typeof data.abstract_inverted_index === 'object'
    ? reconstructAbstract(data.abstract_inverted_index as Record<string, number[]>)
    : null;
  
  // Format JSON with different options
  const formatJson = (useReplacer: boolean, spaces: number) => {
    if (useReplacer) {
      return JSON.stringify(data, jsonReplacer, spaces);
    }
    return JSON.stringify(data, null, spaces);
  };
  
  const formattedJson = formatJson(prettyPrint, 2);
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

  const handleDownload = (text: string, format: 'json' | 'compact' | 'abstract' = 'json') => {
    let filename: string;
    let mimeType: string;
    
    if (format === 'abstract') {
      filename = `${entityType || 'entity'}-${entityId || 'data'}-abstract.txt`;
      mimeType = 'text/plain';
    } else {
      filename = `${entityType || 'entity'}-${entityId || 'data'}-${format}.json`;
      mimeType = 'application/json';
    }
    
    const blob = new Blob([text], { type: mimeType });
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
          {hasAbstractIndex && (
            <Tabs.Tab value="abstract" leftSection={<IconFileText size={14} />}>
              Abstract
            </Tabs.Tab>
          )}
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

            {/* Formatting Controls */}
            <Group gap="md" bg="gray.0" p="sm" style={{ borderRadius: '4px' }}>
              <Group gap="xs">
                <IconTextWrap size={16} />
                <Switch
                  size="sm"
                  label="Word Wrap"
                  checked={wordWrap}
                  onChange={(event) => setWordWrap(event.currentTarget.checked)}
                />
              </Group>
              <Group gap="xs">
                <Switch
                  size="sm"
                  label="Smart Line Breaking"
                  checked={prettyPrint}
                  onChange={(event) => setPrettyPrint(event.currentTarget.checked)}
                  description="Break long strings at word boundaries"
                />
              </Group>
            </Group>
            
            <Paper withBorder>
              <ScrollArea h={maxHeight} scrollbarSize={6}>
                <Code 
                  block
                  p="md"
                  style={{ 
                    fontSize: '12px',
                    lineHeight: '1.5',
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "SF Mono", "Consolas", monospace',
                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                    wordBreak: wordWrap ? 'break-word' : 'normal',
                    overflowWrap: wordWrap ? 'break-word' : 'normal',
                    maxWidth: '100%',
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

            {/* Compact View Controls */}
            <Group gap="md" bg="gray.0" p="sm" style={{ borderRadius: '4px' }}>
              <Text size="sm" fw={500}>Formatting Options:</Text>
              <Group gap="xs">
                <IconTextWrap size={16} />
                <Switch
                  size="sm"
                  label="Word Wrap"
                  checked={wordWrap}
                  onChange={(event) => setWordWrap(event.currentTarget.checked)}
                />
              </Group>
            </Group>
            
            <Paper withBorder>
              <ScrollArea h={maxHeight} scrollbarSize={6}>
                <Code 
                  block
                  p="md"
                  style={{ 
                    fontSize: '12px',
                    lineHeight: '1.5',
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "SF Mono", "Consolas", monospace',
                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                    wordBreak: wordWrap ? 'break-word' : 'break-all',
                    overflowWrap: wordWrap ? 'break-word' : 'normal',
                    maxWidth: '100%',
                  }}
                >
                  {compactJson}
                </Code>
              </ScrollArea>
            </Paper>
          </Stack>
        </Tabs.Panel>

        {hasAbstractIndex && (
          <Tabs.Panel value="abstract" pt="md">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Abstract reconstructed from inverted index
                </Text>
                <Group gap="xs">
                  <ActionIcon
                    variant="light"
                    size="sm"
                    onClick={() => handleCopy(reconstructedAbstract || '')}
                    title="Copy reconstructed abstract"
                  >
                    {copied ? <IconCheck size={14} color="green" /> : <IconCopy size={14} />}
                  </ActionIcon>
                  {showDownload && (
                    <ActionIcon
                      variant="light"
                      size="sm"
                      onClick={() => handleDownload(reconstructedAbstract || '', 'abstract')}
                      title="Download abstract as text file"
                    >
                      <IconDownload size={14} />
                    </ActionIcon>
                  )}
                </Group>
              </Group>

              {/* Abstract Statistics */}
              <Group gap="md" bg="blue.0" p="sm" style={{ borderRadius: '4px' }}>
                <Text size="sm" fw={500}>Statistics:</Text>
                {reconstructedAbstract && (
                  <>
                    <Badge variant="light" size="sm" color="blue">
                      {reconstructedAbstract.split(' ').length} words
                    </Badge>
                    <Badge variant="light" size="sm" color="blue">
                      {reconstructedAbstract.length} characters
                    </Badge>
                    <Badge variant="light" size="sm" color="blue">
                      {data && 
                       typeof data === 'object' && 
                       'abstract_inverted_index' in data &&
                       data.abstract_inverted_index &&
                       typeof data.abstract_inverted_index === 'object'
                        ? Object.keys(data.abstract_inverted_index).length
                        : 0} unique terms
                    </Badge>
                  </>
                )}
              </Group>
              
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
              <Paper withBorder bg="gray.50" p="sm">
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
        )}
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