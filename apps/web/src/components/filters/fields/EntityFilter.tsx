import React from "react";
import { MultiSelect, Select, TextInput } from "@mantine/core";
import type { FilterFieldConfig, FilterOperator } from "../types/filter-ui";

interface EntityFilterProps {
  value: string | string[];
  operator: FilterOperator;
  config: FilterFieldConfig;
  onValueChange: (value: string | string[]) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  disabled?: boolean;
  compact?: boolean;
  fieldId: string;
}

export function EntityFilter({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: EntityFilterProps) {
  const operatorOptions = config.operators.map((op) => ({
    value: op,
    label: op,
  }));

  const selectOptions = (config.options || []).map((option) => ({
    value: String(option.value),
    label: option.label,
  }));

  const isMulti = config.type === "entityMulti";
  const hasOptions = selectOptions.length > 0;

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
      {hasOptions ? (
        isMulti ? (
          <MultiSelect
            id={fieldId}
            data={selectOptions}
            value={Array.isArray(value) ? value : []}
            onChange={onValueChange}
            placeholder={config.placeholder || "Select entities"}
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
            placeholder={config.placeholder || "Select entity"}
            disabled={disabled}
            size={compact ? "xs" : "sm"}
            style={{ flex: 1 }}
            searchable
          />
        )
      ) : (
        <TextInput
          id={fieldId}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          placeholder={config.placeholder || "Enter entity ID or name"}
          disabled={disabled}
          size={compact ? "xs" : "sm"}
          style={{ flex: 1 }}
        />
      )}
    </div>
  );
}
