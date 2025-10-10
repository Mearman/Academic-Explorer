/**
 * Cache Settings Section
 * Manages cache and traversal settings for graph operations
 */

import React, { useState } from "react";
import {
  IconDatabase,
  IconTrash,
  IconDownload,
  IconUpload,
  IconRefresh,
} from "@tabler/icons-react";
import {
  Button,
  NumberInput,
  Switch,
  Badge,
  Progress,
  Group,
  Text,
  Modal,
} from "@mantine/core";
import { useGraphStore } from "@/stores/graph-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { CollapsibleSection } from "@/components/molecules/CollapsibleSection";
import { logger } from "@academic-explorer/utils/logger";

// Common style constants
const FLEX_SPACE_BETWEEN = "space-between";

interface CacheSettingsSectionProps {
  className?: string;
}

export const CacheSettingsSection: React.FC<CacheSettingsSectionProps> = ({
  className = "",
}) => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;
  const [clearModalOpen, setClearModalOpen] = useState(false);

  // Get cache and traversal settings from store
  const showAllCachedNodes = useGraphStore((state) => state.showAllCachedNodes);
  const setShowAllCachedNodes = useGraphStore(
    (state) => state.setShowAllCachedNodes,
  );
  const traversalDepth = useGraphStore((state) => state.traversalDepth);
  const setTraversalDepth = useGraphStore((state) => state.setTraversalDepth);
  const clear = useGraphStore((state) => state.clear);
  const totalNodeCount = useGraphStore((state) => state.totalNodeCount);
  const totalEdgeCount = useGraphStore((state) => state.totalEdgeCount);

  // Mock cache stats - in a real implementation, these would come from a cache management store
  const cacheStats = {
    entries: 1247,
    hitRate: 87.5,
    missRate: 12.5,
    sizeInMB: 15.8,
    maxSizeInMB: 100,
  };

  const handleToggleCachedNodes = () => {
    const newValue = !showAllCachedNodes;
    setShowAllCachedNodes(newValue);
    logger.debug(
      "ui",
      `Toggled show cached nodes to ${newValue ? "on" : "off"}`,
    );
  };

  const handleTraversalDepthChange = (value: string | number) => {
    const numValue = typeof value === "string" ? parseInt(value, 10) : value;
    if (
      typeof numValue === "number" &&
      !isNaN(numValue) &&
      numValue >= 1 &&
      numValue <= 10
    ) {
      setTraversalDepth(numValue);
      logger.debug("ui", `Set traversal depth to ${numValue.toString()}`);
    }
  };

  const handleClearGraph = () => {
    clear();
    setClearModalOpen(false);
    logger.debug("ui", "Graph cleared from cache settings");
  };

  const handleClearCache = () => {
    // In a real implementation, this would clear the actual cache
    logger.debug("ui", "Cache clear requested");
    // For now, just log the action
  };

  const handleExportCache = () => {
    // Mock export functionality
    const exportData = {
      timestamp: new Date().toISOString(),
      nodes: totalNodeCount,
      edges: totalEdgeCount,
      settings: {
        showAllCachedNodes,
        traversalDepth,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cache-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logger.debug("ui", "Cache exported");
  };

  return (
    <div className={className} style={{ padding: "16px" }}>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "12px",
          color: colors.text.primary,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <IconDatabase size={16} />
        Cache & Traversal Settings
      </div>

      {/* Cache Statistics */}
      <CollapsibleSection
        title="Cache Statistics"
        icon={<IconDatabase size={14} />}
        defaultExpanded={true}
        storageKey="cache-settings-stats"
      >
        <div style={{ marginTop: "8px" }}>
          <div
            style={{
              padding: "12px",
              backgroundColor: colors.background.secondary,
              borderRadius: "8px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: FLEX_SPACE_BETWEEN,
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <Text size="sm" c="dimmed">
                Cache Entries
              </Text>
              <Badge size="sm" variant="light">
                {cacheStats.entries.toLocaleString()}
              </Badge>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: FLEX_SPACE_BETWEEN,
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <Text size="sm" c="dimmed">
                Hit Rate
              </Text>
              <Badge size="sm" variant="light" color="green">
                {cacheStats.hitRate}%
              </Badge>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: FLEX_SPACE_BETWEEN,
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <Text size="sm" c="dimmed">
                Cache Size
              </Text>
              <Badge size="sm" variant="light" color="blue">
                {cacheStats.sizeInMB.toFixed(1)} MB
              </Badge>
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: FLEX_SPACE_BETWEEN,
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <Text size="xs" c="dimmed">
                  Storage Usage
                </Text>
                <Text size="xs" c="dimmed">
                  {cacheStats.sizeInMB.toFixed(1)} / {cacheStats.maxSizeInMB} MB
                </Text>
              </div>
              <Progress
                value={(cacheStats.sizeInMB / cacheStats.maxSizeInMB) * 100}
                size="sm"
                color="blue"
              />
            </div>
          </div>

          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              leftSection={<IconRefresh size={12} />}
              onClick={handleClearCache}
              color="orange"
            >
              Clear Cache
            </Button>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconDownload size={12} />}
              onClick={handleExportCache}
            >
              Export
            </Button>
          </Group>
        </div>
      </CollapsibleSection>

      {/* Traversal Settings */}
      <CollapsibleSection
        title="Traversal Settings"
        icon={<IconRefresh size={14} />}
        defaultExpanded={true}
        storageKey="cache-settings-traversal"
      >
        <div style={{ marginTop: "12px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: FLEX_SPACE_BETWEEN,
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <Text size="sm" fw={500}>
                Show Cached Nodes
              </Text>
              <Text size="xs" c="dimmed">
                Display all nodes available in cache
              </Text>
            </div>
            <Switch
              checked={showAllCachedNodes}
              onChange={handleToggleCachedNodes}
              size="sm"
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: FLEX_SPACE_BETWEEN,
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div style={{ flex: 1, marginRight: "16px" }}>
              <Text size="sm" fw={500}>
                Traversal Depth
              </Text>
              <Text size="xs" c="dimmed">
                Maximum depth for graph expansion
              </Text>
            </div>
            <NumberInput
              value={traversalDepth}
              onChange={handleTraversalDepthChange}
              min={1}
              max={10}
              size="sm"
              style={{ width: "80px" }}
              allowNegative={false}
              allowDecimal={false}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Graph Management */}
      <CollapsibleSection
        title="Graph Management"
        icon={<IconTrash size={14} />}
        defaultExpanded={false}
        storageKey="cache-settings-management"
      >
        <div style={{ marginTop: "12px" }}>
          <div
            style={{
              padding: "12px",
              backgroundColor: colors.background.secondary,
              borderRadius: "8px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: FLEX_SPACE_BETWEEN,
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <Text size="sm" c="dimmed">
                Current Graph
              </Text>
              <div>
                <Badge size="xs" variant="light" style={{ marginRight: "4px" }}>
                  {totalNodeCount} nodes
                </Badge>
                <Badge size="xs" variant="light">
                  {totalEdgeCount} edges
                </Badge>
              </div>
            </div>
          </div>

          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              leftSection={<IconTrash size={12} />}
              onClick={() => {
                setClearModalOpen(true);
              }}
              color="red"
              disabled={totalNodeCount === 0}
            >
              Clear Graph
            </Button>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconUpload size={12} />}
              color="green"
            >
              Import
            </Button>
          </Group>
        </div>
      </CollapsibleSection>

      {/* Clear Confirmation Modal */}
      <Modal
        opened={clearModalOpen}
        onClose={() => {
          setClearModalOpen(false);
        }}
        title="Clear Graph"
        centered
      >
        <Text size="sm" style={{ marginBottom: "16px" }}>
          Are you sure you want to clear the current graph? This will remove all{" "}
          {totalNodeCount} nodes and {totalEdgeCount} edges.
        </Text>
        <Text size="xs" c="dimmed" style={{ marginBottom: "20px" }}>
          This action cannot be undone, but the data will remain in cache.
        </Text>
        <Group gap="xs" justify="flex-end">
          <Button
            variant="light"
            onClick={() => {
              setClearModalOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button color="red" onClick={handleClearGraph}>
            Clear Graph
          </Button>
        </Group>
      </Modal>
    </div>
  );
};
