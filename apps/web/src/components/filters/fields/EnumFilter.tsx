import { MultiSelect, Select } from "@mantine/core";
import {
  BaseFilter,
  createEnumOptions,
} from "@academic-explorer/utils/ui/filter-base";
import type { FilterFieldConfig, FilterOperator } from "../types/filter-ui";
import type { FilterFieldOption as UtilsFilterFieldOption } from "@academic-explorer/utils/ui";

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
  // Cast to utils type for compatibility with createEnumOptions
  const selectOptions = createEnumOptions(
    (config.options || []) as UtilsFilterFieldOption[],
  ).map(option => ({
    ...option,
    value: String(option.value),
  }));
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
              flex={1}
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
              flex={1}
              searchable
            />
          )}
        </>
      )}
    </BaseFilter>
  );
}