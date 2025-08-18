import { useState } from 'react';
import { Stack, Card, Text, Group, Button, Alert, Anchor } from '@mantine/core';
import { IconInfoCircle, IconBook, IconSearch, IconRefresh } from '@tabler/icons-react';

import { AdvancedSearchForm, type AdvancedSearchFormData } from '@/components/molecules/advanced-search-form';
import { QueryHistory } from '@/components/organisms/query-history';
import { SearchHistory } from '@/components/organisms/search-history';
import type { WorksParams } from '@/lib/openalex/types';

import * as styles from './query-builder.css';

interface QueryBuilderProps {
  /** Initial form data */
  initialData?: Partial<AdvancedSearchFormData>;
  /** Callback when search parameters change */
  onParamsChange: (params: WorksParams) => void;
  /** Callback when search is submitted */
  onSearch: (params: WorksParams) => void;
  /** Whether to show query help */
  showHelp?: boolean;
}

export function QueryBuilder({ 
  initialData, 
  onParamsChange, 
  onSearch, 
  showHelp = true 
}: QueryBuilderProps) {
  const [showQueryHelp, setShowQueryHelp] = useState(false);
  
  const handleSearch = (params: WorksParams) => {
    onSearch(params);
  };
  
  const handleFormChange = (params: WorksParams) => {
    onParamsChange(params);
  };
  
  const handleRerunQuery = (params: WorksParams) => {
    onSearch(params);
  };
  
  return (
    <div className={styles.container}>
      <Stack gap="lg">
        {/* Header */}
        <div className={styles.header}>
          <Group justify="space-between" align="center">
            <div>
              <Text size="xl" fw={700}>Query Builder</Text>
              <Text size="sm" c="dimmed">
                Build powerful OpenAlex API queries with advanced filters
              </Text>
            </div>
            {showHelp && (
              <Button 
                variant="light" 
                size="xs"
                leftSection={<IconBook size={14} />}
                onClick={() => setShowQueryHelp(!showQueryHelp)}
              >
                Query Help
              </Button>
            )}
          </Group>
        </div>
        
        {/* Query Help Panel */}
        {showQueryHelp && (
          <Alert 
            icon={<IconInfoCircle size={16} />} 
            title="OpenAlex Query Syntax" 
            color="blue"
            variant="light"
            withCloseButton
            onClose={() => setShowQueryHelp(false)}
          >
            <Stack gap="xs">
              <Text size="sm">
                <strong>Search operators:</strong>
              </Text>
              <Text size="xs" c="dimmed" ml="md">
                • <code>AND</code>, <code>OR</code>, <code>NOT</code> - Boolean operators<br/>
                • <code>"exact phrase"</code> - Exact phrase matching<br/>
                • <code>title.search:machine learning</code> - Field-specific search<br/>
                • <code>abstract.search:"deep learning"</code> - Field + exact phrase
              </Text>
              
              <Text size="sm" mt="xs">
                <strong>Wildcards:</strong>
              </Text>
              <Text size="xs" c="dimmed" ml="md">
                • <code>*</code> - Multiple characters (e.g., <code>climat*</code>)<br/>
                • <code>?</code> - Single character (e.g., <code>wom?n</code>)
              </Text>
              
              <Text size="sm" mt="xs">
                <Anchor href="https://docs.openalex.org/how-to-use-the-api/get-lists-of-entities/search-entities" target="_blank" size="xs">
                  View full OpenAlex search documentation →
                </Anchor>
              </Text>
            </Stack>
          </Alert>
        )}
        
        {/* Search History */}
        <Card withBorder padding="md">
          <SearchHistory />
        </Card>
        
        {/* Main Search Form */}
        <Card withBorder padding="lg" className={styles.formCard}>
          <AdvancedSearchForm
            onSearch={handleSearch}
            initialData={initialData}
            onParamsChange={handleFormChange}
          />
        </Card>
        
        {/* Query History */}
        <Card withBorder padding="md">
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Text fw={600} size="sm">Recent Queries</Text>
              <Button 
                variant="subtle" 
                size="xs"
                leftSection={<IconRefresh size={12} />}
              >
                Refresh
              </Button>
            </Group>
            <QueryHistory onRerunQuery={handleRerunQuery} />
          </Stack>
        </Card>
        
        {/* Query Tips */}
        {showHelp && (
          <Alert 
            icon={<IconSearch size={16} />} 
            title="Search Tips" 
            color="grape"
            variant="light"
          >
            <Stack gap="xs">
              <Text size="sm">
                <strong>Pro tips for better results:</strong>
              </Text>
              <Text size="xs" c="dimmed">
                • Use specific terms for more relevant results<br/>
                • Combine filters to narrow down your search<br/>
                • Try different publication year ranges<br/>
                • Use open access filters for freely available papers<br/>
                • Sort by citation count for influential papers
              </Text>
            </Stack>
          </Alert>
        )}
      </Stack>
    </div>
  );
}