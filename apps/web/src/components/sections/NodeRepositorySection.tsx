/**
 * Node Repository Section component
 * Displays repository nodes that can be dragged into the graph
 */

import React, { useCallback, useMemo } from "react";
import {
  Stack,
  Text,
  TextInput,
  Checkbox,
  Group,
  Button,
  Card,
  Badge,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconSearch, IconTrash, IconDragDrop } from "@tabler/icons-react";
import { useRepositoryStore, createInitialNodeTypeFilter } from "@/stores/repository-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@academic-explorer/utils/logger";
import type { GraphNode, EntityType } from "@academic-explorer/graph";
import {
  SectionFrame,
  BulkActionToolbar,
  EntityCollectionList,
} from "@academic-explorer/ui";
import {
  IconFile,
  IconUser,
  IconBook,
  IconBuilding,
  IconTag,
  IconBuildingStore,
  IconCoin,
  IconBulb,
} from "@tabler/icons-react";

// Properly typed entity options without type assertions
const entityTypeOptions: Array<{
  type: EntityType;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}> = [
  { type: "works", label: "Works", icon: IconFile },
  { type: "authors", label: "Authors", icon: IconUser },
  { type: "sources", label: "Sources", icon: IconBook },
  { type: "institutions", label: "Institutions", icon: IconBuilding },
  { type: "topics", label: "Topics", icon: IconTag },
  { type: "publishers", label: "Publishers", icon: IconBuildingStore },
  { type: "funders", label: "Funders", icon: IconCoin },
  { type: "concepts", label: "Concepts", icon: IconBulb },
];

interface NodeRepositoryItemProps {
  node: GraphNode;
  isSelected: boolean;
  onSelect: (nodeId: string, selected: boolean) => void;
  onRemove: (nodeId: string) => void;
}

const NodeRepositoryItem: React.FC<NodeRepositoryItemProps> = ({
  node,
  isSelected,
  onSelect,
  onRemove,
}) => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;

  // Get icon for entity type
  const entityOption = entityTypeOptions.find(
    (option) => option.type === node.entityType,
  );
  const Icon = entityOption?.icon ?? IconFile;

  const handleDragStart = useCallback(
    (event: React.DragEvent) => {
      // Store node data for drop handler
      event.dataTransfer.setData(
        "application/json",
        JSON.stringify({
          entityType: "repository-node",
          node,
        }),
      );
      event.dataTransfer.effectAllowed = "copy";

      logger.debug("repository", "Started dragging repository node", {
        nodeId: node.id,
        nodeType: node.entityType,
        nodeLabel: node.label,
      });
    },
    [node],
  );

  const handleCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSelect(node.id, event.currentTarget.checked);
    },
    [node.id, onSelect],
  );

  const handleRemove = useCallback(() => {
    onRemove(node.id);
  }, [node.id, onRemove]);

  return (
    <Card
      padding="xs"
      withBorder
      style={{
        cursor: "grab",
        backgroundColor: isSelected
          ? colors.primary + "20"
          : colors.background.primary,
        borderColor: isSelected ? colors.primary : colors.border.primary,
        marginBottom: "4px",
      }}
      draggable="true"
      onDragStart={handleDragStart}
    >
      <Group gap="xs" wrap="nowrap">
        <Checkbox
          checked={isSelected}
          onChange={handleCheckboxChange}
          size="sm"
        />

        <Icon
          size={16}
          style={{ color: colors.text.secondary, flexShrink: 0 }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <Text
            size="sm"
            style={{ fontWeight: 500, color: colors.text.primary }}
            truncate
          >
            {node.label}
          </Text>
          <Text size="xs" style={{ color: colors.text.secondary }}>
            {entityOption?.label ?? node.entityType}
          </Text>
        </div>

        <Group gap="xs">
          <Tooltip label="Drag to graph">
            <div style={{ color: colors.text.tertiary }}>
              <IconDragDrop size={14} />
            </div>
          </Tooltip>

          <Tooltip label="Remove from repository">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              onClick={handleRemove}
            >
              <IconTrash size={12} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Card>
  );
};

