/**
 * FilterField - Base component for individual filter conditions
 * Provides the foundation for all filter field types with consistent UI and behavior
 */

import React, { useCallback, useMemo } from "react";
import { Group, ActionIcon, Tooltip, Text, Alert } from "@mantine/core";
import { IconX, IconAlertCircle } from "@tabler/icons-react";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { FilterFieldProps, FilterCondition, FilterFieldConfig, EntityFilters } from "../types/filter-ui";

// Field type components
import { TextFilter } from "../fields/TextFilter";
import { NumericFilter } from "../fields/NumericFilter";
import { DateFilter } from "../fields/DateFilter";
import { BooleanFilter } from "../fields/BooleanFilter";
import { EnumFilter } from "../fields/EnumFilter";
import { EntityFilter } from "../fields/EntityFilter";

interface FilterFieldWrapperProps<T extends EntityFilters = EntityFilters> extends FilterFieldProps<T> {
  showRemoveButton?: boolean;
  showLabel?: boolean;
  error?: string;
}

export function FilterField<T extends EntityFilters = EntityFilters>({
  condition,
  config,
  onUpdate,
  onRemove,
  disabled = false,
  compact = false,
  showRemoveButton = true,
  showLabel = true,
  error,
}: FilterFieldWrapperProps<T>) {
  const { colors } = useThemeColors();

  // Generate unique ID for form elements
  const fieldId = useMemo(() => `filter-${condition.id}`, [condition.id]);

  // Handle field value updates
  const handleValueChange = useCallback((value: unknown) => {
    const updatedCondition: FilterCondition<T> = {
      ...condition,
      value,
    };
    onUpdate(updatedCondition);
  }, [condition, onUpdate]);

  // Handle operator changes
  const handleOperatorChange = useCallback((operator: string) => {
    const updatedCondition: FilterCondition<T> = {
      ...condition,
      operator: operator as FilterCondition<T>["operator"],
    };
    onUpdate(updatedCondition);
  }, [condition, onUpdate]);

  // Handle enabled/disabled toggle
  const handleToggleEnabled = useCallback(() => {
    const updatedCondition: FilterCondition<T> = {
      ...condition,
      enabled: !condition.enabled,
    };
    onUpdate(updatedCondition);
  }, [condition, onUpdate]);

  // Render the appropriate field component based on type
  const renderFieldComponent = () => {
    const fieldProps = {
      value: condition.value,
      operator: condition.operator,
      config,
      onValueChange: handleValueChange,
      onOperatorChange: handleOperatorChange,
      disabled: disabled || !condition.enabled,
      compact,
      fieldId,
    };

    switch (config.type) {
      case "text":
      case "search":
        return <TextFilter {...fieldProps} />;

      case "number":
        return <NumericFilter {...fieldProps} />;

      case "date":
      case "dateRange":
        return <DateFilter {...fieldProps} />;

      case "boolean":
        return <BooleanFilter {...fieldProps} />;

      case "select":
      case "multiSelect":
        return <EnumFilter {...fieldProps} />;

      case "entity":
      case "entityMulti":
        return <EntityFilter {...fieldProps} />;

      default:
        return (
          <Alert color="orange" icon={<IconAlertCircle size={14} />}>
            Unknown field type: {config.type}
          </Alert>
        );
    }
  };

  return (
    <div
      style={{
        padding: compact ? "8px" : "12px",
        border: `1px solid ${condition.enabled ? colors.border.primary : colors.border.secondary}`,
        borderRadius: "6px",
        backgroundColor: condition.enabled ? colors.background.primary : colors.background.secondary,
        opacity: condition.enabled ? 1 : 0.7,
        transition: "all 0.2s ease",
      }}
    >
      {/* Field Label and Controls */}
      {showLabel && (
        <Group justify="space-between" mb={compact ? 4 : 8}>
          <Group gap="xs">
            <Text
              size={compact ? "xs" : "sm"}
              fw={500}
              style={{
                color: condition.enabled ? colors.text.primary : colors.text.secondary,
              }}
            >
              {condition.label || config.label}
            </Text>

            {config.helpText && (
              <Tooltip label={config.helpText} multiline w={220}>
                <IconAlertCircle
                  size={12}
                  style={{ color: colors.text.tertiary, cursor: "help" }}
                />
              </Tooltip>
            )}
          </Group>

          <Group gap="xs">
            {/* Enable/Disable Toggle */}
            <Tooltip label={condition.enabled ? "Disable filter" : "Enable filter"}>
              <ActionIcon
                size="sm"
                variant="subtle"
                color={condition.enabled ? "blue" : "gray"}
                onClick={handleToggleEnabled}
                disabled={disabled}
              >
                {condition.enabled ? "✓" : "○"}
              </ActionIcon>
            </Tooltip>

            {/* Remove Button */}
            {showRemoveButton && (
              <Tooltip label="Remove filter">
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={onRemove}
                  disabled={disabled}
                >
                  <IconX size={12} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      )}

      {/* Field Component */}
      {renderFieldComponent()}

      {/* Error Display */}
      {error && (
        <Text size="xs" color="red" mt={4}>
          {error}
        </Text>
      )}

      {/* Field Description */}
      {config.helpText && !compact && (
        <Text size="xs" color="dimmed" mt={4}>
          {config.helpText}
        </Text>
      )}
    </div>
  );
}

// Export with display name for debugging
FilterField.displayName = "FilterField";