/**
 * Main catalogue manager component
 * Handles lists, bibliographies, and entity management
 */

import React, { useState, useEffect } from "react";
import {
  Container,
  Group,
  Title,
  Tabs,
  Button,
  Modal,
  Stack,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  rem,
  TextInput,
  Card,
  SimpleGrid,
  Paper,
} from "@mantine/core";
import {
  IconPlus,
  IconShare,
  IconDownload,
  IconUpload,
  IconList,
  IconBook,
  IconSearch,
  IconEdit,
} from "@tabler/icons-react";
import { useHotkeys } from "@mantine/hooks";
import { useCatalogue } from "@/hooks/useCatalogue";
import { CatalogueListComponent } from "@/components/catalogue/CatalogueList";
import { CatalogueEntities } from "@/components/catalogue/CatalogueEntities";
import { CreateListModal } from "@/components/catalogue/CreateListModal";
import { ShareModal } from "@/components/catalogue/ShareModal";
import { ImportModal } from "@/components/catalogue/ImportModal";
import { ExportModal } from "@/components/catalogue/ExportModal";
import { logger } from "@/lib/logger";
import { SPECIAL_LIST_IDS } from "@academic-explorer/utils/storage/catalogue-db";

interface CatalogueManagerProps {
  onNavigate?: (url: string) => void;
  sharedToken?: string;
}

