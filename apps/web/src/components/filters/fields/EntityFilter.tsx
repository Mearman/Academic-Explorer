import { MultiSelect, Select, TextInput } from "@mantine/core";
import { BaseFilter } from "@academic-explorer/utils/ui/filter-base";
import type { FilterFieldConfig } from "@academic-explorer/utils/ui";
import type { FilterOperator } from "@academic-explorer/utils/ui";

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
  const selectOptions = (config.options || []).map((option) => ({
    value: String(option.value),
    label: option.label,
  }));

  const isMulti = config.type === "entityMulti";
  const hasOptions = selectOptions.length > 0;

  return (
    <BaseFilter
      value={value}
      operator={operator}
      config={config}
      onValueChange={onValueChange}
      onOperatorChange={onOperatorChange}
      disabled={disabled}
      compact={compact}
      fieldId={fieldId}
    >
      {({ value, onChange, disabled, compact, fieldId }) => (
        <>
          {hasOptions ? (
            isMulti ? (
              <MultiSelect
                id={fieldId}
                data={selectOptions}
                value={Array.isArray(value) ? value : []}
                onChange={onChange}
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
                onChange={(val) => onChange(val || "")}
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
              onChange={(event) => onChange(event.currentTarget.value)}
              placeholder={config.placeholder || "Enter entity ID or name"}
              disabled={disabled}
              size={compact ? "xs" : "sm"}
              style={{ flex: 1 }}
            />
          )}
        </>
      )}
    </BaseFilter>
  );
}
