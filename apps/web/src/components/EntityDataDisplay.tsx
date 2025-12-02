/**
 * EntityDataDisplay Component
 *
 * Displays all entity data in a structured, readable format using native Mantine components.
 * Handles nested objects, arrays, and various data types.
 * Renders ALL fields from the API response.
 */

import { VersionComparisonIndicator } from "@bibgraph/ui";
import { isDataVersionSelectorVisible } from "@bibgraph/utils";
import {
  Anchor,
  Badge,
  Code,
  Text,
  Card,
  CardSection,
  Stack,
  Flex,
  Group,
  Table,
  TableTbody,
  TableTr,
  TableTd,
  Title,
  Box
} from "@mantine/core";
import {
  IconExternalLink,
  IconLink,
  IconCheck,
  IconX,
  IconInfoCircle,
  IconKey,
  IconChartBar,
  IconNetwork,
  IconCalendar,
  IconWorld,
  IconClipboard,
  IconFile,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import React, { useLayoutEffect, useRef, useState } from "react";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { useVersionComparison } from "@/hooks/use-version-comparison";
import { convertOpenAlexToInternalLink, isOpenAlexId } from "@/utils/openalex-link-conversion";


interface ThemeColors {
  background: {
    primary: string;
  };
  border: {
    secondary: string;
  };
}

type LayoutMode = "stacked" | "tiled";

/** Section priority for tiled layout (lower = renders first = top-left) */
const SECTION_PRIORITY: Record<string, number> = {
  Identifiers: 1,
  "Basic Information": 2,
  Metrics: 3,
  Dates: 4,
  "Locations & Geo": 5,
  Relationships: 6,
  Other: 7,
};

/** Grid layout configuration */
const GRID_CONFIG = {
  /** Minimum column width in pixels */
  MIN_COLUMN_WIDTH: 350,
  /** Row height unit in pixels - items snap to multiples of this */
  ROW_UNIT: 24,
  /** Gap between items in pixels */
  GAP: 16,
} as const;

/** Grid placement for an item */
interface GridPlacement {
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
}

/**
 * CSS Grid-based layout with explicit cell placement:
 * - Uses native CSS Grid for perfect alignment
 * - Measures items to determine spans
 * - Places items using grid-column/grid-row
 * - Nested grids inherit the same row unit for alignment
 */
interface UnitGridProps {
  children: React.ReactNode[];
  /** Minimum column width in pixels */
  minColumnWidth?: number;
  /** Row height unit in pixels */
  rowUnit?: number;
  /** Gap between items in pixels */
  gap?: number;
}

function UnitGrid({
  children,
  minColumnWidth = GRID_CONFIG.MIN_COLUMN_WIDTH,
  rowUnit = GRID_CONFIG.ROW_UNIT,
  gap = GRID_CONFIG.GAP,
}: UnitGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numColumns, setNumColumns] = useState(1);
  const [placements, setPlacements] = useState<GridPlacement[]>([]);
  const rafIdRef = useRef<number>(0);
  const lastContainerWidth = useRef<number>(0);

  const childArray = React.Children.toArray(children);

  // Calculate placements
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    if (containerWidth === 0) return;

    // Skip if width hasn't changed significantly
    if (Math.abs(containerWidth - lastContainerWidth.current) < 1 && placements.length === childArray.length) {
      return;
    }
    lastContainerWidth.current = containerWidth;

    // Calculate grid parameters
    const cols = Math.max(1, Math.floor((containerWidth + gap) / (minColumnWidth + gap)));
    setNumColumns(cols);

    // Measure items from the grid itself (they're rendered with grid-column: span 1 initially)
    const gridItems = container.children;
    const measurements: { index: number; colSpan: number; rowSpan: number; area: number }[] = [];

    const columnWidth = (containerWidth - (cols - 1) * gap) / cols;

    for (let i = 0; i < gridItems.length; i++) {
      const item = gridItems[i] as HTMLElement;
      const naturalWidth = item.scrollWidth;
      const naturalHeight = item.scrollHeight;

      const colSpan = Math.min(cols, Math.max(1, Math.ceil(naturalWidth / columnWidth)));
      const rowSpan = Math.max(1, Math.ceil(naturalHeight / rowUnit));

      measurements.push({ index: i, colSpan, rowSpan, area: colSpan * rowSpan });
    }

    // First Fit Decreasing
    const sorted = [...measurements].sort((a, b) => b.area - a.area);

    // 2D occupancy grid
    const occupancy: boolean[][] = [];
    const isOccupied = (col: number, row: number) => occupancy[row]?.[col] ?? false;
    const occupy = (col: number, row: number) => {
      if (!occupancy[row]) occupancy[row] = new Array(cols).fill(false);
      occupancy[row][col] = true;
    };

    const canPlace = (col: number, row: number, colSpan: number, rowSpan: number) => {
      if (col + colSpan > cols) return false;
      for (let r = row; r < row + rowSpan; r++) {
        for (let c = col; c < col + colSpan; c++) {
          if (isOccupied(c, r)) return false;
        }
      }
      return true;
    };

    const newPlacements: GridPlacement[] = new Array(childArray.length);
    let maxRow = 0;

    for (const item of sorted) {
      const { index, colSpan, rowSpan } = item;
      let placed = false;

      for (let row = 0; !placed && row < 1000; row++) {
        for (let col = 0; col <= cols - colSpan; col++) {
          if (canPlace(col, row, colSpan, rowSpan)) {
            for (let r = row; r < row + rowSpan; r++) {
              for (let c = col; c < col + colSpan; c++) {
                occupy(c, r);
              }
            }
            // CSS Grid uses 1-based indices
            newPlacements[index] = { colStart: col + 1, colSpan, rowStart: row + 1, rowSpan };
            maxRow = Math.max(maxRow, row + rowSpan);
            placed = true;
            break;
          }
        }
      }

      if (!placed) {
        newPlacements[index] = { colStart: 1, colSpan, rowStart: maxRow + 1, rowSpan };
        maxRow += rowSpan;
      }
    }

    setPlacements(newPlacements);
  }, [childArray.length, gap, minColumnWidth, rowUnit, placements.length]);

  // Observe container for resize
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        // Force recalculation by resetting placements
        setPlacements([]);
      });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
        gridAutoRows: rowUnit,
        gap,
        width: "100%",
      }}
    >
      {childArray.map((child, index) => {
        const placement = placements[index];
        return (
          <Box
            key={index}
            style={{
              gridColumn: placement ? `${placement.colStart} / span ${placement.colSpan}` : "span 1",
              gridRow: placement ? `${placement.rowStart} / span ${placement.rowSpan}` : "span 1",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {child}
          </Box>
        );
      })}
    </Box>
  );
}


