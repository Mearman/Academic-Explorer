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
import React, { useCallback, useEffect, useRef, useState } from "react";

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

/** Masonry grid component with automatic content-based sizing */
interface MasonryGridProps {
  children: React.ReactNode[];
  /** Minimum column width in pixels (default: 350) */
  minColumnWidth?: number;
  /** Gap between items in pixels (default: 24) */
  gap?: number;
}

function MasonryGrid({
  children,
  minColumnWidth = MASONRY_CONFIG.MIN_COLUMN_WIDTH,
  gap = MASONRY_CONFIG.GAP,
}: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [positions, setPositions] = useState<{ x: number; y: number; width: number }[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const [measurePass, setMeasurePass] = useState(0);

  const calculateLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    if (containerWidth === 0) return;

    const columnCount = Math.max(1, Math.floor((containerWidth + gap) / (minColumnWidth + gap)));
    const columnWidth = (containerWidth - (columnCount - 1) * gap) / columnCount;

    // Track height of each column
    const columnHeights = new Array(columnCount).fill(0);
    const newPositions: { x: number; y: number; width: number }[] = [];

    for (let i = 0; i < children.length; i++) {
      const itemEl = itemRefs.current[i];

      // Measure natural content width and height
      const naturalWidth = itemEl?.scrollWidth ?? minColumnWidth;
      const itemHeight = itemEl?.scrollHeight ?? 200;

      // Calculate span based on content width relative to column width
      const naturalSpan = Math.ceil(naturalWidth / columnWidth);
      const span = Math.min(Math.max(1, naturalSpan), columnCount);

      // Find best starting column for this span
      let bestCol = 0;
      let bestHeight = Infinity;

      for (let col = 0; col <= columnCount - span; col++) {
        const maxHeightInSpan = Math.max(...columnHeights.slice(col, col + span));
        if (maxHeightInSpan < bestHeight) {
          bestHeight = maxHeightInSpan;
          bestCol = col;
        }
      }

      // Calculate position and width for spanning item
      const itemWidth = columnWidth * span + gap * (span - 1);

      newPositions[i] = {
        x: bestCol * (columnWidth + gap),
        y: bestHeight,
        width: itemWidth,
      };

      // Update heights for all columns in the span
      const newHeight = bestHeight + itemHeight + gap;
      for (let col = bestCol; col < bestCol + span; col++) {
        columnHeights[col] = newHeight;
      }
    }

    setPositions(newPositions);
    setContainerHeight(Math.max(...columnHeights, 0) - gap);
  }, [children.length, minColumnWidth, gap]);

  // Initial layout and resize handling
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      calculateLayout();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initial measure pass
    requestAnimationFrame(() => {
      setMeasurePass(1);
    });

    return () => resizeObserver.disconnect();
  }, [calculateLayout]);

  // Two-pass layout: first render naturally to measure, then position
  useEffect(() => {
    if (measurePass > 0) {
      calculateLayout();
      // Second pass to refine after positioning
      if (measurePass === 1) {
        requestAnimationFrame(() => setMeasurePass(2));
      }
    }
  }, [measurePass, calculateLayout]);

  return (
    <Box
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: containerHeight > 0 ? containerHeight : "auto",
        minHeight: 50,
      }}
    >
      {React.Children.map(children, (child, index) => (
        <Box
          ref={(el) => { itemRefs.current[index] = el; }}
          style={{
            position: measurePass > 0 && positions[index] ? "absolute" : "relative",
            left: positions[index]?.x ?? 0,
            top: positions[index]?.y ?? 0,
            width: measurePass > 0 && positions[index] ? positions[index].width : "auto",
            maxWidth: "100%",
            visibility: measurePass > 0 && positions[index] ? "visible" : "hidden",
          }}
        >
          {child}
        </Box>
      ))}
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

        {/* Tiled layout uses auto-sizing masonry grid */}
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
