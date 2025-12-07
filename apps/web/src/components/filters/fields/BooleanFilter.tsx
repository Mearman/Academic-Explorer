import type { FilterFieldConfig, FilterOperator } from "@bibgraph/utils";
import { BaseFilter, type BaseFilterRenderProps } from "@bibgraph/utils";
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

export const BooleanFilter = ({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: BooleanFilterProps) => <BaseFilter
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
    </BaseFilter>;