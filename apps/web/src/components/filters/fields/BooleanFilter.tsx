import { Switch } from "@mantine/core";
import { BaseFilter } from "@academic-explorer/utils/ui/filter-base";
import type { FilterFieldConfig } from "@academic-explorer/utils/ui";
import type { FilterOperator } from "@academic-explorer/utils/ui";

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
      {({ value, onChange, disabled, compact, fieldId }) => (
        <Switch
          id={fieldId}
          checked={value}
          onChange={(event) => onChange(event.currentTarget.checked)}
          disabled={disabled}
          size={compact ? "xs" : "sm"}
          style={{ marginTop: "4px" }}
        />
      )}
    </BaseFilter>
  );
}