export const NodeRepositorySection: React.FC = () => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;

  // Repository store - use direct store instance
  const repositoryStore = useRepositoryStore();

  // State management for component
  const [searchQuery, setSearchQueryState] = React.useState("");
  const [nodeTypeFilter, setNodeTypeFilterState] = React.useState(createInitialNodeTypeFilter());
  const [selectedRepositoryNodes, setSelectedRepositoryNodes] = React.useState<string[]>([]);

  // Initialize state from store
  React.useEffect(() => {
    (async () => {
      try {
        const state = await repositoryStore.getRepositoryState();
        setSearchQueryState(state.searchQuery);
        setNodeTypeFilterState(state.nodeTypeFilter);
        setSelectedRepositoryNodes(state.selectedRepositoryNodes);
      } catch (error) {
        logger?.error("ui", "Failed to load repository state", { error });
      }
    })();
  }, [repositoryStore]);

  // Get filtered nodes using repository store methods
  const filteredNodes = useMemo(() => {
    // Create a mock state object for the compute method
    const mockState = {
      searchQuery,
      nodeTypeFilter,
      repositoryNodes: {}, // This would come from repository state
    };
    return repositoryStore.computeFilteredNodes(mockState);
  }, [searchQuery, nodeTypeFilter, repositoryStore]);

  const selectedNodes = useMemo(() => {
    return Object.keys(selectedRepositoryNodes).filter(nodeId =>
      selectedRepositoryNodes[nodeId]
    );
  }, [selectedRepositoryNodes]);

  const handleSearchChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
        const newQuery = event.currentTarget.value;
        setSearchQueryState(newQuery);
        await repositoryStore.setSearchQuery(newQuery);
      } catch (error) {
        logger?.error("ui", "Failed to set search query", { error });
      }
    },
    [repositoryStore],
  );

  const handleTypeFilterChange = useCallback(
    async (entityType: EntityType, checked: boolean) => {
      try {
        await repositoryStore.setNodeTypeFilter(entityType, checked);
        setNodeTypeFilterState(prev => ({ ...prev, [entityType]: checked }));
      } catch (error) {
        logger?.error("ui", "Failed to set node type filter", { error });
      }
    },
    [repositoryStore],
  );

  const handleSelectAll = useCallback(async () => {
    try {
      await repositoryStore.selectAllNodes();
      // Refresh selected nodes
      const state = await repositoryStore.getRepositoryState();
      setSelectedRepositoryNodes(state.selectedRepositoryNodes);
    } catch (error) {
      logger?.error("ui", "Failed to select all nodes", { error });
    }
  }, [repositoryStore]);

  const handleClearSelection = useCallback(async () => {
    try {
      await repositoryStore.clearAllSelections();
      setSelectedRepositoryNodes({});
    } catch (error) {
      logger?.error("ui", "Failed to clear selections", { error });
    }
  }, [repositoryStore]);

  const handleRemoveSelected = useCallback(async () => {
    try {
      const selectedNodeIds = Object.keys(selectedRepositoryNodes);
      if (selectedNodeIds.length > 0) {
        await repositoryStore.removeFromRepository(selectedNodeIds);
        setSelectedRepositoryNodes({});
        logger.debug("repository", "Removed selected nodes from repository", {
          removedCount: selectedNodeIds.length,
        });
      }
    } catch (error) {
      logger?.error("ui", "Failed to remove selected nodes", { error });
    }
  }, [selectedRepositoryNodes, repositoryStore]);

  const handleRemoveNode = useCallback(
    async (nodeId: string) => {
      try {
        await repositoryStore.removeFromRepository([nodeId]);
        setSelectedRepositoryNodes(prev => {
          const newState = { ...prev };
          delete newState[nodeId];
          return newState;
        });
        logger.debug("repository", "Removed single node from repository", {
          nodeId,
        });
      } catch (error) {
        logger?.error("ui", "Failed to remove node", { error });
      }
    },
    [repositoryStore],
  );

  return (
    <SectionFrame title="Node Repository" icon={<IconFile size={16} />}>
      <BulkActionToolbar
        totalItems={filteredNodes.length}
        selectedItems={Object.keys(selectedRepositoryNodes)}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        additionalActions={
          selectedNodes.length > 0 ? (
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={handleRemoveSelected}
            >
              Remove Selected
            </Button>
          ) : undefined
        }
      />

      <Stack gap="sm" p="md" style={{ height: "100%", overflow: "hidden" }}>
        {/* Search */}
        <TextInput
          placeholder="Search repository nodes..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={handleSearchChange}
          size="sm"
        />

        {/* Type filters */}
        <Stack gap="xs">
          <Text
            size="sm"
            style={{ fontWeight: 500, color: colors.text.primary }}
          >
            Filter by entityType:
          </Text>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px",
            }}
          >
            {entityTypeOptions.map((option) => {
              const Icon = option.icon;
              const isChecked = nodeTypeFilter[option.type];

              return (
                <Checkbox
                  key={option.type}
                  checked={isChecked}
                  onChange={(event) => {
                    handleTypeFilterChange(
                      option.type,
                      event.currentTarget.checked,
                    );
                  }}
                  label={
                    <Group gap="xs">
                      <Icon size={14} />
                      <Text size="xs">{option.label}</Text>
                    </Group>
                  }
                  size="xs"
                />
              );
            })}
          </div>
        </Stack>

        {/* Results summary */}
        <Group gap="xs" justify="space-between">
          <Text size="xs" style={{ color: colors.text.secondary }}>
            {filteredNodes.length} node{filteredNodes.length !== 1 ? "s" : ""}
          </Text>
          {selectedNodes.length > 0 && (
            <Badge size="xs" color="blue">
              {selectedNodes.length} selected
            </Badge>
          )}
        </Group>

        {/* Node list */}
        <EntityCollectionList
          items={filteredNodes}
          renderItem={(node) => (
            <NodeRepositoryItem
              key={node.id}
              node={node}
              isSelected={selectedRepositoryNodes[node.id] ?? false}
              onSelect={async (nodeId: string, selected: boolean) => {
                try {
                  await repositoryStore.selectRepositoryNode(nodeId, selected);
                  setSelectedRepositoryNodes(prev => ({
                    ...prev,
                    [nodeId]: selected
                  }));
                } catch (error) {
                  logger?.error("ui", "Failed to select node", { error });
                }
              }}
              onRemove={handleRemoveNode}
            />
          )}
          height="100%"
          emptyState={{
            title: "No nodes in repository",
            description: "Search for entities to add them here",
          }}
        />

        {/* Drag instructions */}
        {filteredNodes.length > 0 && (
          <Group justify="center" gap="xs" style={{ padding: "8px" }}>
            <IconBulb size={12} style={{ color: colors.text.tertiary }} />
            <Text size="xs" style={{ color: colors.text.tertiary }}>
              Drag nodes to the graph to add them
            </Text>
          </Group>
        )}
      </Stack>
    </SectionFrame>
  );
};