export function CatalogueManager({ onNavigate, sharedToken }: CatalogueManagerProps) {
  const {
    lists,
    selectedList,
    entities,
    isLoadingLists,
    isLoadingEntities,
    createList,
    deleteList,
    selectList,
    generateShareUrl,
    importFromShareUrl,
    getListStats,
    searchLists,
  } = useCatalogue();

  const [activeTab, setActiveTab] = useState<string | null>("lists");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [listStats, setListStats] = useState<{
    totalEntities: number;
    entityCounts: Record<string, number>;
  } | null>(null);

  // Load stats when selected list changes
  useEffect(() => {
    if (selectedList?.id) {
      getListStats(selectedList.id)
        .then(setListStats)
        .catch((error) => {
          logger.error("catalogue-ui", "Failed to load list stats", {
            listId: selectedList.id,
            error
          });
        });
    } else {
      setListStats(null);
    }
  }, [selectedList?.id, getListStats]);

  // Keyboard shortcuts
  useHotkeys([
    ["mod+N", () => setShowCreateModal(true)],
    ["mod+K", () => {
      const searchInput = document.querySelector('input[placeholder*="Search lists"]') as HTMLInputElement;
      searchInput?.focus();
    }],
    ["mod+Shift+S", () => selectedList && handleShare()],
    ["mod+Shift+I", () => setShowImportModal(true)],
  ]);

  // Filter lists based on search (exclude special system lists)
  const filteredLists = searchQuery
    ? lists.filter(list =>
        list.id && !Object.values(SPECIAL_LIST_IDS).includes(list.id as any) && (
          list.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          list.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          list.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      )
    : lists.filter(list => list.id && !Object.values(SPECIAL_LIST_IDS).includes(list.id as any));

  // Handle sharing
  const handleShare = async () => {
    if (!selectedList) return;

    try {
      const url = await generateShareUrl(selectedList.id!);
      setShareUrl(url);
      setShowShareModal(true);
      logger.debug("catalogue-ui", "Share URL generated successfully", {
        listId: selectedList.id,
        listTitle: selectedList.title
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to generate share URL", {
        listId: selectedList.id,
        error
      });
    }
  };

  // Handle import
  const handleImport = async (url: string) => {
    try {
      const listId = await importFromShareUrl(url);
      if (listId) {
        selectList(listId);
        setShowImportModal(false);
        logger.info("catalogue-ui", "List imported successfully", {
          importedUrl: url,
          newListId: listId
        });
      } else {
        logger.warn("catalogue-ui", "Import returned null - likely invalid data", {
          url
        });
      }
    } catch (error) {
      logger.error("catalogue-ui", "Failed to import list", {
        url,
        error
      });
    }
  };

  return (
    <Container size="xl" py="md" data-testid="catalogue-manager">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <IconList size={32} />
            <Title order={1}>Catalogue</Title>
            {selectedList && (
              <Badge size="lg" color="blue">
                {selectedList.type === "bibliography" ? "Bibliography" : "List"}
              </Badge>
            )}
          </Group>

          <Group gap="xs">
            <Tooltip label="Import from URL">
              <ActionIcon
                variant="light"
                size="lg"
                onClick={() => setShowImportModal(true)}
              >
                <IconUpload size={rem(18)} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Share current list">
              <ActionIcon
                variant="light"
                size="lg"
                onClick={handleShare}
                disabled={!selectedList}
              >
                <IconShare size={rem(18)} />
              </ActionIcon>
            </Tooltip>

            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setShowCreateModal(true)}
            >
              Create New List
            </Button>
          </Group>
        </Group>

        {/* Search */}
        <Group>
          <IconSearch size={16} />
          <Text fw={500}>Search:</Text>
          <TextInput
            placeholder="Search lists by title, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search catalogue lists"
            aria-describedby="search-help"
            flex={1}
          />
          <Text id="search-help" size="xs" c="dimmed" component="span">
            Press Ctrl+K to focus
          </Text>
        </Group>

        {/* Main Content */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="lists" leftSection={<IconList size={16} />}>
              Lists ({filteredLists.length})
            </Tabs.Tab>
            <Tabs.Tab value="bibliographies" leftSection={<IconBook size={16} />}>
              Bibliographies ({filteredLists.filter(l => l.type === "bibliography").length})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="lists" pt="md">
            <CatalogueListComponent
              lists={filteredLists.filter(l => l.type === "list")}
              selectedListId={selectedList?.id || null}
              onSelectList={selectList}
              onDeleteList={deleteList}
              onNavigate={onNavigate}
              isLoading={isLoadingLists}
              listType="list"
            />
          </Tabs.Panel>

          <Tabs.Panel value="bibliographies" pt="md">
            <CatalogueListComponent
              lists={filteredLists.filter(l => l.type === "bibliography")}
              selectedListId={selectedList?.id || null}
              onSelectList={selectList}
              onDeleteList={deleteList}
              onNavigate={onNavigate}
              isLoading={isLoadingLists}
              listType="bibliography"
            />
          </Tabs.Panel>
        </Tabs>

        {/* Selected List Details */}
        {selectedList && (
          <Card withBorder p="md" bg="gray.0" data-testid="selected-list-details">
            <Group justify="space-between" mb="md">
              <div>
                <Title order={3} data-testid="selected-list-title">{selectedList.title}</Title>
                {selectedList.description && (
                  <Text c="dimmed" size="sm" mt="xs">
                    {selectedList.description}
                  </Text>
                )}
              </div>

              <Group gap="xs">
                {selectedList.tags?.map((tag, index) => (
                  <Badge key={index} size="sm" variant="light">
                    {tag}
                  </Badge>
                ))}
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => {
                    const card = lists.find(l => l.id === selectedList.id);
                    if (card) {
                      // Trigger edit via the list component
                      const editButton = document.querySelector(`[data-testid="edit-list-${selectedList.id}"]`) as HTMLElement;
                      editButton?.click();
                    }
                  }}
                  leftSection={<IconEdit size={16} />}
                  data-testid="edit-selected-list-button"
                >
                  Edit
                </Button>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => setShowExportModal(true)}
                  leftSection={<IconDownload size={16} />}
                  data-testid="export-list-button"
                >
                  Export
                </Button>
                <Button
                  variant="light"
                  size="sm"
                  onClick={handleShare}
                  leftSection={<IconShare size={16} />}
                  data-testid="share-list-button"
                >
                  Share
                </Button>
              </Group>
            </Group>

            <Group justify="space-between" mt="md">
              <Text size="xs" c="dimmed">
                Created: {selectedList.createdAt.toLocaleDateString()} •
                Modified: {selectedList.updatedAt.toLocaleDateString()}
                {selectedList.isPublic ? " • Public" : " • Private"}
              </Text>
            </Group>

            {/* Entity Statistics */}
            {listStats && listStats.totalEntities > 0 && (
              <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="xs" mt="md">
                <Paper withBorder p="xs" radius="sm">
                  <Text size="xs" c="dimmed" fw={500}>Total</Text>
                  <Text size="lg" fw={700} data-testid="stat-total">
                    {listStats.totalEntities}
                  </Text>
                </Paper>

                {Object.entries(listStats.entityCounts)
                  .filter(([_, count]) => count > 0)
                  .map(([entityType, count]) => (
                    <Paper key={entityType} withBorder p="xs" radius="sm">
                      <Text size="xs" c="dimmed" fw={500} tt="capitalize">
                        {entityType}
                      </Text>
                      <Text size="lg" fw={700} data-testid={`stat-${entityType}`}>
                        {count}
                      </Text>
                    </Paper>
                  ))}
              </SimpleGrid>
            )}
          </Card>
        )}

        {/* Selected List Entities */}
        {selectedList && (
          <CatalogueEntities
            selectedList={selectedList}
            onNavigate={(entityType, entityId) => {
              const url = `/#/${entityType}/${entityId}`;
              if (onNavigate) {
                onNavigate(url);
              } else {
                window.location.hash = `/${entityType}/${entityId}`;
              }
            }}
          />
        )}

        {/* Modals */}
        <Modal
          opened={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New List"
          size="md"
        >
          <CreateListModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={async (params) => {
              const listId = await createList(params);
              // Switch to the appropriate tab based on list type
              setActiveTab(params.type === "bibliography" ? "bibliographies" : "lists");
              selectList(listId);
              setShowCreateModal(false);
            }}
          />
        </Modal>

        <Modal
          opened={showShareModal}
          onClose={() => setShowShareModal(false)}
          title="Share List"
          size="lg"
        >
          <ShareModal
            shareUrl={shareUrl}
            listTitle={selectedList?.title || ""}
            onClose={() => setShowShareModal(false)}
          />
        </Modal>

        <Modal
          opened={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Import List"
          size="lg"
        >
          <ImportModal
            onClose={() => setShowImportModal(false)}
            onImport={handleImport}
          />
        </Modal>

        <Modal
          opened={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Export List"
          size="lg"
        >
          {selectedList && (
            <ExportModal
              listId={selectedList.id!}
              listTitle={selectedList.title}
              onClose={() => setShowExportModal(false)}
            />
          )}
        </Modal>
      </Stack>
    </Container>
  );
}