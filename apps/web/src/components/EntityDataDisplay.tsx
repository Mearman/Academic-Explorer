/**
 * EntityDataDisplay Component
 *
 * Displays all entity data using recursive grouped masonry with full global grid alignment.
 * All items (sections, fields, nested content) align to a single global grid in both
 * row AND column dimensions. Visual hierarchy is maintained through background spans.
 */

import { VersionComparisonIndicator } from "@bibgraph/ui";
import { isDataVersionSelectorVisible } from "@bibgraph/utils";
import {
  Anchor,
  Badge,
  Code,
  Text,
  Flex,
  Group,
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
import React, { useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";

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
  MIN_COLUMN_WIDTH: 200,
  /** Row height unit in pixels - items snap to multiples of this */
  ROW_UNIT: 24,
  /** Gap between items in pixels */
  GAP: 8,
  /** Padding inside groups */
  GROUP_PADDING: 8,
} as const;

/** Section icons mapping */
const SECTION_ICONS: Record<string, React.ReactNode> = {
  "Basic Information": <IconInfoCircle size={16} />,
  "Identifiers": <IconKey size={16} />,
  "Metrics": <IconChartBar size={16} />,
  "Relationships": <IconNetwork size={16} />,
  "Dates": <IconCalendar size={16} />,
  "Locations & Geo": <IconWorld size={16} />,
  "Other": <IconClipboard size={16} />,
};

/** Section colors for backgrounds */
const SECTION_COLORS: Record<string, string> = {
  "Identifiers": "var(--mantine-color-blue-0)",
  "Basic Information": "var(--mantine-color-green-0)",
  "Metrics": "var(--mantine-color-violet-0)",
  "Relationships": "var(--mantine-color-orange-0)",
  "Dates": "var(--mantine-color-cyan-0)",
  "Locations & Geo": "var(--mantine-color-teal-0)",
  "Other": "var(--mantine-color-gray-0)",
};

// ============================================================================
// Flat Grid Item Types
// ============================================================================

interface GridPosition {
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
}

interface FlatGridItem {
  id: string;
  type: 'section-bg' | 'section-header' | 'field-card' | 'array-item-bg' | 'array-item';
  content: React.ReactNode;
  position: GridPosition;
  zIndex: number;
  backgroundColor?: string;
  borderColor?: string;
  depth: number;
}

// ============================================================================
// 2D Occupancy Grid for Bin Packing with Orientation Optimization
// ============================================================================

/** Item flexibility for orientation optimization */
interface ItemFlexibility {
  /** Preferred column span */
  preferredCols: number;
  /** Preferred row span */
  preferredRows: number;
  /** Whether this item can be rotated (swap cols/rows) */
  canRotate: boolean;
  /** Minimum columns needed for content legibility */
  minCols: number;
  /** Minimum rows needed for content */
  minRows: number;
  /** Maximum aspect ratio allowed (e.g., 4 means max 4:1 or 1:4) */
  maxAspectRatio: number;
}

/** Scoring weights for placement optimization */
const PLACEMENT_WEIGHTS = {
  /** Bonus per adjacent filled cell (gap filling) */
  ADJACENCY_BONUS: 15,
  /** Penalty per row away from top */
  ROW_PENALTY: 2,
  /** Penalty per column away from left */
  COLUMN_PENALTY: 1,
  /** Bonus for filling a complete row slice */
  ROW_COMPLETION_BONUS: 25,
  /** Bonus for aligning with existing edges */
  EDGE_ALIGNMENT_BONUS: 10,
  /** Penalty for creating isolated single-cell gaps */
  ISOLATED_GAP_PENALTY: 20,
  /** Bonus for compact aspect ratios (closer to square) */
  SQUARE_BONUS: 5,
} as const;

class OccupancyGrid {
  private grid: boolean[][] = [];
  private numCols: number;

  constructor(numCols: number) {
    this.numCols = numCols;
  }

  isOccupied(col: number, row: number): boolean {
    return this.grid[row]?.[col] ?? false;
  }

  occupy(col: number, row: number): void {
    if (!this.grid[row]) {
      this.grid[row] = new Array(this.numCols).fill(false);
    }
    this.grid[row][col] = true;
  }

  occupyArea(colStart: number, rowStart: number, colSpan: number, rowSpan: number): void {
    for (let r = rowStart; r < rowStart + rowSpan; r++) {
      for (let c = colStart; c < colStart + colSpan; c++) {
        this.occupy(c, r);
      }
    }
  }

  canPlace(col: number, row: number, colSpan: number, rowSpan: number): boolean {
    if (col + colSpan > this.numCols) return false;
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        if (this.isOccupied(c, r)) return false;
      }
    }
    return true;
  }

  canPlaceWithin(
    col: number,
    row: number,
    colSpan: number,
    rowSpan: number,
    bounds: { colStart: number; colEnd: number; rowStart: number }
  ): boolean {
    if (col < bounds.colStart || col + colSpan > bounds.colEnd) return false;
    if (row < bounds.rowStart) return false;
    return this.canPlace(col, row, colSpan, rowSpan);
  }

  /** Count occupied cells adjacent to a placement (measures gap-filling) */
  countAdjacentOccupied(colStart: number, rowStart: number, colSpan: number, rowSpan: number): number {
    let count = 0;

    // Check cells above
    if (rowStart > 0) {
      for (let c = colStart; c < colStart + colSpan; c++) {
        if (this.isOccupied(c, rowStart - 1)) count++;
      }
    }

    // Check cells below
    for (let c = colStart; c < colStart + colSpan; c++) {
      if (this.isOccupied(c, rowStart + rowSpan)) count++;
    }

    // Check cells to the left
    if (colStart > 0) {
      for (let r = rowStart; r < rowStart + rowSpan; r++) {
        if (this.isOccupied(colStart - 1, r)) count++;
      }
    }

    // Check cells to the right
    if (colStart + colSpan < this.numCols) {
      for (let r = rowStart; r < rowStart + rowSpan; r++) {
        if (this.isOccupied(colStart + colSpan, r)) count++;
      }
    }

    return count;
  }

  /** Check if placing here would create isolated single-cell gaps */
  countIsolatedGapsCreated(colStart: number, rowStart: number, colSpan: number, rowSpan: number): number {
    let isolatedGaps = 0;

    // Check cells around the placement for potential isolation
    const checkPoints = [
      // Corners around the placement
      { col: colStart - 1, row: rowStart - 1 },
      { col: colStart + colSpan, row: rowStart - 1 },
      { col: colStart - 1, row: rowStart + rowSpan },
      { col: colStart + colSpan, row: rowStart + rowSpan },
    ];

    for (const point of checkPoints) {
      if (point.col < 0 || point.col >= this.numCols || point.row < 0) continue;
      if (this.isOccupied(point.col, point.row)) continue;

      // Count how many neighbors this empty cell would have after placement
      let neighbors = 0;
      const directions = [
        { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
        { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
      ];

      for (const dir of directions) {
        const nc = point.col + dir.dc;
        const nr = point.row + dir.dr;
        if (nc < 0 || nc >= this.numCols || nr < 0) {
          neighbors++; // Boundary counts as blocked
          continue;
        }

        // Check if this neighbor would be occupied after placement
        const inPlacement = nc >= colStart && nc < colStart + colSpan &&
                          nr >= rowStart && nr < rowStart + rowSpan;
        if (this.isOccupied(nc, nr) || inPlacement) {
          neighbors++;
        }
      }

      // If all 4 neighbors would be blocked, this creates an isolated gap
      if (neighbors >= 4) {
        isolatedGaps++;
      }
    }

    return isolatedGaps;
  }

  /** Check if placement completes any row slices within bounds */
  checkRowCompletion(
    colStart: number,
    rowStart: number,
    colSpan: number,
    rowSpan: number,
    bounds: { colStart: number; colEnd: number; rowStart: number }
  ): number {
    let completedRows = 0;

    for (let r = rowStart; r < rowStart + rowSpan; r++) {
      let rowComplete = true;
      for (let c = bounds.colStart; c < bounds.colEnd; c++) {
        const inPlacement = c >= colStart && c < colStart + colSpan;
        if (!inPlacement && !this.isOccupied(c, r)) {
          rowComplete = false;
          break;
        }
      }
      if (rowComplete) completedRows++;
    }

    return completedRows;
  }

  /** Check for edge alignment with existing items */
  countEdgeAlignments(colStart: number, rowStart: number, colSpan: number, rowSpan: number): number {
    let alignments = 0;

    // Check if left edge aligns with something ending at our left
    if (colStart > 0) {
      for (let r = Math.max(0, rowStart - 1); r < rowStart + rowSpan + 1; r++) {
        if (this.isOccupied(colStart - 1, r) && !this.isOccupied(colStart - 1, r - 1)) {
          alignments++;
          break;
        }
      }
    }

    // Check if right edge aligns
    if (colStart + colSpan < this.numCols) {
      for (let r = Math.max(0, rowStart - 1); r < rowStart + rowSpan + 1; r++) {
        if (this.isOccupied(colStart + colSpan, r) && !this.isOccupied(colStart + colSpan, r - 1)) {
          alignments++;
          break;
        }
      }
    }

    // Check if top edge aligns
    if (rowStart > 0) {
      for (let c = Math.max(0, colStart - 1); c < colStart + colSpan + 1; c++) {
        if (this.isOccupied(c, rowStart - 1) && (c === 0 || !this.isOccupied(c - 1, rowStart - 1))) {
          alignments++;
          break;
        }
      }
    }

    return alignments;
  }

  /** Score a placement candidate */
  scorePlacement(
    position: GridPosition,
    bounds: { colStart: number; colEnd: number; rowStart: number }
  ): number {
    const { colStart, rowStart, colSpan, rowSpan } = position;
    let score = 0;

    // Adjacency bonus (gap filling)
    const adjacentFilled = this.countAdjacentOccupied(colStart, rowStart, colSpan, rowSpan);
    score += adjacentFilled * PLACEMENT_WEIGHTS.ADJACENCY_BONUS;

    // Position penalty (prefer top-left for compactness)
    score -= (rowStart - bounds.rowStart) * PLACEMENT_WEIGHTS.ROW_PENALTY;
    score -= (colStart - bounds.colStart) * PLACEMENT_WEIGHTS.COLUMN_PENALTY;

    // Row completion bonus
    const completedRows = this.checkRowCompletion(colStart, rowStart, colSpan, rowSpan, bounds);
    score += completedRows * PLACEMENT_WEIGHTS.ROW_COMPLETION_BONUS;

    // Edge alignment bonus
    const alignments = this.countEdgeAlignments(colStart, rowStart, colSpan, rowSpan);
    score += alignments * PLACEMENT_WEIGHTS.EDGE_ALIGNMENT_BONUS;

    // Isolated gap penalty
    const isolatedGaps = this.countIsolatedGapsCreated(colStart, rowStart, colSpan, rowSpan);
    score -= isolatedGaps * PLACEMENT_WEIGHTS.ISOLATED_GAP_PENALTY;

    // Squareness bonus (prefer aspect ratios closer to 1:1)
    const aspectRatio = Math.max(colSpan, rowSpan) / Math.min(colSpan, rowSpan);
    const squarenessScore = Math.max(0, PLACEMENT_WEIGHTS.SQUARE_BONUS - (aspectRatio - 1) * 2);
    score += squarenessScore;

    return score;
  }

  /** Generate valid orientations for an item */
  generateOrientations(flex: ItemFlexibility, maxCols: number): Array<{ cols: number; rows: number }> {
    const orientations: Array<{ cols: number; rows: number }> = [];
    const area = flex.preferredCols * flex.preferredRows;

    // Original orientation (if it fits)
    if (flex.preferredCols <= maxCols && flex.preferredCols >= flex.minCols) {
      orientations.push({ cols: flex.preferredCols, rows: flex.preferredRows });
    }

    // Rotated orientation (if allowed and fits)
    if (flex.canRotate && flex.preferredCols !== flex.preferredRows) {
      const rotatedCols = flex.preferredRows;
      const rotatedRows = flex.preferredCols;

      if (rotatedCols <= maxCols &&
          rotatedCols >= flex.minCols &&
          rotatedRows >= flex.minRows) {
        const aspectRatio = Math.max(rotatedCols, rotatedRows) / Math.min(rotatedCols, rotatedRows);
        if (aspectRatio <= flex.maxAspectRatio) {
          orientations.push({ cols: rotatedCols, rows: rotatedRows });
        }
      }
    }

    // If nothing fits yet, try to find a valid configuration by adjusting
    if (orientations.length === 0 && flex.canRotate) {
      // Try wider and shorter
      for (let cols = maxCols; cols >= flex.minCols; cols--) {
        const rows = Math.ceil(area / cols);
        if (rows >= flex.minRows) {
          const aspectRatio = Math.max(cols, rows) / Math.min(cols, rows);
          if (aspectRatio <= flex.maxAspectRatio) {
            orientations.push({ cols, rows });
            break;
          }
        }
      }

      // Try taller and narrower
      if (orientations.length === 0) {
        for (let cols = flex.minCols; cols <= maxCols; cols++) {
          const rows = Math.ceil(area / cols);
          if (rows >= flex.minRows) {
            const aspectRatio = Math.max(cols, rows) / Math.min(cols, rows);
            if (aspectRatio <= flex.maxAspectRatio) {
              orientations.push({ cols, rows });
              break;
            }
          }
        }
      }
    }

    // Fallback: use minimum viable size
    if (orientations.length === 0) {
      orientations.push({
        cols: Math.min(flex.minCols, maxCols),
        rows: flex.minRows
      });
    }

    return orientations;
  }

  /** Find the best placement for an item with orientation optimization */
  findBestFitWithin(
    flex: ItemFlexibility,
    bounds: { colStart: number; colEnd: number; rowStart: number },
    maxRow: number = 1000
  ): GridPosition | null {
    const availableCols = bounds.colEnd - bounds.colStart;
    const orientations = this.generateOrientations(flex, availableCols);

    let bestPosition: GridPosition | null = null;
    let bestScore = -Infinity;

    for (const orientation of orientations) {
      const effectiveColSpan = Math.min(orientation.cols, availableCols);
      const effectiveRowSpan = orientation.rows;

      // Search for valid positions with this orientation
      for (let row = bounds.rowStart; row < maxRow; row++) {
        for (let col = bounds.colStart; col <= bounds.colEnd - effectiveColSpan; col++) {
          if (this.canPlaceWithin(col, row, effectiveColSpan, effectiveRowSpan, bounds)) {
            const position: GridPosition = {
              colStart: col,
              colSpan: effectiveColSpan,
              rowStart: row,
              rowSpan: effectiveRowSpan,
            };

            const score = this.scorePlacement(position, bounds);

            if (score > bestScore) {
              bestScore = score;
              bestPosition = position;
            }
          }
        }

        // Early termination: if we found a good placement in earlier rows,
        // don't search too many more rows (diminishing returns)
        if (bestPosition !== null && row > bestPosition.rowStart + 5) {
          break;
        }
      }
    }

    return bestPosition;
  }

  /** Find the best fit globally (not within bounds) */
  findBestFit(flex: ItemFlexibility, maxRow: number = 1000): GridPosition | null {
    return this.findBestFitWithin(
      flex,
      { colStart: 0, colEnd: this.numCols, rowStart: 0 },
      maxRow
    );
  }

  findFirstFit(colSpan: number, rowSpan: number, maxRow: number = 1000): GridPosition | null {
    for (let row = 0; row < maxRow; row++) {
      for (let col = 0; col <= this.numCols - colSpan; col++) {
        if (this.canPlace(col, row, colSpan, rowSpan)) {
          return { colStart: col, colSpan, rowStart: row, rowSpan };
        }
      }
    }
    return null;
  }

  findFirstFitWithin(
    colSpan: number,
    rowSpan: number,
    bounds: { colStart: number; colEnd: number; rowStart: number },
    maxRow: number = 1000
  ): GridPosition | null {
    const availableCols = bounds.colEnd - bounds.colStart;
    const effectiveColSpan = Math.min(colSpan, availableCols);

    for (let row = bounds.rowStart; row < maxRow; row++) {
      for (let col = bounds.colStart; col <= bounds.colEnd - effectiveColSpan; col++) {
        if (this.canPlaceWithin(col, row, effectiveColSpan, rowSpan, bounds)) {
          return { colStart: col, colSpan: effectiveColSpan, rowStart: row, rowSpan };
        }
      }
    }
    return null;
  }
}

// ============================================================================
// Value Rendering (creates React nodes, not grid items)
// ============================================================================

function renderPrimitiveValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <Text c="dimmed" fs="italic" size="sm">null</Text>;
  }

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

  if (typeof value === "number") {
    return (
      <Code variant="light" color="blue" ff="monospace" fw={600}>
        {value.toLocaleString()}
      </Code>
    );
  }

  if (typeof value === "string") {
    const converted = convertOpenAlexToInternalLink(value);

    if (converted.isOpenAlexLink) {
      return (
        <Anchor
          component={Link}
          to={converted.internalPath}
          c="blue"
          size="sm"
          style={{ wordBreak: "break-word" }}
        >
          <Group gap={4}>
            <IconLink size={14} />
            <Text size="sm" span>{value}</Text>
          </Group>
        </Anchor>
      );
    }

    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <Anchor
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
          style={{ wordBreak: "break-word" }}
        >
          <Group gap={4}>
            <IconExternalLink size={14} />
            <Text size="sm" span>{value}</Text>
          </Group>
        </Anchor>
      );
    }

    if (isOpenAlexId(value)) {
      const idConverted = convertOpenAlexToInternalLink(value);
      return (
        <Anchor
          component={Link}
          to={idConverted.internalPath}
          c="blue"
          size="sm"
          style={{ wordBreak: "break-word" }}
        >
          <Group gap={4}>
            <IconLink size={14} />
            <Text size="sm" span>{value}</Text>
          </Group>
        </Anchor>
      );
    }

    return <Text size="sm">{value}</Text>;
  }

  return <Text c="dimmed" fs="italic" size="sm">{String(value)}</Text>;
}

