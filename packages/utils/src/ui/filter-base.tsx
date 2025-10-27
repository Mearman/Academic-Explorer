// @ts-nocheck - React types compatibility issues with TypeScript bundler mode

// Filter operator types - aligned with apps/web filter system
export type FilterOperator =
	| "="
	| "!="
	| ">"
	| ">="
	| "<"
	| "<="
	| "contains"
	| "search"
	| "between";

// Options for select-type fields
export interface FilterFieldOption {
	value: string | number | boolean;
	label: string;
	description?: string;
	group?: string;
}

// Filter field configuration for UI rendering
export interface FilterFieldConfig {
	field: string;
	label: string;
	type:
		| "text"
		| "search"
		| "number"
		| "date"
		| "dateRange"
		| "boolean"
		| "select"
		| "multiSelect"
		| "entity"
		| "entityMulti";
	operators: FilterOperator[];
	required?: boolean;
	options?: FilterFieldOption[];
	placeholder?: string;
	description?: string;
	helpText?: string;
	validation?: {
		required?: boolean;
		min?: number;
		max?: number;
		pattern?: RegExp;
		custom?: (value: unknown) => string | null;
	};
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
	children?: unknown;
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
	options: FilterFieldOption[]
): FilterFieldOption[] {
	return options.map(option => ({
		value: option.value,
		label: option.label,
		description: option.description,
		group: option.group,
	}));
}