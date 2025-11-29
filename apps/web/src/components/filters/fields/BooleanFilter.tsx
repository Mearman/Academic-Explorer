import type { FilterFieldConfig, FilterOperator } from "@bibgraph/utils/ui";
import { BaseFilter, type BaseFilterRenderProps } from "@bibgraph/utils/ui/filter-base";
import { Switch } from "@mantine/core";

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
      {(props: BaseFilterRenderProps<boolean>) => (
        <Switch
          id={props.fieldId}
          checked={props.value}
          onChange={(event) => props.onChange(event.currentTarget.checked)}
          disabled={props.disabled}
          size={props.compact ? "xs" : "sm"}
          style={{ marginTop: "4px" }}
        />
      )}
    </BaseFilter>
  );
}