import React from "react";
import { Switch, Select } from "@mantine/core";
import type { FilterFieldConfig, FilterOperator } from "../types/filter-ui";

interface BooleanFilterProps {
  value: boolean;
  operator: FilterOperator;
  config: FilterFieldConfig;
  onValueChange: (value: boolean) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  disabled?: boolean;
  compact?: boolean;
  fieldId: string;
}

export function BooleanFilter({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: BooleanFilterProps) {
  const operatorOptions = config.operators.map((op) => ({
    value: op,
    label: op,
  }));

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
      <Switch
        id={fieldId}
        checked={value || false}
        onChange={(event) => onValueChange(event.currentTarget.checked)}
        disabled={disabled}
        size={compact ? "xs" : "sm"}
        label={config.label}
      />
    </div>
  );
}
