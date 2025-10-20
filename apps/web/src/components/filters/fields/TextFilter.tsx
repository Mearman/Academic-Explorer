import React from "react";
import { TextInput, Select } from "@mantine/core";
import type { FilterFieldConfig, FilterOperator } from "../types/filter-ui";

interface TextFilterProps {
  value: string;
  operator: FilterOperator;
  config: FilterFieldConfig;
  onValueChange: (value: string) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  disabled?: boolean;
  compact?: boolean;
  fieldId: string;
}

export function TextFilter({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: TextFilterProps) {
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
          style={{ minWidth: "100px" }}
        />
      )}
      <TextInput
        id={fieldId}
        value={value || ""}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        placeholder={config.placeholder}
        disabled={disabled}
        size={compact ? "xs" : "sm"}
        style={{ flex: 1 }}
      />
    </div>
  );
}
