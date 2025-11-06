import React from "react";
import { TextInput } from "@mantine/core";
import { BaseFilter } from "@academic-explorer/utils/ui/filter-base";
import type { FilterFieldConfig, FilterOperator } from "../types/filter-ui";

interface DateFilterProps {
  value: string | [string, string] | null;
  operator: FilterOperator;
  config: FilterFieldConfig;
  onValueChange: (value: string | [string, string] | null) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  disabled?: boolean;
  compact?: boolean;
  fieldId: string;
}

export function DateFilter({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: DateFilterProps) {
  const isRange = config.type === "dateRange";

  const handleValueChange = React.useCallback((newValue: string) => {
    if (isRange) {
      // For range, expect format like "2023-01-01 to 2023-12-31"
      const parts = newValue.split(" to ");
      if (parts.length === 2) {
        onValueChange([parts[0].trim(), parts[1].trim()]);
      } else {
        onValueChange(null);
      }
    } else {
      onValueChange(newValue || null);
    }
  }, [isRange, onValueChange]);

  const displayValue = React.useMemo(() => {
    if (!value) return "";
    if (isRange && Array.isArray(value)) {
      return `${value[0]} to ${value[1]}`;
    }
    if (!isRange && typeof value === "string") {
      return value;
    }
    return "";
  }, [value, isRange]);

  return (
    <BaseFilter
      value={value}
      operator={operator}
      config={config}
      onValueChange={(val) => {
        // Convert the callback value back to the expected format
        if (typeof val === "string") {
          handleValueChange(val);
        }
      }}
      onOperatorChange={onOperatorChange}
      disabled={disabled}
      compact={compact}
      fieldId={fieldId}
    >
      {({ disabled, compact, fieldId }) => (
        <TextInput
          id={fieldId}
          value={displayValue}
          onChange={(event) => handleValueChange(event.currentTarget.value)}
          placeholder={config.placeholder || (isRange ? "2023-01-01 to 2023-12-31" : "YYYY-MM-DD")}
          disabled={disabled}
          size={compact ? "xs" : "sm"}
          flex={1}
        />
      )}
    </BaseFilter>
  );
}