interface EntityDataDisplayProps {
  data: Record<string, unknown>;
  title?: string;
  /** Layout mode: "stacked" (default) or "tiled" for grid layout */
  layout?: LayoutMode;
}

/**
 * Recursively renders data in a structured format
 */
function renderValue(value: unknown, depth: number = 0, colors?: ThemeColors): React.ReactNode {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return <Text c="dimmed" fs="italic" size="sm">null</Text>;
  }

  // Handle booleans
  if (typeof value === "boolean") {
    return (
      <Badge
        color={value ? "green" : "red"}
        variant="light"
        size="sm"
        leftSection={value ? <IconCheck size={12} /> : <IconX size={12} />}
      >
        {value.toString()}
      </Badge>
    );
  }

  // Handle numbers
  if (typeof value === "number") {
    return (
      <Code
        variant="light"
        color="blue"
        ff="monospace"
        fw={600}
      >
        {value.toLocaleString()}
      </Code>
    );
  }

  // Handle strings
  if (typeof value === "string") {
    // Check if it's an OpenAlex URL or ID
    const converted = convertOpenAlexToInternalLink(value);

    if (converted.isOpenAlexLink) {
      // Internal OpenAlex link
      return (
        <Group gap="xs">
        <Anchor
          component={Link}
          to={converted.internalPath}
          c="blue"
          display="inline-flex"
          style={{ wordBreak: "break-word" }}
        >
          <IconLink size={16} />
          {value}
        </Anchor>
      </Group>
      );
    }

    // Handle other URLs (external links)
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <Group gap="xs">
        <Anchor
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          display="inline-flex"
          style={{ wordBreak: "break-word" }}
        >
          <IconExternalLink size={16} />
          {value}
        </Anchor>
      </Group>
      );
    }

    // Check if it's just an OpenAlex ID (without URL)
    if (isOpenAlexId(value)) {
      const idConverted = convertOpenAlexToInternalLink(value);
      return (
        <Group gap="xs">
        <Anchor
          component={Link}
          to={idConverted.internalPath}
          c="blue"
          display="inline-flex"
          style={{ wordBreak: "break-word" }}
        >
          <IconLink size={16} />
          {value}
        </Anchor>
      </Group>
      );
    }

    return <Text>{value}</Text>;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Text c="dimmed" fs="italic" size="sm">[ ]</Text>;
    }

    // For primitive arrays, show inline
    if (value.every(item => typeof item !== "object" || item === null)) {
      return (
        <Flex wrap="wrap" gap="xs">
          {value.map((item, index) => (
            <Badge
              key={index}
              variant="light"
              color="gray"
              size="sm"
            >
              {renderValue(item, depth, colors)}
            </Badge>
          ))}
        </Flex>
      );
    }

    // For object arrays, show each item in auto-sizing grid
    return (
      <Box mt="xs">
        <UnitGrid minColumnWidth={120} gap={8}>
          {value.map((item, index) => (
            <Card
              key={index}
              style={{ border: "1px solid var(--mantine-color-gray-3)" }}
              p="sm"
              bg={colors?.background.primary}
            >
              <Group gap="sm" align="flex-start">
                <Badge circle size="md" color="blue">
                  {index + 1}
                </Badge>
                <Box miw={0} style={{ flex: 1 }}>
                  {renderValue(item, depth + 1, colors)}
                </Box>
              </Group>
            </Card>
          ))}
        </UnitGrid>
      </Box>
    );
  }

  // Handle objects
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj);

    if (entries.length === 0) {
      return <Text c="dimmed" fs="italic" size="sm">{"{ }"}</Text>;
    }

    return (
      <Table>
        <TableTbody>
          {entries.map(([key, val]) => (
            <TableTr key={key}>
              <TableTd w={150} ta="left" style={{ verticalAlign: "top" }}>
                <Text size="sm" fw={600} c="blue.7">
                  {key}
                </Text>
              </TableTd>
              <TableTd>
                {renderValue(val, depth + 1, colors)}
              </TableTd>
            </TableTr>
          ))}
        </TableTbody>
      </Table>
    );
  }

  // Fallback for unknown types
  return <Text c="dimmed" fs="italic">{String(value)}</Text>;
}

