import { MultiSelect, Select } from "@mantine/core";
import {
  BaseFilter,
  createEnumOptions,
  type BaseFilterRenderProps,
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
      {(props: BaseFilterRenderProps<string | string[]>) => (
        <>
          {isMulti ? (
            <MultiSelect
              id={props.fieldId}
              data={selectOptions}
              value={Array.isArray(props.value) ? props.value : []}
              onChange={(val) => props.onChange(val)}
              disabled={props.disabled}
              size={props.compact ? "xs" : "sm"}
              placeholder={config.placeholder}
              flex={1}
            />
          ) : (
            <Select
              id={props.fieldId}
              data={selectOptions}
              value={Array.isArray(props.value) ? props.value[0] : props.value || ""}
              onChange={(val) => props.onChange(val as string)}
              disabled={props.disabled}
              size={props.compact ? "xs" : "sm"}
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