// ============================================================================
// Data Flattening & Layout Algorithm
// ============================================================================

interface FieldData {
  key: string;
  value: unknown;
  /** Flexibility info for orientation optimization */
  flexibility: ItemFlexibility;
}

interface SectionData {
  name: string;
  fields: FieldData[];
  icon: React.ReactNode;
  color: string;
}

/** Size estimation result with flexibility info */
interface SizeEstimate {
  /** Preferred row span */
  rows: number;
  /** Preferred column span */
  cols: number;
  /** Whether this item can be rotated */
  canRotate: boolean;
  /** Minimum columns needed */
  minCols: number;
  /** Minimum rows needed */
  minRows: number;
  /** Maximum acceptable aspect ratio */
  maxAspectRatio: number;
}

function estimateValueSize(value: unknown): SizeEstimate {
  // Default flexibility settings
  const baseFlexibility = {
    canRotate: true,
    minCols: 1,
    minRows: 2,
    maxAspectRatio: 4,
  };

  if (value === null || value === undefined) {
    return { rows: 2, cols: 1, ...baseFlexibility };
  }

  if (typeof value === "boolean") {
    return { rows: 2, cols: 1, ...baseFlexibility };
  }

  if (typeof value === "number") {
    return { rows: 2, cols: 1, ...baseFlexibility };
  }

  if (typeof value === "string") {
    const length = value.length;
    // Short strings: compact
    if (length <= 30) {
      return { rows: 2, cols: 1, ...baseFlexibility };
    }
    // Medium strings: flexible
    if (length <= 100) {
      return {
        rows: 3,
        cols: 1,
        canRotate: true,
        minCols: 1,
        minRows: 2,
        maxAspectRatio: 4,
      };
    }
    // Long strings: prefer wider for readability
    const lineCount = Math.ceil(length / 50);
    return {
      rows: Math.min(8, Math.max(3, lineCount + 1)),
      cols: 2,
      canRotate: true,
      minCols: 1,
      minRows: 2,
      maxAspectRatio: 5,
    };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { rows: 2, cols: 1, ...baseFlexibility };
    }

    // Primitive arrays - flexible, can flow horizontally or vertically
    if (value.every(item => typeof item !== "object" || item === null)) {
      const itemCount = value.length;
      if (itemCount <= 4) {
        return {
          rows: 2,
          cols: 1,
          canRotate: true,
          minCols: 1,
          minRows: 2,
          maxAspectRatio: 3,
        };
      }
      // More items: can be wider or taller
      return {
        rows: Math.ceil(itemCount / 3) + 1,
        cols: 2,
        canRotate: true,
        minCols: 1,
        minRows: 2,
        maxAspectRatio: 4,
      };
    }

    // Object arrays - generally prefer vertical layout but can flex
    const itemCount = value.length;
    const avgItemSize = value.reduce((sum, item) => {
      const size = estimateValueSize(item);
      return sum + size.rows;
    }, 0) / itemCount;

    return {
      rows: Math.min(15, Math.max(4, Math.ceil(itemCount * (avgItemSize * 0.7)))),
      cols: 2,
      canRotate: true, // Can show fewer items per row but wider
      minCols: 1,
      minRows: 3,
      maxAspectRatio: 5,
    };
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return { rows: 2, cols: 1, ...baseFlexibility };
    }

    // Small objects: compact and flexible
    if (entries.length <= 3) {
      const totalRows = entries.reduce((sum, [, val]) => {
        return sum + Math.max(1, estimateValueSize(val).rows - 1);
      }, 1);
      return {
        rows: Math.max(3, totalRows),
        cols: 1,
        canRotate: true,
        minCols: 1,
        minRows: 2,
        maxAspectRatio: 4,
      };
    }

    // Larger objects: may need more space
    const totalRows = entries.reduce((sum, [, val]) => {
      return sum + Math.max(1, estimateValueSize(val).rows - 1);
    }, 1);
    return {
      rows: Math.min(12, Math.max(4, totalRows)),
      cols: 2,
      canRotate: true,
      minCols: 1,
      minRows: 3,
      maxAspectRatio: 4,
    };
  }

  return { rows: 2, cols: 1, ...baseFlexibility };
}

