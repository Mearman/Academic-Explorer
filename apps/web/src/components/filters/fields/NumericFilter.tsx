import React from "react";
import { NumberInput, Select } from "@mantine/core";
import type { FilterFieldConfig, FilterOperator } from "../types/filter-ui";

interface NumericFilterProps {
  value: number;
  operator: FilterOperator;
  config: FilterFieldConfig;
  onValueChange: (value: number) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  disabled?: boolean;
  compact?: boolean;
  fieldId: string;
}

export function NumericFilter({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: NumericFilterProps) {
  const operatorOptions = config.operators.map((op) => ({
    value: op,
    label: op,
  }));

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
      <NumberInput
        id={fieldId}
        value={value || 0}
        onChange={(val) => onValueChange(typeof val === "number" ? val : 0)}
        placeholder={config.placeholder}
        disabled={disabled}
        size={compact ? "xs" : "sm"}
        style={{ flex: 1 }}
        min={config.validation?.min}
        max={config.validation?.max}
      />
    </div>
  );
}
