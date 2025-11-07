import { NumberInput } from "@mantine/core";
import { BaseFilter, type BaseFilterRenderProps } from "@academic-explorer/utils/ui/filter-base";
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
      {(props: BaseFilterRenderProps<number>) => (
        <NumberInput
          id={props.fieldId}
          value={props.value || 0}
          onChange={(val) => props.onChange(typeof val === "number" ? val : 0)}
          placeholder={config.placeholder}
          disabled={props.disabled}
          size={props.compact ? "xs" : "sm"}
          flex={1}
        />
      )}
    </BaseFilter>
  );
}