function groupFields(data: Record<string, unknown>): SectionData[] {
  const groups: Record<string, Record<string, unknown>> = {
    "Identifiers": {},
    "Basic Information": {},
    "Metrics": {},
    "Relationships": {},
    "Dates": {},
    "Locations & Geo": {},
    "Other": {},
  };

  const identifierKeys = ["id", "ids", "doi", "orcid", "issn", "ror", "mag", "openalex_id", "pmid", "pmcid"];
  const metricKeys = ["cited_by_count", "works_count", "h_index", "i10_index", "counts_by_year", "summary_stats", "fwci", "citation_normalized_percentile", "cited_by_percentile_year"];
  const relationshipKeys = ["authorships", "institutions", "concepts", "topics", "keywords", "grants", "sustainable_development_goals", "mesh", "affiliations", "last_known_institutions", "primary_location", "locations", "best_oa_location", "alternate_host_venues", "x_concepts"];
  const dateKeys = ["created_date", "updated_date", "publication_date", "publication_year"];
  const geoKeys = ["country_code", "countries_distinct_count", "geo", "latitude", "longitude"];
  const basicKeys = ["display_name", "title", "type", "description", "homepage_url", "image_url", "thumbnail_url", "is_oa", "oa_status", "has_fulltext"];

  Object.entries(data).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (identifierKeys.some(k => lowerKey.includes(k))) {
      groups["Identifiers"][key] = value;
    } else if (metricKeys.some(k => lowerKey.includes(k))) {
      groups["Metrics"][key] = value;
    } else if (relationshipKeys.some(k => lowerKey.includes(k))) {
      groups["Relationships"][key] = value;
    } else if (dateKeys.some(k => lowerKey.includes(k))) {
      groups["Dates"][key] = value;
    } else if (geoKeys.some(k => lowerKey.includes(k))) {
      groups["Locations & Geo"][key] = value;
    } else if (basicKeys.some(k => lowerKey.includes(k))) {
      groups["Basic Information"][key] = value;
    } else {
      groups["Other"][key] = value;
    }
  });

  // Convert to SectionData array, sorted by priority
  return Object.entries(groups)
    .filter(([, fields]) => Object.keys(fields).length > 0)
    .sort(([a], [b]) => (SECTION_PRIORITY[a] ?? 99) - (SECTION_PRIORITY[b] ?? 99))
    .map(([name, fields]) => ({
      name,
      icon: SECTION_ICONS[name] || <IconFile size={16} />,
      color: SECTION_COLORS[name] || "var(--mantine-color-gray-0)",
      fields: Object.entries(fields).map(([key, value]) => {
        const size = estimateValueSize(value);
        return {
          key,
          value,
          flexibility: {
            preferredCols: size.cols,
            preferredRows: size.rows + 2, // +2 for label and padding
            canRotate: size.canRotate,
            minCols: size.minCols,
            minRows: Math.max(size.minRows, 2), // Ensure minimum for label + content
            maxAspectRatio: size.maxAspectRatio,
          },
        };
      }),
    }));
}