/**
 * Groups fields into logical sections for better organization
 */
function groupFields(data: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const groups: Record<string, Record<string, unknown>> = {
    "Basic Information": {},
    "Identifiers": {},
    "Metrics": {},
    "Relationships": {},
    "Dates": {},
    "Locations & Geo": {},
    "Other": {},
  };

  const identifierKeys = ["id", "ids", "doi", "orcid", "issn", "ror", "mag", "openalex_id", "pmid", "pmcid"];
  const metricKeys = ["cited_by_count", "works_count", "h_index", "i10_index", "counts_by_year", "summary_stats", "fwci", "citation_normalized_percentile", "cited_by_percentile_year"];
  const relationshipKeys = ["authorships", "institutions", "concepts", "topics", "keywords", "grants", "sustainable_development_goals", "mesh", "affiliations", "last_known_institutions", "primary_location", "locations", "best_oa_location", "alternate_host_venues"];
  const dateKeys = ["created_date", "updated_date", "publication_date", "publication_year"];
  const geoKeys = ["country_code", "countries_distinct_count", "geo", "latitude", "longitude"];
  const basicKeys = ["display_name", "title", "type", "description", "homepage_url", "image_url", "thumbnail_url", "is_oa", "oa_status", "has_fulltext"];

  Object.entries(data).forEach(([key, value]) => {
    if (identifierKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Identifiers"][key] = value;
    } else if (metricKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Metrics"][key] = value;
    } else if (relationshipKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Relationships"][key] = value;
    } else if (dateKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Dates"][key] = value;
    } else if (geoKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Locations & Geo"][key] = value;
    } else if (basicKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Basic Information"][key] = value;
    } else {
      groups["Other"][key] = value;
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(groupName => {
    if (Object.keys(groups[groupName]).length === 0) {
      delete groups[groupName];
    }
  });

  return groups;
}

// Section icons mapping
const sectionIcons: Record<string, React.ReactNode> = {
  "Basic Information": <IconInfoCircle size={20} />,
  "Identifiers": <IconKey size={20} />,
  "Metrics": <IconChartBar size={20} />,
  "Relationships": <IconNetwork size={20} />,
  "Dates": <IconCalendar size={20} />,
  "Locations & Geo": <IconWorld size={20} />,
  "Other": <IconClipboard size={20} />,
};

export function EntityDataDisplay({ data, title, layout = "stacked" }: EntityDataDisplayProps) {
  const { colors } = useThemeColors();
  const groups = groupFields(data);

  // Extract work ID if this is a Work entity
  const workId = typeof data.id === 'string' && data.id.startsWith('W') ? data.id : undefined;

  // Only fetch version comparison for Works during November transition period
  const shouldShowComparison = Boolean(workId && isDataVersionSelectorVisible());
  const { comparison } = useVersionComparison(workId, shouldShowComparison);

  // Sort sections by priority for tiled layout (Identifiers + Basic Info first)
  const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
    const priorityA = SECTION_PRIORITY[a] ?? 99;
    const priorityB = SECTION_PRIORITY[b] ?? 99;
    return priorityA - priorityB;
  });

  // Render a single section card
  const renderSectionCard = ([groupName, groupData]: [string, Record<string, unknown>]) => (
    <Card key={groupName} style={{ border: "1px solid var(--mantine-color-gray-3)" }} shadow="sm">
      <CardSection
        p="md"
        bg={colors?.background.primary}
        style={{ borderBottom: `1px solid ${colors?.border.secondary}` }}
      >
        <Group gap="sm" justify="space-between">
          <Group gap="sm">
            <Box c="blue.6">
              {sectionIcons[groupName] || <IconFile size={20} />}
            </Box>
            <Text size="xl" fw={600}>
              {groupName}
            </Text>
          </Group>
          <Badge
            variant="light"
            color="gray"
            size="sm"
          >
            {Object.keys(groupData).length} {Object.keys(groupData).length === 1 ? "field" : "fields"}
          </Badge>
        </Group>
      </CardSection>

      <CardSection p="lg">
        <UnitGrid minColumnWidth={150} gap={12}>
          {Object.entries(groupData).map(([key, value]) => (
            <Card
              key={key}
              style={{ border: "1px solid var(--mantine-color-gray-3)" }}
              p="md"
              bg={colors?.background.primary}
            >
              <Stack gap="xs">
                <Text size="md" fw={600} c="blue.6">
                  {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <Box mt={2}>
                  {renderValue(value, 0, colors)}
                </Box>
              </Stack>
            </Card>
          ))}
        </UnitGrid>
      </CardSection>
    </Card>
  );

  return (
    <Box w="100%">
      <Stack gap="xl">
        {title && (
          <Title order={1} size="h1" fw={700} mb="md">
            {title}
          </Title>
        )}

        {/* Version Comparison Indicator - Only for Works during November 2025 transition */}
        {shouldShowComparison && comparison && (
          <VersionComparisonIndicator
            currentVersion={comparison.currentVersion}
            referencesCount={comparison.referencesCount}
            locationsCount={comparison.locationsCount}
          />
        )}

        {/* Tiled layout uses 2D bin-packing masonry grid */}
        {layout === "tiled" ? (
          <UnitGrid>
            {sortedEntries.map(([groupName, groupData]) => (
              <Box key={groupName}>
                {renderSectionCard([groupName, groupData])}
              </Box>
            ))}
          </UnitGrid>
        ) : (
          // Stacked layout uses vertical Stack
          sortedEntries.map(renderSectionCard)
        )}
      </Stack>
    </Box>
  );
}
