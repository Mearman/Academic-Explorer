import React from "react";
import {
  Card,
  Text,
  Select,
  Switch,
  Group,
  Stack,
  SegmentedControl,
  Divider,
  Badge,
  Button,
} from "@mantine/core";
import {
  IconPalette,
  IconSun,
  IconMoon,
  IconDeviceDesktop,
} from "@tabler/icons-react";

import { useTheme } from "@/contexts/theme-context";
import type { ComponentLibrary, ColorScheme } from "@/styles/theme-contracts";

interface ThemeSettingsProps {
  onClose?: () => void;
}

export function ThemeSettings({ onClose }: ThemeSettingsProps) {
  const { config, setComponentLibrary, setColorScheme, setColorMode, resetTheme } = useTheme();

  const componentLibraryData = [
    {
      value: "mantine",
      label: "Mantine",
      description: "Rich, feature-complete component library",
    },
    {
      value: "shadcn",
      label: "shadcn/ui",
      description: "Modern, accessible components built on Radix",
    },
    {
      value: "radix",
      label: "Radix UI",
      description: "Unstyled, accessible primitives",
    },
  ] as const;

  const colorSchemeData = [
    { value: "blue", label: "Blue", color: "#228be6" },
    { value: "green", label: "Green", color: "#37b24d" },
    { value: "orange", label: "Orange", color: "#fd7e14" },
    { value: "purple", label: "Purple", color: "#9775fa" },
    { value: "red", label: "Red", color: "#fa5252" },
    { value: "neutral", label: "Neutral", color: "#495057" },
  ] as const;

  const colorModeData = [
    {
      value: "light",
      label: (
        <Group gap={6}>
          <IconSun size={14} />
          <span>Light</span>
        </Group>
      ),
    },
    {
      value: "dark",
      label: (
        <Group gap={6}>
          <IconMoon size={14} />
          <span>Dark</span>
        </Group>
      ),
    },
    {
      value: "auto",
      label: (
        <Group gap={6}>
          <IconDeviceDesktop size={14} />
          <span>Auto</span>
        </Group>
      ),
    },
  ];

  const handleComponentLibraryChange = (value: string | null) => {
    if (value && ["mantine", "shadcn", "radix"].includes(value)) {
      setComponentLibrary(value as ComponentLibrary);
    }
  };

  const handleColorSchemeChange = (value: string | null) => {
    if (value && ["blue", "green", "orange", "purple", "red", "neutral"].includes(value)) {
      setColorScheme(value as ColorScheme);
    }
  };

  const handleColorModeChange = (value: string) => {
    if (["light", "dark", "auto"].includes(value)) {
      setColorMode(value as "light" | "dark" | "auto");
    }
  };

  return (
    <Stack gap="lg">
      {/* Current Theme Summary */}
      <Card withBorder p="md" bg="var(--mantine-color-body)">
        <Group justify="space-between" align="center">
          <Group>
            <IconPalette size={20} color="var(--colors-primary)" />
            <Text size="sm" fw={500}>
              Current Theme
            </Text>
          </Group>
          <Group gap="xs">
            <Badge variant="light" size="sm">
              {config.componentLibrary}
            </Badge>
            <Badge
              variant="light"
              size="sm"
              style={{
                backgroundColor: colorSchemeData.find(s => s.value === config.colorScheme)?.color,
                color: "white",
              }}
            >
              {config.colorScheme}
            </Badge>
            <Badge variant="light" size="sm">
              {config.colorMode}
            </Badge>
          </Group>
        </Group>
      </Card>

      <Divider />

      {/* Component Library Selection */}
      <Stack gap="sm">
        <Text size="sm" fw={600}>
          Component Library
        </Text>
        <Select
          data={componentLibraryData}
          value={config.componentLibrary}
          onChange={handleComponentLibraryChange}
          description="Choose the base component library style"
        />
      </Stack>

      {/* Color Scheme Selection */}
      <Stack gap="sm">
        <Text size="sm" fw={600}>
          Color Scheme
        </Text>
        <Select
          data={colorSchemeData.map((scheme) => ({
            value: scheme.value,
            label: scheme.label,
          }))}
          value={config.colorScheme}
          onChange={handleColorSchemeChange}
          description="Choose the main color palette"
          renderOption={({ option }) => (
            <Group gap={8}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: colorSchemeData.find(s => s.value === option.value)?.color,
                  border: "1px solid var(--mantine-color-gray-3)",
                }}
              />
              <span>{option.label}</span>
            </Group>
          )}
        />
      </Stack>

      {/* Color Mode Selection */}
      <Stack gap="sm">
        <Text size="sm" fw={600}>
          Appearance
        </Text>
        <SegmentedControl
          data={colorModeData}
          value={config.colorMode}
          onChange={handleColorModeChange}
          fullWidth
        />
      </Stack>

      <Divider />

      {/* Actions */}
      <Group justify="space-between">
        <Button
          variant="subtle"
          size="sm"
          onClick={resetTheme}
        >
          Reset to Default
        </Button>
        {onClose && (
          <Button
            variant="filled"
            size="sm"
            onClick={onClose}
          >
            Done
          </Button>
        )}
      </Group>
    </Stack>
  );
}