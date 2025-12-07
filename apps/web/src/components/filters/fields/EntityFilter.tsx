import type { BaseFilterRenderProps, FilterFieldConfig, FilterOperator } from "@bibgraph/utils";
import { BaseFilter } from "@bibgraph/utils";
import { MultiSelect, Select, TextInput } from "@mantine/core";

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

export const EntityFilter = ({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: EntityFilterProps) => {
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
      {(props: BaseFilterRenderProps<string | string[]>) => (
        <>
          {hasOptions ? (
            isMulti ? (
              <MultiSelect
                id={props.fieldId}
                data={selectOptions}
                value={Array.isArray(props.value) ? props.value : []}
                onChange={(val) => props.onChange(val)}
                placeholder={config.placeholder || "Select entities"}
                disabled={props.disabled}
                size={props.compact ? "xs" : "sm"}
                flex={1}
                searchable
              />
            ) : (
              <Select
                id={props.fieldId}
                data={selectOptions}
                value={typeof props.value === "string" ? props.value : ""}
                onChange={(val) => props.onChange(val || "")}
                placeholder={config.placeholder || "Select entity"}
                disabled={props.disabled}
                size={props.compact ? "xs" : "sm"}
                flex={1}
                searchable
              />
            )
          ) : (
            <TextInput
              id={props.fieldId}
              value={typeof props.value === "string" ? props.value : ""}
              onChange={(event) => props.onChange(event.currentTarget.value)}
              placeholder={config.placeholder || "Enter entity ID or name"}
              disabled={props.disabled}
              size={props.compact ? "xs" : "sm"}
              flex={1}
            />
          )}
        </>
      )}
    </BaseFilter>
  );
};
