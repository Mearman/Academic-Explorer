import { MultiSelect, Select } from "@mantine/core";
import { BaseFilter, createEnumOptions } from "@academic-explorer/utils/ui/filter-base";
import type { FilterFieldConfig } from "@academic-explorer/utils/ui";
import type { FilterOperator } from "@academic-explorer/utils/ui";

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
  const selectOptions = createEnumOptions(config);
  const isMulti = config.type === "multiSelect";

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
          {isMulti ? (
            <MultiSelect
              id={fieldId}
              data={selectOptions}
              value={Array.isArray(value) ? value : []}
              onChange={(val) => onChange(val)}
              disabled={disabled}
              size={compact ? "xs" : "sm"}
              placeholder={config.placeholder}
              style={{ flex: 1 }}
            />
          ) : (
            <Select
              id={fieldId}
              data={selectOptions}
              value={Array.isArray(value) ? value[0] : value || ""}
              onChange={(val) => onChange(val as string)}
              disabled={disabled}
              size={compact ? "xs" : "sm"}
              placeholder={config.placeholder}
              style={{ flex: 1 }}
              searchable
            />
          )}
        </>
      )}
    </BaseFilter>
  );
}