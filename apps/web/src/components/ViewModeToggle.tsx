import { SegmentedControl, Group, Text } from "@mantine/core";
import { IconTable, IconList, IconGridDots } from "@tabler/icons-react";
import React from "react";

export type ViewMode = "table" | "list" | "grid";

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const VIEW_MODE_DATA = [
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

export function ViewModeToggle({
  value,
  onChange,
  size = "sm",
}: ViewModeToggleProps) {
  return (
    <SegmentedControl
      value={value}
      onChange={(val) => onChange(val as ViewMode)}
      data={VIEW_MODE_DATA}
      size={size}
      fullWidth={false}
    />
  );
}
