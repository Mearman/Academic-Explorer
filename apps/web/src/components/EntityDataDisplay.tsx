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

/** Masonry layout configuration */
const MASONRY_CONFIG = {
  /** Minimum column width */
  MIN_COLUMN_WIDTH: 350,
  /** Gap between items in pixels */
  GAP: 24,
} as const;

/** Measured item data for bin-packing */
interface MeasuredItem {
  index: number;
  naturalWidth: number;
  naturalHeight: number;
  columnSpan: number;
  area: number;
}

/** Position data for placed items */
interface ItemPosition {
  x: number;
  y: number;
  width: number;
}

/**
 * 2D Bin-packing masonry grid using First Fit Decreasing algorithm:
 * - Measures natural content sizes (both width and height)
 * - Sorts items by area (largest first) for optimal packing
 * - Uses skyline algorithm to find best position for each item
 * - Items can span multiple columns based on natural width
 */
interface MasonryGridProps {
  children: React.ReactNode[];
  /** Minimum column unit width in pixels (default: 350) */
  minColumnWidth?: number;
  /** Gap between items in pixels (default: 24) */
  gap?: number;
}

/** Layout phases for the two-pass measurement approach */
type LayoutPhase = "measuring" | "placing" | "ready";

function MasonryGrid({
  children,
  minColumnWidth = MASONRY_CONFIG.MIN_COLUMN_WIDTH,
  gap = MASONRY_CONFIG.GAP,
}: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureContainerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<LayoutPhase>("measuring");
  const [layout, setLayout] = useState<{
    positions: ItemPosition[];
    height: number;
    sortOrder: number[];
  }>({ positions: [], height: 0, sortOrder: [] });
  const rafIdRef = useRef<number>(0);
  const lastContainerWidth = useRef<number>(0);

  const childArray = React.Children.toArray(children);

  // Phase 1: Measure natural sizes
  useLayoutEffect(() => {
    if (phase !== "measuring") return;

    const container = containerRef.current;
    const measureContainer = measureContainerRef.current;
    if (!container || !measureContainer) return;

    const containerWidth = container.offsetWidth;
    if (containerWidth === 0) return;

    lastContainerWidth.current = containerWidth;

    // Calculate grid parameters
    const numColumns = Math.max(1, Math.floor((containerWidth + gap) / (minColumnWidth + gap)));
    const columnUnitWidth = (containerWidth - (numColumns - 1) * gap) / numColumns;

    // Measure all items from the measurement container
    const measureItems = measureContainer.children;
    const measured: MeasuredItem[] = [];

    for (let i = 0; i < measureItems.length; i++) {
      const item = measureItems[i] as HTMLElement;
      const naturalWidth = item.scrollWidth;
      const naturalHeight = item.scrollHeight;

      // Calculate column span based on natural width
      const columnsNeeded = Math.max(1, Math.ceil(naturalWidth / columnUnitWidth));
      const columnSpan = Math.min(columnsNeeded, numColumns);

      measured.push({
        index: i,
        naturalWidth,
        naturalHeight,
        columnSpan,
        area: naturalWidth * naturalHeight,
      });
    }

    // First Fit Decreasing: sort by area (largest first)
    const sorted = [...measured].sort((a, b) => b.area - a.area);

    // Skyline algorithm - track height at each column
    const skyline = new Array(numColumns).fill(0);
    const positions: ItemPosition[] = new Array(childArray.length);

    // Place each item using First Fit Decreasing
    for (const item of sorted) {
      const { index, naturalHeight, columnSpan } = item;
      const itemWidth = columnSpan * columnUnitWidth + (columnSpan - 1) * gap;

      // Find the best position: lowest y where this item fits
      let bestColumn = 0;
      let bestY = Infinity;

      for (let startCol = 0; startCol <= numColumns - columnSpan; startCol++) {
        // Find max height across the columns this item would span
        let maxHeight = 0;
        for (let col = startCol; col < startCol + columnSpan; col++) {
          maxHeight = Math.max(maxHeight, skyline[col]);
        }

        // First Fit: take the first position that's at the lowest level
        if (maxHeight < bestY) {
          bestY = maxHeight;
          bestColumn = startCol;
        }
      }

      const x = bestColumn * (columnUnitWidth + gap);
      const y = bestY;

      positions[index] = { x, y, width: itemWidth };

      // Update skyline for all columns this item spans
      const newHeight = y + naturalHeight + gap;
      for (let col = bestColumn; col < bestColumn + columnSpan; col++) {
        skyline[col] = newHeight;
      }
    }

    const maxHeight = Math.max(...skyline, 0);
    setLayout({
      positions,
      height: maxHeight > gap ? maxHeight - gap : 0,
      sortOrder: sorted.map(item => item.index),
    });
    setPhase("ready");
  }, [phase, childArray.length, gap, minColumnWidth]);

  // Observe container for resize - trigger remeasure
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const newWidth = entries[0]?.contentRect.width ?? 0;
      // Only remeasure if width actually changed
      if (Math.abs(newWidth - lastContainerWidth.current) > 1) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(() => {
          setPhase("measuring");
        });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Remeasure when children change
  useLayoutEffect(() => {
    setPhase("measuring");
  }, [childArray.length]);

  return (
    <Box ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Measurement container - items at natural size */}
      <Box
        ref={measureContainerRef}
        style={{
          position: phase === "measuring" ? "relative" : "absolute",
          visibility: phase === "measuring" ? "visible" : "hidden",
          display: "flex",
          flexWrap: "wrap",
          gap,
          width: "100%",
          pointerEvents: phase === "measuring" ? "auto" : "none",
        }}
        aria-hidden={phase !== "measuring"}
      >
        {childArray.map((child, index) => (
          <Box
            key={`measure-${index}`}
            style={{
              width: "max-content",
              maxWidth: "100%",
              flexShrink: 0,
            }}
          >
            {child}
          </Box>
        ))}
      </Box>

      {/* Positioned container - shown after measurement */}
      {phase === "ready" && (
        <Box
          style={{
            position: "relative",
            width: "100%",
            height: layout.height,
          }}
        >
          {childArray.map((child, index) => (
            <Box
              key={index}
              style={{
                position: "absolute",
                left: layout.positions[index]?.x ?? 0,
                top: layout.positions[index]?.y ?? 0,
                width: layout.positions[index]?.width ?? "100%",
              }}
            >
              {child}
            </Box>
          ))}
        </Box>
      )}
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
        <MasonryGrid minColumnWidth={120} gap={8}>
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
        </MasonryGrid>
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
        <MasonryGrid minColumnWidth={150} gap={12}>
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
        </MasonryGrid>
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
          <MasonryGrid>
            {sortedEntries.map(([groupName, groupData]) => (
              <Box key={groupName}>
                {renderSectionCard([groupName, groupData])}
              </Box>
            ))}
          </MasonryGrid>
        ) : (
          // Stacked layout uses vertical Stack
          sortedEntries.map(renderSectionCard)
        )}
      </Stack>
    </Box>
  );
}
