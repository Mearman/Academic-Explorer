'use client';

import { 
  Card, 
  Group, 
  Title, 
  Tabs,
  Notification
} from '@mantine/core';
import { IconCode, IconCheck, IconEye, IconFileText } from '@tabler/icons-react';
import { useState } from 'react';

import { DataStats } from '@/components/molecules/data-stats/DataStats';

import { AbstractTab } from './data-tabs/AbstractTab';
import { CompactTab } from './data-tabs/CompactTab';
import { FormattedTab } from './data-tabs/FormattedTab';
import { useDataFormatting } from './hooks/use-data-formatting';
import { useRawDataActions } from './hooks/use-raw-data-actions';

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
  const [activeTab, setActiveTab] = useState<string | null>('formatted');
  const [wordWrap, setWordWrap] = useState(true);
  const [prettyPrint, setPrettyPrint] = useState(true);
  
  const { copied, handleCopy, handleDownload } = useRawDataActions();
  const {
    formattedJson,
    compactJson,
    reconstructedAbstract,
    hasAbstractIndex,
    dataSizeKB,
    objectKeys,
    uniqueTerms,
  } = useDataFormatting(data, prettyPrint);

  // Create action handlers with context
  const handleCopyFormatted = () => handleCopy(formattedJson);
  const handleCopyCompact = () => handleCopy(compactJson);
  const handleCopyAbstract = () => handleCopy(reconstructedAbstract || '');
  
  const handleDownloadFormatted = () => handleDownload(formattedJson, 'json', entityType, entityId);
  const handleDownloadCompact = () => handleDownload(compactJson, 'compact', entityType, entityId);
  const handleDownloadAbstract = () => handleDownload(reconstructedAbstract || '', 'abstract', entityType, entityId);

  return (
    <Card withBorder radius="md" p="xl">
      <Group mb="lg" justify="space-between">
        <Group>
          <IconCode size={20} />
          <Title order={2} size="lg">{title}</Title>
        </Group>
        
        {/* Data Stats */}
        <DataStats sizeKB={dataSizeKB} fieldCount={objectKeys} />
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

        <FormattedTab
          formattedJson={formattedJson}
          copied={copied}
          showDownload={showDownload}
          wordWrap={wordWrap}
          prettyPrint={prettyPrint}
          maxHeight={maxHeight}
          onCopy={handleCopyFormatted}
          onDownload={handleDownloadFormatted}
          onWordWrapChange={setWordWrap}
          onPrettyPrintChange={setPrettyPrint}
        />

        <CompactTab
          compactJson={compactJson}
          copied={copied}
          showDownload={showDownload}
          wordWrap={wordWrap}
          maxHeight={maxHeight}
          onCopy={handleCopyCompact}
          onDownload={handleDownloadCompact}
          onWordWrapChange={setWordWrap}
        />

        {hasAbstractIndex && (
          <AbstractTab
            reconstructedAbstract={reconstructedAbstract}
            uniqueTerms={uniqueTerms}
            copied={copied}
            showDownload={showDownload}
            maxHeight={maxHeight}
            onCopy={handleCopyAbstract}
            onDownload={handleDownloadAbstract}
          />
        )}
      </Tabs>

      {copied && (
        <Notification
          icon={<IconCheck size={18} />}
          color="teal"
          title="Copied!"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
          }}
        >
          Data copied to clipboard
        </Notification>
      )}
    </Card>
  );
}