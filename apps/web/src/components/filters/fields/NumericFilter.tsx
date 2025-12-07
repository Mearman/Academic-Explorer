import type { BaseFilterRenderProps, FilterFieldConfig, FilterOperator } from "@bibgraph/utils";
import { BaseFilter } from "@bibgraph/utils";
import { NumberInput } from "@mantine/core";

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

export const NumericFilter = ({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: NumericFilterProps) => <BaseFilter
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
    </BaseFilter>;