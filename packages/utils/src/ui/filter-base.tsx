import { ReactNode } from "react";

export type FilterOperator =
	| "eq"
	| "ne"
	| "gt"
	| "gte"
	| "lt"
	| "lte"
	| "contains"
	| "starts_with"
	| "ends_with"
	| "in"
	| "not_in";

export interface FilterFieldConfig {
	key: string;
	label: string;
	type: "text" | "number" | "date" | "boolean" | "enum" | "entity";
	required?: boolean;
	options?: Array<{ value: string; label: string }>;
	placeholder?: string;
	description?: string;
}

export interface BaseFilterProps<T = unknown> {
	value: T;
	operator: FilterOperator;
	config: FilterFieldConfig;
	onValueChange: (value: T) => void;
	onOperatorChange: (operator: FilterOperator) => void;
	disabled?: boolean;
	compact?: boolean;
	fieldId: string;
	children?: ReactNode;
}

export const FILTER_WIDTHS = {
	small: 120,
	medium: 180,
	large: 240,
	xlarge: 320,
} as const;

export function BaseFilter<T = unknown>({
	value,
	operator,
	config,
	onValueChange,
	onOperatorChange,
	disabled = false,
	compact = false,
	fieldId,
	children,
}: BaseFilterProps<T>) {
	// This is a base component that provides common filter functionality
	// The actual implementation would render the filter UI
	return (
		<div className={`base-filter ${compact ? "compact" : ""}`} data-field-id={fieldId}>
			{children}
		</div>
	);
}

export function createFilter<T = unknown>(
	config: FilterFieldConfig,
	initialValue: T,
	initialOperator: FilterOperator = "eq"
): {
	value: T;
	operator: FilterOperator;
	config: FilterFieldConfig;
	setValue: (value: T) => void;
	setOperator: (operator: FilterOperator) => void;
} {
	return {
		value: initialValue,
		operator: initialOperator,
		config,
		setValue: (value: T) => {
			// This would be implemented with actual state management
			console.log("Setting filter value:", value);
		},
		setOperator: (operator: FilterOperator) => {
			// This would be implemented with actual state management
			console.log("Setting filter operator:", operator);
		},
	};
}

export function createEnumOptions(
	options: Array<{ value: string; label: string }>
): Array<{ value: string; label: string }> {
	return options.map(option => ({
		value: option.value,
		label: option.label,
	}));
}