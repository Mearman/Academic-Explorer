/**
 * Manage Page
 * 
 * Centralized management interface for validation logs, storage management,
 * cache control, and application settings.
 */

import { Container, Title, Tabs, Text, Space } from '@mantine/core';
import { createFileRoute } from '@tanstack/react-router';

import { ValidationExport } from '@/components/molecules/validation-export';
import { ValidationSettings } from '@/components/molecules/validation-settings';
import { StorageManager } from '@/components/organisms/storage-manager';
import { ValidationDashboard } from '@/components/organisms/validation-dashboard';
import { ValidationLogViewer } from '@/components/organisms/validation-log-viewer';

export const Route = createFileRoute('/manage')({
  component: ManagePage,
});

function ManagePage() {
  return (
    <Container size="xl" py="md">
      <Title order={1} mb="lg">
        Manage Academic Explorer
      </Title>
      
      <Text size="sm" c="dimmed" mb="xl">
        Manage validation logs, storage, cache, and application settings.
      </Text>
      
      <Tabs defaultValue="validation" variant="outline">
        <Tabs.List mb="lg">
          <Tabs.Tab value="validation">
            Validation
          </Tabs.Tab>
          <Tabs.Tab value="storage">
            Storage
          </Tabs.Tab>
          <Tabs.Tab value="cache">
            Cache
          </Tabs.Tab>
          <Tabs.Tab value="settings">
            Settings
          </Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value="validation">
          <ValidationTabContent />
        </Tabs.Panel>
        
        <Tabs.Panel value="storage">
          <StorageTabContent />
        </Tabs.Panel>
        
        <Tabs.Panel value="cache">
          <CacheTabContent />
        </Tabs.Panel>
        
        <Tabs.Panel value="settings">
          <SettingsTabContent />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

function ValidationTabContent() {
  return (
    <div>
      <Title order={2} mb="md">
        Validation Management
      </Title>
      
      <Text size="sm" c="dimmed" mb="lg">
        Monitor entity validation, view logs, and export validation reports.
        Validation helps track schema changes and data quality issues in OpenAlex entities.
      </Text>
      
      {/* Validation Dashboard */}
      <ValidationDashboard />
      
      <Space h="xl" />
      
      {/* Validation Log Viewer */}
      <ValidationLogViewer />
      
      <Space h="xl" />
      
      {/* Export Controls */}
      <ValidationExport />
    </div>
  );
}

function StorageTabContent() {
  return (
    <div>
      <Title order={2} mb="md">
        Storage Management
      </Title>
      
      <Text size="sm" c="dimmed" mb="lg">
        Manage local storage, IndexedDB, and data persistence settings.
      </Text>
      
      <StorageManager />
    </div>
  );
}

function CacheTabContent() {
  return (
    <div>
      <Title order={2} mb="md">
        Cache Management
      </Title>
      
      <Text size="sm" c="dimmed" mb="lg">
        View and manage OpenAlex API response caching. Clear cache to force fresh data retrieval.
      </Text>
      
      {/* TODO: Implement cache management component */}
      <Text c="dimmed" fs="italic">
        Cache management interface coming soon...
      </Text>
    </div>
  );
}

function SettingsTabContent() {
  return (
    <div>
      <Title order={2} mb="md">
        Application Settings
      </Title>
      
      <Text size="sm" c="dimmed" mb="lg">
        Configure validation preferences and application behavior.
      </Text>
      
      <ValidationSettings />
    </div>
  );
}