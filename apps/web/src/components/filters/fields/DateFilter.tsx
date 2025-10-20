import React from "react";
import { TextInput, Select } from "@mantine/core";
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
  const operatorOptions = config.operators.map((op) => ({
    value: op,
    label: op,
  }));

  const isRange = config.type === "dateRange";

  const handleValueChange = (newValue: string) => {
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
  };

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
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
      {config.operators.length > 1 && (
        <Select
          data={operatorOptions}
          value={operator}
          onChange={(val) => val && onOperatorChange(val as FilterOperator)}
          disabled={disabled}
          size={compact ? "xs" : "sm"}
          style={{ minWidth: "80px" }}
        />
      )}
      <TextInput
        id={fieldId}
        type="date"
        value={displayValue}
        onChange={(event) => handleValueChange(event.currentTarget.value)}
        placeholder={config.placeholder}
        disabled={disabled}
        size={compact ? "xs" : "sm"}
        style={{ flex: 1 }}
      />
    </div>
  );
}
