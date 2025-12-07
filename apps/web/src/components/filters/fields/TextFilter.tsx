import type { BaseFilterRenderProps, FilterFieldConfig, FilterOperator } from "@bibgraph/utils";
import { BaseFilter } from "@bibgraph/utils";
import { TextInput } from "@mantine/core";

interface TextFilterProps {
  value: string;
  operator: FilterOperator;
  config: FilterFieldConfig;
  onValueChange: (value: string) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  disabled?: boolean;
  compact?: boolean;
  fieldId: string;
}

export const TextFilter = ({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: TextFilterProps) => <BaseFilter
      value={value}
      operator={operator}
      config={config}
      onValueChange={onValueChange}
      onOperatorChange={onOperatorChange}
      disabled={disabled}
      compact={compact}
      fieldId={fieldId}
    >
      {(props: BaseFilterRenderProps<string>) => (
        <TextInput
          id={props.fieldId}
          value={props.value || ""}
          onChange={(event) => props.onChange(event.currentTarget.value)}
          placeholder={config.placeholder}
          disabled={props.disabled}
          size={props.compact ? "xs" : "sm"}
          flex={1}
        />
      )}
    </BaseFilter>;