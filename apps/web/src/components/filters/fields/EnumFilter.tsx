import React from "react";
import { MultiSelect, Select } from "@mantine/core";
import type { FilterFieldConfig, FilterOperator } from "../types/filter-ui";

interface EnumFilterProps {
  value: string | string[];
  operator: FilterOperator;
  config: FilterFieldConfig;
  onValueChange: (value: string | string[]) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  disabled?: boolean;
  compact?: boolean;
  fieldId: string;
}

export function EnumFilter({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: EnumFilterProps) {
  const operatorOptions = config.operators.map((op) => ({
    value: op,
    label: op,
  }));

  const selectOptions = (config.options || []).map((option) => ({
    value: String(option.value),
    label: option.label,
  }));

  const isMulti = config.type === "multiSelect";

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
      {isMulti ? (
        <MultiSelect
          id={fieldId}
          data={selectOptions}
          value={Array.isArray(value) ? value : []}
          onChange={onValueChange}
          placeholder={config.placeholder}
          disabled={disabled}
          size={compact ? "xs" : "sm"}
          style={{ flex: 1 }}
          searchable
        />
      ) : (
        <Select
          id={fieldId}
          data={selectOptions}
          value={typeof value === "string" ? value : ""}
          onChange={(val) => onValueChange(val || "")}
          placeholder={config.placeholder}
          disabled={disabled}
          size={compact ? "xs" : "sm"}
          style={{ flex: 1 }}
          searchable
        />
      )}
    </div>
  );
}