// ============================================================================
// Recursive Value Renderer (for complex nested content)
// ============================================================================

function renderValueContent(value: unknown, depth: number, colors?: ThemeColors): React.ReactNode {
  // Primitives
  if (value === null || value === undefined || typeof value === "boolean" ||
      typeof value === "number" || typeof value === "string") {
    return renderPrimitiveValue(value);
  }

  // Arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Text c="dimmed" fs="italic" size="sm">[ ]</Text>;
    }

    // Primitive arrays - inline badges
    if (value.every(item => typeof item !== "object" || item === null)) {
      return (
        <Flex wrap="wrap" gap={4}>
          {value.map((item, index) => (
            <Badge key={index} variant="light" color="gray" size="sm">
              {renderPrimitiveValue(item)}
            </Badge>
          ))}
        </Flex>
      );
    }

    // Object arrays - vertical list with indices
    return (
      <Box>
        {value.map((item, index) => (
          <Box
            key={index}
            mb={4}
            p={8}
            style={{
              border: "1px solid var(--mantine-color-gray-3)",
              borderRadius: "var(--mantine-radius-sm)",
              backgroundColor: depth % 2 === 0
                ? "var(--mantine-color-gray-0)"
                : "var(--mantine-color-white)",
            }}
          >
            <Group gap={8} align="flex-start">
              <Badge circle size="sm" color="blue" variant="light">
                {index + 1}
              </Badge>
              <Box style={{ flex: 1, minWidth: 0 }}>
                {renderValueContent(item, depth + 1, colors)}
              </Box>
            </Group>
          </Box>
        ))}
      </Box>
    );
  }

  // Objects - key-value pairs
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <Text c="dimmed" fs="italic" size="sm">{"{ }"}</Text>;
    }

    return (
      <Box>
        {entries.map(([key, val]) => (
          <Box key={key} mb={4}>
            <Text size="xs" fw={600} c="dimmed" mb={2}>
              {key}
            </Text>
            <Box pl={8}>
              {renderValueContent(val, depth + 1, colors)}
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return <Text c="dimmed" fs="italic" size="sm">{String(value)}</Text>;
}

// ============================================================================
// Main Layout Component
// ============================================================================

interface GlobalGridProps {
  sections: SectionData[];
  colors?: ThemeColors;
}

function GlobalGrid({ sections, colors }: GlobalGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridItems, setGridItems] = useState<FlatGridItem[]>([]);
  const [numCols, setNumCols] = useState(4);
  const [totalRows, setTotalRows] = useState(1);
  const lastWidthRef = useRef(0);

  // Calculate layout
  const calculateLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    if (containerWidth === 0) return;
    if (Math.abs(containerWidth - lastWidthRef.current) < 5 && gridItems.length > 0) return;
    lastWidthRef.current = containerWidth;

    const { MIN_COLUMN_WIDTH, GAP, GROUP_PADDING } = GRID_CONFIG;
    const cols = Math.max(2, Math.floor((containerWidth + GAP) / (MIN_COLUMN_WIDTH + GAP)));
    setNumCols(cols);

    const occupancy = new OccupancyGrid(cols);
    const items: FlatGridItem[] = [];
    let itemIdCounter = 0;

    // Separate Relationships section to place it at the bottom
    const relationshipsSection = sections.find(s => s.name === "Relationships");
    const otherSections = sections.filter(s => s.name !== "Relationships");

    // Helper function to process a section
    const processSection = (section: SectionData, forceFullWidth: boolean = false) => {
      // Estimate section size
      const sectionColSpan = forceFullWidth
        ? cols
        : Math.min(cols, Math.max(2, Math.ceil(section.fields.length / 2)));
      const headerRows = 2; // Section header height

      // Find space for section (start with just header)
      const headerPos = occupancy.findFirstFit(sectionColSpan, headerRows);
      if (!headerPos) return;

      const sectionBounds = {
        colStart: headerPos.colStart,
        colEnd: headerPos.colStart + headerPos.colSpan,
        rowStart: headerPos.rowStart,
      };

      // Add section header
      items.push({
        id: `section-header-${itemIdCounter++}`,
        type: 'section-header',
        content: (
          <Group gap={8} p={8}>
            <Box c="blue.6">{section.icon}</Box>
            <Text size="md" fw={600}>{section.name}</Text>
            <Badge variant="light" color="gray" size="xs">
              {section.fields.length}
            </Badge>
          </Group>
        ),
        position: { ...headerPos },
        zIndex: 2,
        depth: 0,
      });

      // Reserve header space
      occupancy.occupyArea(headerPos.colStart, headerPos.rowStart, headerPos.colSpan, headerRows);

      // Layout fields within section bounds using orientation-optimized placement
      let sectionMaxRow = headerPos.rowStart + headerRows;
      const fieldBounds = {
        colStart: sectionBounds.colStart,
        colEnd: sectionBounds.colEnd,
        rowStart: headerPos.rowStart + headerRows,
      };

      for (const field of section.fields) {
        // Use optimized best-fit with orientation consideration
        const fieldPos = occupancy.findBestFitWithin(field.flexibility, fieldBounds);

        if (!fieldPos) {
          // Fallback: try global placement if section bounds are too constrained
          const globalPos = occupancy.findBestFit(field.flexibility);
          if (globalPos) {
            occupancy.occupyArea(globalPos.colStart, globalPos.rowStart, globalPos.colSpan, globalPos.rowSpan);
            sectionMaxRow = Math.max(sectionMaxRow, globalPos.rowStart + globalPos.rowSpan);

            items.push({
              id: `field-${itemIdCounter++}`,
              type: 'field-card',
              content: (
                <Box p={GROUP_PADDING}>
                  <Text size="xs" fw={600} c="blue.7" mb={4}>
                    {field.key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                  <Box>
                    {renderValueContent(field.value, 0, colors)}
                  </Box>
                </Box>
              ),
              position: globalPos,
              zIndex: 2,
              borderColor: "var(--mantine-color-gray-3)",
              depth: 1,
            });
          }
          continue;
        }

        occupancy.occupyArea(fieldPos.colStart, fieldPos.rowStart, fieldPos.colSpan, fieldPos.rowSpan);
        sectionMaxRow = Math.max(sectionMaxRow, fieldPos.rowStart + fieldPos.rowSpan);

        items.push({
          id: `field-${itemIdCounter++}`,
          type: 'field-card',
          content: (
            <Box p={GROUP_PADDING}>
              <Text size="xs" fw={600} c="blue.7" mb={4}>
                {field.key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              <Box>
                {renderValueContent(field.value, 0, colors)}
              </Box>
            </Box>
          ),
          position: fieldPos,
          zIndex: 2,
          borderColor: "var(--mantine-color-gray-3)",
          depth: 1,
        });
      }

      // Add section background spanning all its content
      const sectionBgPos: GridPosition = {
        colStart: sectionBounds.colStart,
        colSpan: sectionBounds.colEnd - sectionBounds.colStart,
        rowStart: headerPos.rowStart,
        rowSpan: sectionMaxRow - headerPos.rowStart,
      };

      items.push({
        id: `section-bg-${itemIdCounter++}`,
        type: 'section-bg',
        content: null,
        position: sectionBgPos,
        zIndex: 0,
        backgroundColor: section.color,
        borderColor: "var(--mantine-color-gray-3)",
        depth: 0,
      });
    };

    // Process non-relationship sections first (they get bin-packed)
    for (const section of otherSections) {
      processSection(section, false);
    }

    // Process Relationships section last, spanning full width at the bottom
    if (relationshipsSection) {
      processSection(relationshipsSection, true);
    }

    // Calculate total rows
    const maxRow = items.reduce((max, item) =>
      Math.max(max, item.position.rowStart + item.position.rowSpan), 0);
    setTotalRows(maxRow);
    setGridItems(items);
  }, [sections, colors, gridItems.length]);

  // Initial layout and resize handling
  useLayoutEffect(() => {
    calculateLayout();

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      // Reset and recalculate
      lastWidthRef.current = 0;
      calculateLayout();
    });
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [calculateLayout]);

  const { ROW_UNIT, GAP } = GRID_CONFIG;

  return (
    <Box
      ref={containerRef}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${numCols}, 1fr)`,
        gridTemplateRows: `repeat(${totalRows}, ${ROW_UNIT}px)`,
        gap: GAP,
        width: "100%",
        position: "relative",
      }}
    >
      {/* Sort by z-index: backgrounds first, then content */}
      {gridItems
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((item) => (
          <Box
            key={item.id}
            style={{
              gridColumn: `${item.position.colStart + 1} / span ${item.position.colSpan}`,
              gridRow: `${item.position.rowStart + 1} / span ${item.position.rowSpan}`,
              backgroundColor: item.backgroundColor,
              border: item.borderColor ? `1px solid ${item.borderColor}` : undefined,
              borderRadius: "var(--mantine-radius-md)",
              overflow: "hidden",
              zIndex: item.zIndex,
            }}
          >
            {item.content}
          </Box>
        ))}
    </Box>
  );
}

// ============================================================================
// Stacked Layout (Original vertical layout)
// ============================================================================

interface StackedLayoutProps {
  sections: SectionData[];
  colors?: ThemeColors;
}

function StackedLayout({ sections, colors }: StackedLayoutProps) {
  return (
    <Box>
      {sections.map((section) => (
        <Box
          key={section.name}
          mb="lg"
          style={{
            border: "1px solid var(--mantine-color-gray-3)",
            borderRadius: "var(--mantine-radius-md)",
            overflow: "hidden",
          }}
        >
          {/* Section header */}
          <Box
            p="md"
            bg={section.color}
            style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
          >
            <Group gap="sm">
              <Box c="blue.6">{section.icon}</Box>
              <Text size="lg" fw={600}>{section.name}</Text>
              <Badge variant="light" color="gray" size="sm">
                {section.fields.length} {section.fields.length === 1 ? "field" : "fields"}
              </Badge>
            </Group>
          </Box>

          {/* Section fields */}
          <Box p="md">
            {section.fields.map((field) => (
              <Box
                key={field.key}
                mb="md"
                p="sm"
                style={{
                  border: "1px solid var(--mantine-color-gray-2)",
                  borderRadius: "var(--mantine-radius-sm)",
                }}
              >
                <Text size="sm" fw={600} c="blue.7" mb="xs">
                  {field.key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                {renderValueContent(field.value, 0, colors)}
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ============================================================================
// Main Export
// ============================================================================

interface EntityDataDisplayProps {
  data: Record<string, unknown>;
  title?: string;
  /** Layout mode: "stacked" (default) or "tiled" for grid layout */
  layout?: LayoutMode;
}

export function EntityDataDisplay({ data, title, layout = "stacked" }: EntityDataDisplayProps) {
  const { colors } = useThemeColors();

  // Group and prepare data
  const sections = useMemo(() => groupFields(data), [data]);

  // Version comparison for Works
  const workId = typeof data.id === 'string' && data.id.startsWith('W') ? data.id : undefined;
  const shouldShowComparison = Boolean(workId && isDataVersionSelectorVisible());
  const { comparison } = useVersionComparison(workId, shouldShowComparison);

  return (
    <Box w="100%">
      {title && (
        <Text size="xl" fw={700} mb="lg">
          {title}
        </Text>
      )}

      {/* Version Comparison Indicator */}
      {shouldShowComparison && comparison && (
        <Box mb="lg">
          <VersionComparisonIndicator
            currentVersion={comparison.currentVersion}
            referencesCount={comparison.referencesCount}
            locationsCount={comparison.locationsCount}
          />
        </Box>
      )}

      {/* Layout selection */}
      {layout === "tiled" ? (
        <GlobalGrid sections={sections} colors={colors} />
      ) : (
        <StackedLayout sections={sections} colors={colors} />
      )}
    </Box>
  );
}
