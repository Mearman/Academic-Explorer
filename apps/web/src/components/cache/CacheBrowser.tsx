import { BaseTable } from "@/components/tables/BaseTable";
import {
  cacheBrowserService,
  logger,
  type CacheBrowserEntityType,
  type CacheBrowserFilters,
  type CacheBrowserOptions,
  type CacheBrowserStats,
  type CachedEntityMetadata,
} from "@academic-explorer/utils";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  FileInput,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconDownload,
  IconExternalLink,
  IconFileExport,
  IconFileImport,
  IconFilter,
  IconInfoCircle,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { type ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";

interface CacheBrowserState {
  entities: CachedEntityMetadata[];
  stats: CacheBrowserStats | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalMatching: number;
}

interface CacheBrowserProps {
  className?: string;
}

const ENTITY_TYPE_OPTIONS = [
  { value: "works", label: "Works" },
  { value: "authors", label: "Authors" },
  { value: "sources", label: "Sources" },
  { value: "institutions", label: "Institutions" },
  { value: "topics", label: "Topics" },
  { value: "publishers", label: "Publishers" },
  { value: "funders", label: "Funders" },
  { value: "keywords", label: "Keywords" },
  { value: "concepts", label: "Concepts" },
];

const STORAGE_LOCATION_OPTIONS = [
  { value: "indexeddb", label: "IndexedDB" },
  { value: "localstorage", label: "LocalStorage" },
  { value: "repository", label: "Repository" },
  { value: "memory", label: "Memory" },
];

const SORT_OPTIONS = [
  { value: "timestamp", label: "Cache Date" },
  { value: "type", label: "Entity Type" },
  { value: "label", label: "Name" },
  { value: "size", label: "Size" },
];

export function CacheBrowser({ className }: CacheBrowserProps) {
  const navigate = useNavigate();

  const [state, setState] = useState<CacheBrowserState>({
    entities: [],
    stats: {
      totalEntities: 0,
      entitiesByType: {
        works: 0,
        authors: 0,
        sources: 0,
        institutions: 0,
        topics: 0,
        publishers: 0,
        funders: 0,
        keywords: 0,
        concepts: 0,
        autocomplete: 0,
      },
      entitiesByStorage: {},
      totalCacheSize: 0,
      oldestEntry: 0,
      newestEntry: 0,
    },
    isLoading: false,
    error: null,
    hasMore: false,
    totalMatching: 0,
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "works",
    "authors",
  ]);
  const [selectedStorage, setSelectedStorage] = useState<string[]>([
    "indexeddb",
    "localstorage",
  ]);
  const [sortBy, setSortBy] =
    useState<CacheBrowserOptions["sortBy"]>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrrentPage] = useState(0);

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minSize, setMinSize] = useState<number | undefined>();
  const [maxSize, setMaxSize] = useState<number | undefined>();

  // Export/Import state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const filters: Partial<CacheBrowserFilters> = useMemo(
    () => ({
      searchQuery,
      entityTypes: new Set(selectedTypes as CacheBrowserEntityType[]),
      storageLocations: new Set(selectedStorage),
      sizeRange:
        minSize !== undefined || maxSize !== undefined
          ? {
              min: minSize || 0,
              max: maxSize || Number.MAX_SAFE_INTEGER,
            }
          : undefined,
    }),
    [searchQuery, selectedTypes, selectedStorage, minSize, maxSize],
  );

  const options: Partial<CacheBrowserOptions> = useMemo(
    () => ({
      sortBy,
      sortDirection,
      limit: pageSize,
      offset: currentPage * pageSize,
      includeBasicInfo: true,
      includeRepositoryData: true,
    }),
    [sortBy, sortDirection, pageSize, currentPage],
  );

  const loadCachedEntities = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      logger.debug("CACHE_BROWSER_LOGGER_NAME", "Loading cached entities", {
        filters,
        options,
      });

      const result = await cacheBrowserService.browse(filters, options);

      if (!result) {
        logger.error(
          "CACHE_BROWSER_LOGGER_NAME",
          "No result returned from browse",
          {
            filters,
            options,
          },
        );
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "No result returned from cache browser service",
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        entities: result.entities,
        stats: result.stats,
        hasMore: result.hasMore,
        totalMatching: result.totalMatching,
        isLoading: false,
      }));

      logger.debug("CACHE_BROWSER_LOGGER_NAME", "Loaded cached entities", {
        count: result.entities.length,
        total: result.totalMatching,
      });
    } catch (error) {
      logger.error(
        "CACHE_BROWSER_LOGGER_NAME",
        "Failed to load cached entities",
        {
          error,
        },
      );
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Failed to load cached entities: ${String(error)}`,
      }));
    }
  }, [filters, options]);

  const clearCache = async () => {
    try {
      logger.debug("CACHE_BROWSER_LOGGER_NAME", "Clearing cache with filters", {
        filters,
      });

      const clearedCount = await cacheBrowserService.clearCache(filters);

      logger.debug("CACHE_BROWSER_LOGGER_NAME", "Cache cleared", {
        clearedCount,
      });

      // Reload entities after clearing
      await loadCachedEntities();
    } catch (error) {
      logger.error("CACHE_BROWSER_LOGGER_NAME", "Failed to clear cache", {
        error,
      });
      setState((prev) => ({
        ...prev,
        error: `Failed to clear cache: ${String(error)}`,
      }));
    }
  };

  const exportToJSON = async () => {
    setIsExporting(true);
    try {
      logger.debug("CACHE_BROWSER_LOGGER_NAME", "Exporting cache data to JSON");

      // Get all entities without pagination for export
      const exportOptions = { ...options, limit: undefined, offset: undefined };
      const result = await cacheBrowserService.browse(filters, exportOptions);

      const exportData = {
        exportTimestamp: new Date().toISOString(),
        totalEntities: result.entities.length,
        stats: result.stats,
        filters,
        entities: result.entities,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cache-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logger.debug("CACHE_BROWSER_LOGGER_NAME", "JSON export completed", {
        count: result.entities.length,
      });
    } catch (error) {
      logger.error("CACHE_BROWSER_LOGGER_NAME", "Failed to export to JSON", {
        error,
      });
      setState((prev) => ({
        ...prev,
        error: `Failed to export to JSON: ${String(error)}`,
      }));
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      logger.debug("CACHE_BROWSER_LOGGER_NAME", "Exporting cache data to CSV");

      // Get all entities without pagination for export
      const exportOptions = { ...options, limit: undefined, offset: undefined };
      const result = await cacheBrowserService.browse(filters, exportOptions);

      // Convert entities to flat structure for CSV
      const csvData = result.entities.map((entity) => ({
        id: entity.id,
        type: entity.type,
        label: entity.label,
        storageLocation: entity.storageLocation,
        dataSize: entity.dataSize,
        cacheDatetime: new Date(entity.cacheTimestamp).toISOString(),
        citationCount: entity.basicInfo?.citationCount || "",
        worksCount: entity.basicInfo?.worksCount || "",
        url: entity.basicInfo?.url || "",
      }));

      // Generate CSV headers
      const headers = [
        "ID",
        "Type",
        "Label",
        "Storage Location",
        "Data Size (bytes)",
        "Cache Date",
        "Citation Count",
        "Works Count",
        "URL",
      ];

      // Convert to CSV string
      const csvContent = [
        headers.join(","),
        ...csvData.map((row) =>
          [
            row.id,
            row.type,
            `"${row.label.replace(/"/g, '""')}"`, // Escape quotes in labels
            row.storageLocation,
            row.dataSize,
            row.cacheDatetime,
            row.citationCount,
            row.worksCount,
            `"${row.url.replace(/"/g, '""')}"`, // Escape quotes in URLs
          ].join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cache-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logger.debug("CACHE_BROWSER_LOGGER_NAME", "CSV export completed", {
        count: result.entities.length,
      });
    } catch (error) {
      logger.error("CACHE_BROWSER_LOGGER_NAME", "Failed to export to CSV", {
        error,
      });
      setState((prev) => ({
        ...prev,
        error: `Failed to export to CSV: ${String(error)}`,
      }));
    } finally {
      setIsExporting(false);
    }
  };

  const importCacheData = async () => {
    if (!importFile) return;

    setIsImporting(true);
    try {
      logger.debug("CACHE_BROWSER_LOGGER_NAME", "Importing cache data", {
        fileName: importFile.name,
      });

      const text = await importFile.text();
      const importData = JSON.parse(text);

      // Validate the import data structure
      if (!importData.entities || !Array.isArray(importData.entities)) {
        throw new Error(
          "Invalid import file: missing or invalid entities array",
        );
      }

      // Import entities using the cache browser service
      let importedCount = 0;
      for (const entity of importData.entities) {
        try {
          // Here we would need a method to add entities back to cache
          // For now, we'll log this as the cacheBrowserService might not have an import method
          logger.debug("CACHE_BROWSER_LOGGER_NAME", "Would import entity", {
            entity: entity.id,
          });
          importedCount++;
        } catch (error) {
          logger.warn("CACHE_BROWSER_LOGGER_NAME", "Failed to import entity", {
            entity: entity.id,
            error,
          });
        }
      }

      logger.debug("CACHE_BROWSER_LOGGER_NAME", "Import completed", {
        total: importData.entities.length,
        imported: importedCount,
      });

      // Note: Since we don't have a direct import method in cacheBrowserService,
      // this is a placeholder implementation. In a real scenario, you'd need to
      // implement the actual cache restoration logic.
      setState((prev) => ({
        ...prev,
        error: `Import functionality is not yet fully implemented. Would import ${importedCount} entities.`,
      }));

      // Reset import file
      setImportFile(null);

      // Reload entities
      await loadCachedEntities();
    } catch (error) {
      logger.error("CACHE_BROWSER_LOGGER_NAME", "Failed to import cache data", {
        error,
      });
      setState((prev) => ({
        ...prev,
        error: `Failed to import cache data: ${String(error)}`,
      }));
    } finally {
      setIsImporting(false);
    }
  };

  // Load entities on filter/option changes
  useEffect(() => {
    void loadCachedEntities();
  }, [filters, options, loadCachedEntities]);

  // Reset page when filters change
  useEffect(() => {
    setCurrrentPage(0);
  }, [searchQuery, selectedTypes, selectedStorage, minSize, maxSize]);

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const handleEntityClick = (entity: CachedEntityMetadata) => {
    // Navigate to entity detail page
    if (entity.type === "authors" && entity.id.startsWith("A")) {
      void navigate({ to: `/authors/${entity.id}` });
    } else if (entity.type === "works" && entity.id.startsWith("W")) {
      void navigate({ to: `/works/${entity.id}` });
    } else if (entity.type === "sources" && entity.id.startsWith("S")) {
      void navigate({ to: `/sources/${entity.id}` });
    } else if (entity.type === "institutions" && entity.id.startsWith("I")) {
      void navigate({ to: `/institutions/${entity.id}` });
    } else if (entity.type === "topics" && entity.id.startsWith("T")) {
      void navigate({ to: `/topics/${entity.id}` });
    } else {
      logger.debug("CACHE_BROWSER_LOGGER_NAME", "No route defined for entity", {
        entity,
      });
    }
  };

  const columns: ColumnDef<CachedEntityMetadata>[] = useMemo(
    () => [
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ getValue }) => (
          <Badge variant="light" size="sm">
            {String(getValue())}
          </Badge>
        ),
      },
      {
        accessorKey: "label",
        header: "Name",
        cell: ({ row }) => (
          <Group gap="xs">
            <Text size="sm" fw={500}>
              {row.original.label}
            </Text>
            {row.original.basicInfo?.url && (
              <ActionIcon
                size="xs"
                variant="subtle"
                onClick={(e) => {
                  e.stopPropagation();
                  if (row.original.basicInfo?.url) {
                    window.open(row.original.basicInfo.url, "_blank");
                  }
                }}
              >
                <IconExternalLink size={12} />
              </ActionIcon>
            )}
          </Group>
        ),
      },
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ getValue }) => (
          <Text size="xs" c="dimmed" ff="monospace">
            {String(getValue())}
          </Text>
        ),
      },
      {
        accessorKey: "storageLocation",
        header: "Storage",
        cell: ({ getValue }) => (
          <Badge variant="outline" size="xs">
            {String(getValue())}
          </Badge>
        ),
      },
      {
        accessorKey: "dataSize",
        header: "Size",
        cell: ({ getValue }) => (
          <Text size="xs">{formatSize(Number(getValue()))}</Text>
        ),
      },
      {
        accessorKey: "cacheTimestamp",
        header: "Cached",
        cell: ({ getValue }) => (
          <Text size="xs" c="dimmed">
            {formatDate(Number(getValue()))}
          </Text>
        ),
      },
      {
        accessorKey: "basicInfo",
        header: "Info",
        cell: ({ row }) => {
          const info = row.original.basicInfo;
          if (!info) return null;

          return (
            <Stack gap={1}>
              {info.citationCount !== undefined && (
                <Text size="xs" c="dimmed">
                  Citations: {info.citationCount.toLocaleString()}
                </Text>
              )}
              {info.worksCount !== undefined && (
                <Text size="xs" c="dimmed">
                  Works: {info.worksCount.toLocaleString()}
                </Text>
              )}
            </Stack>
          );
        },
      },
    ],
    [],
  );

  return (
    <Box className={className}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Text size="xl" fw={600}>
              Cache Browser
            </Text>
            <Text size="sm" c="dimmed">
              Browse and manage cached OpenAlex entities
            </Text>
          </div>

          <Group gap="xs">
            {/* Export/Import Controls */}
            <Group gap="xs">
              <Button
                leftSection={<IconDownload size={16} />}
                variant="light"
                color="blue"
                onClick={() => {
                  void exportToJSON();
                }}
                loading={isExporting}
                disabled={state.isLoading || state.entities.length === 0}
              >
                Export JSON
              </Button>

              <Button
                leftSection={<IconFileExport size={16} />}
                variant="light"
                color="green"
                onClick={() => {
                  void exportToCSV();
                }}
                loading={isExporting}
                disabled={state.isLoading || state.entities.length === 0}
              >
                Export CSV
              </Button>

              <FileInput
                placeholder="Select JSON file"
                leftSection={<IconFileImport size={16} />}
                value={importFile}
                onChange={setImportFile}
                accept=".json"
                w={200}
                clearable
              />

              <Button
                leftSection={<IconUpload size={16} />}
                variant="light"
                color="violet"
                onClick={() => {
                  void importCacheData();
                }}
                loading={isImporting}
                disabled={!importFile}
              >
                Import
              </Button>
            </Group>

            {/* Existing Controls */}
            <Tooltip label="Refresh cache data">
              <ActionIcon
                onClick={() => {
                  void loadCachedEntities();
                }}
                loading={state.isLoading}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>

            <Button
              leftSection={<IconTrash size={16} />}
              variant="light"
              color="red"
              onClick={() => {
                void clearCache();
              }}
              disabled={state.isLoading || state.entities.length === 0}
            >
              Clear Filtered
            </Button>
          </Group>
        </Group>

        {/* Statistics */}
        {state.stats && (
          <Card p="md" withBorder>
            <Group gap="xl">
              <div>
                <Text size="lg" fw={600}>
                  {state.stats.totalEntities.toLocaleString()}
                </Text>
                <Text size="xs" c="dimmed">
                  Total Entities
                </Text>
              </div>

              <div>
                <Text size="lg" fw={600}>
                  {formatSize(state.stats.totalCacheSize)}
                </Text>
                <Text size="xs" c="dimmed">
                  Total Size
                </Text>
              </div>

              <div>
                <Text size="lg" fw={600}>
                  {Object.keys(state.stats.entitiesByStorage).length}
                </Text>
                <Text size="xs" c="dimmed">
                  Storage Types
                </Text>
              </div>

              <div>
                <Text size="lg" fw={600}>
                  {state.totalMatching.toLocaleString()}
                </Text>
                <Text size="xs" c="dimmed">
                  Matching Filters
                </Text>
              </div>
            </Group>
          </Card>
        )}

        {/* Filters */}
        <Card p="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={500}>Filters</Text>
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconFilter size={14} />}
                onClick={() => {
                  setShowAdvancedFilters(!showAdvancedFilters);
                }}
              >
                Advanced
              </Button>
            </Group>

            <Group grow>
              <TextInput
                placeholder="Search entities..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
              />

              <MultiSelect
                placeholder="Entity types"
                data={ENTITY_TYPE_OPTIONS}
                value={selectedTypes}
                onChange={setSelectedTypes}
                clearable
              />

              <MultiSelect
                placeholder="Storage locations"
                data={STORAGE_LOCATION_OPTIONS}
                value={selectedStorage}
                onChange={setSelectedStorage}
                clearable
              />
            </Group>

            <Group>
              <Select
                label="Sort by"
                data={SORT_OPTIONS}
                value={sortBy}
                onChange={(value) => {
                  setSortBy(value as CacheBrowserOptions["sortBy"]);
                }}
                w={150}
              />

              <Select
                label="Direction"
                data={[
                  { value: "desc", label: "Descending" },
                  { value: "asc", label: "Ascending" },
                ]}
                value={sortDirection}
                onChange={(value) => {
                  setSortDirection(value as "asc" | "desc");
                }}
                w={120}
              />

              <Select
                label="Page size"
                data={[
                  { value: "25", label: "25" },
                  { value: "50", label: "50" },
                  { value: "100", label: "100" },
                  { value: "200", label: "200" },
                ]}
                value={pageSize.toString()}
                onChange={(value) => {
                  setPageSize(Number(value) || 50);
                }}
                w={100}
              />
            </Group>

            {showAdvancedFilters && (
              <Group>
                <NumberInput
                  label="Min size (bytes)"
                  placeholder="0"
                  value={minSize}
                  onChange={(value) => {
                    setMinSize(Number(value) || undefined);
                  }}
                  w={150}
                />

                <NumberInput
                  label="Max size (bytes)"
                  placeholder="No limit"
                  value={maxSize}
                  onChange={(value) => {
                    setMaxSize(Number(value) || undefined);
                  }}
                  w={150}
                />
              </Group>
            )}
          </Stack>
        </Card>

        {/* Error display */}
        {state.error && (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="red"
            title="Error"
            withCloseButton
            onClose={() => {
              setState((prev) => ({ ...prev, error: null }));
            }}
          >
            {state.error}
          </Alert>
        )}

        {/* Results table */}
        <Card p="md" withBorder>
          <BaseTable
            data={state.entities}
            columns={columns}
            isLoading={state.isLoading}
            pageSize={pageSize}
            searchable={false} // We handle search ourselves
            onRowClick={handleEntityClick}
          />

          {state.hasMore && (
            <Group justify="center" mt="md">
              <Button
                variant="light"
                onClick={() => {
                  setCurrrentPage((prev) => prev + 1);
                }}
                loading={state.isLoading}
              >
                Load More
              </Button>
            </Group>
          )}
        </Card>
      </Stack>
    </Box>
  );
}
