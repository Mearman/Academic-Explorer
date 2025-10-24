import React from "react"
import { Select } from "@mantine/core"

// Local type definitions (originally from apps/web, duplicated here to avoid circular deps)
export type FilterOperator =
	| "="
	| "!="
	| ">"
	| ">="
	| "<"
	| "<="
	| "contains"
	| "search"
	| "between"

export interface FilterFieldConfig {
	operators: FilterOperator[]
	placeholder?: string
	options?: Array<{ value: string | number | boolean; label: string }>
	[key: string]: unknown
}

export interface BaseFilterProps<T = unknown> {
	value: T
	operator: FilterOperator
	config: FilterFieldConfig
	onValueChange: (value: T) => void
	onOperatorChange: (operator: FilterOperator) => void
	disabled?: boolean
	compact?: boolean
	fieldId: string
	children: (props: {
		value: T
		onChange: (value: T) => void
		disabled?: boolean
		compact?: boolean
		fieldId: string
		config: FilterFieldConfig
	}) => React.ReactNode
}

/**
 * Base filter component that eliminates duplication across all filter field components
 * Provides consistent operator selection, layout, and common behavior
 */
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
	const operatorOptions = config.operators.map((op) => ({
		value: op,
		label: op,
	}))

	return (
		<div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
			{config.operators.length > 1 && (
				<Select
					data={operatorOptions}
					value={operator}
					onChange={(val) => val && onOperatorChange(val as FilterOperator)}
					disabled={disabled}
					size={compact ? "xs" : "sm"}
					style={{ minWidth: compact ? "80px" : "100px" }}
				/>
			)}
			{children({
				value,
				onChange: onValueChange,
				disabled,
				compact,
				fieldId,
				config,
			})}
		</div>
	)
}

/**
 * Higher-order component to create specific filter types with common behavior
 */
export function createFilter<T = unknown>(
	inputComponent: React.ComponentType<{
		value: T
		onChange: (value: T) => void
		disabled?: boolean
		compact?: boolean
		fieldId: string
		config: FilterFieldConfig
		placeholder?: string
	}>
) {
	return function FilterWrapper(props: Omit<BaseFilterProps<T>, "children">) {
		return (
			<BaseFilter {...props}>
				{({ value, onChange, disabled, compact, fieldId, config }) =>
					React.createElement(inputComponent, {
						value,
						onChange,
						disabled,
						compact,
						fieldId,
						config,
						placeholder: config.placeholder,
					})
				}
			</BaseFilter>
		)
	}
}

/**
 * Create enum select options from config
 */
export function createEnumOptions(config: FilterFieldConfig) {
	return (config.options || []).map((option) => ({
		value: String(option.value),
		label: option.label,
	}))
}

/**
 * Standard filter width calculations
 */
export const FILTER_WIDTHS = {
	operator: {
		compact: "80px",
		normal: "100px",
		wide: "120px",
	},
	input: {
		compact: "120px",
		normal: "200px",
		wide: "300px",
	},
} as const
