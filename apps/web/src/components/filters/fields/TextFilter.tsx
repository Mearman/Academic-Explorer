import { TextInput } from "@mantine/core";
import { BaseFilter } from "@academic-explorer/utils/ui/filter-base";
import type { FilterFieldConfig, FilterOperator } from "../types/filter-ui";

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

export function TextFilter({
  value,
  operator,
  config,
  onValueChange,
  onOperatorChange,
  disabled = false,
  compact = false,
  fieldId,
}: TextFilterProps) {
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
        <TextInput
          id={fieldId}
          value={value || ""}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={config.placeholder}
          disabled={disabled}
          size={compact ? "xs" : "sm"}
          style={{ flex: 1 }}
        />
      )}
    </BaseFilter>
  );
}