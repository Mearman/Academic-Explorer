import { Group, SegmentedControl, Text } from "@mantine/core";
import { IconGridDots,IconList, IconTable } from "@tabler/icons-react";
import React from "react";

export type TableViewMode = "table" | "list" | "grid";

export interface TableViewModeToggleProps {
  value: TableViewMode;
  onChange: (value: TableViewMode) => void;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const VIEW_MODE_DATA: Array<{
  value: TableViewMode;
  label: React.ReactNode;
}> = [
  {
    value: "table" as const,
    label: (
      <Group gap="xs" wrap="nowrap">
        <IconTable size={16} />
        <Text size="sm">Table</Text>
      </Group>
    ),
  },
  {
    value: "list" as const,
    label: (
      <Group gap="xs" wrap="nowrap">
        <IconList size={16} />
        <Text size="sm">List</Text>
      </Group>
    ),
  },
  {
    value: "grid" as const,
    label: (
      <Group gap="xs" wrap="nowrap">
        <IconGridDots size={16} />
        <Text size="sm">Grid</Text>
      </Group>
    ),
  },
];

export const TableViewModeToggle = ({
  value,
  onChange,
  size = "sm",
}: TableViewModeToggleProps) => <SegmentedControl
      value={value}
      onChange={(val) => onChange(val as TableViewMode)}
      data={VIEW_MODE_DATA}
      size={size}
      fullWidth={false}
    />;
