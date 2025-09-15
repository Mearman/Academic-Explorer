/**
 * FilterBuilder component
 * Allows users to add, remove, and configure multiple filter criteria
 */

import React, { useState } from "react";
import {
	IconTrash,
	IconPlus,
	IconEye,
	IconEyeOff
} from "@tabler/icons-react";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type {
	FilterCriteria,
	FilterOperator,
	PropertyDefinition,
	ExpansionTarget,
	PropertyType
} from "@/lib/graph/types/expansion-settings";
import { getPropertiesForTarget, validateFilterCriteria } from "@/lib/graph/types/expansion-settings";

interface FilterBuilderProps {
  target: ExpansionTarget;
  filters: FilterCriteria[];
  onFiltersChange: (filters: FilterCriteria[]) => void;
  className?: string;
}

interface NewFilterForm {
  property: string;
  operator: FilterOperator;
  value: unknown;
  label: string;
}

// Operator options by property type
const OPERATORS_BY_TYPE: Record<PropertyType, { operator: FilterOperator; label: string }[]> = {
	string: [
		{ operator: "eq", label: "equals" },
		{ operator: "ne", label: "not equals" },
		{ operator: "contains", label: "contains" },
		{ operator: "startswith", label: "starts with" },
		{ operator: "endswith", label: "ends with" },
		{ operator: "in", label: "in list" },
		{ operator: "notin", label: "not in list" }
	],
	number: [
		{ operator: "eq", label: "equals" },
		{ operator: "ne", label: "not equals" },
		{ operator: "gt", label: "greater than" },
		{ operator: "lt", label: "less than" },
		{ operator: "gte", label: "greater than or equal" },
		{ operator: "lte", label: "less than or equal" },
		{ operator: "between", label: "between" },
		{ operator: "in", label: "in list" },
		{ operator: "notin", label: "not in list" }
	],
	year: [
		{ operator: "eq", label: "equals" },
		{ operator: "ne", label: "not equals" },
		{ operator: "gt", label: "after" },
		{ operator: "lt", label: "before" },
		{ operator: "gte", label: "since" },
		{ operator: "lte", label: "until" },
		{ operator: "between", label: "between" }
	],
	boolean: [
		{ operator: "eq", label: "is" },
		{ operator: "ne", label: "is not" }
	],
	enum: [
		{ operator: "eq", label: "is" },
		{ operator: "ne", label: "is not" },
		{ operator: "in", label: "is any of" },
		{ operator: "notin", label: "is none of" }
	],
	date: [
		{ operator: "eq", label: "on" },
		{ operator: "ne", label: "not on" },
		{ operator: "gt", label: "after" },
		{ operator: "lt", label: "before" },
		{ operator: "gte", label: "on or after" },
		{ operator: "lte", label: "on or before" },
		{ operator: "between", label: "between" }
	]
};

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
	target,
	filters,
	onFiltersChange,
	className
}) => {
	const { colors } = useThemeColors();
	const [showAddForm, setShowAddForm] = useState(false);
	const [newFilter, setNewFilter] = useState<NewFilterForm>({
		property: "",
		operator: "eq",
		value: "",
		label: ""
	});

	// Get available properties for this target
	const availableProperties = getPropertiesForTarget(target).filter(p => p.filterable);

	const getAvailableOperators = (propertyType: PropertyType) => {
		return OPERATORS_BY_TYPE[propertyType];
	};

	const handleAddFilter = () => {
		if (!newFilter.property) return;

		const selectedProperty = availableProperties.find(p => p.property === newFilter.property);
		if (!selectedProperty) return;

		const newFilterCriteria: FilterCriteria = {
			property: newFilter.property,
			operator: newFilter.operator,
			value: newFilter.value,
			enabled: true,
			label: newFilter.label || selectedProperty.label
		};

		// Validate the filter
		if (validateFilterCriteria(newFilterCriteria, selectedProperty)) {
			onFiltersChange([...filters, newFilterCriteria]);

			// Reset form
			setNewFilter({
				property: "",
				operator: "eq",
				value: "",
				label: ""
			});
			setShowAddForm(false);
		}
	};

	const handleRemoveFilter = (index: number) => {
		const newFilters = filters.filter((_, i) => i !== index);
		onFiltersChange(newFilters);
	};

	const handleToggleEnabled = (index: number) => {
		const newFilters = [...filters];
		newFilters[index] = { ...newFilters[index], enabled: !newFilters[index].enabled };
		onFiltersChange(newFilters);
	};


	const handlePropertyChange = (property: string) => {
		const selectedProperty = availableProperties.find(p => p.property === property);
		if (selectedProperty) {
			const availableOperators = getAvailableOperators(selectedProperty.type);
			setNewFilter({
				...newFilter,
				property,
				operator: availableOperators[0]?.operator ?? "eq",
				value: selectedProperty.type === "boolean" ? true : "",
				label: selectedProperty.label
			});
		}
	};

	const renderValueInput = (property: PropertyDefinition, value: unknown, onChange: (value: unknown) => void) => {
		const { type, enumValues } = property;

		switch (type) {
			case "boolean":
				return (
					<select
						value={String(value)}
						onChange={(e) => { onChange(e.target.value === "true"); }}
						style={{
							width: "100%",
							padding: "6px 8px",
							fontSize: "14px",
							backgroundColor: colors.background.primary,
							border: `1px solid ${colors.border.primary}`,
							borderRadius: "4px",
							color: colors.text.primary
						}}
					>
						<option value="true">True</option>
						<option value="false">False</option>
					</select>
				);

			case "enum":
				if (enumValues) {
					return (
						<select
							value={String(value)}
							onChange={(e) => { onChange(e.target.value); }}
							style={{
								width: "100%",
								padding: "6px 8px",
								fontSize: "14px",
								backgroundColor: colors.background.primary,
								border: `1px solid ${colors.border.primary}`,
								borderRadius: "4px",
								color: colors.text.primary
							}}
						>
							<option value="">Select value...</option>
							{enumValues.map(option => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					);
				}
				break;

			case "number":
			case "year":
				return (
					<input
						type="number"
						value={String(value)}
						onChange={(e) => { onChange(Number(e.target.value)); }}
						style={{
							width: "100%",
							padding: "6px 8px",
							fontSize: "14px",
							backgroundColor: colors.background.primary,
							border: `1px solid ${colors.border.primary}`,
							borderRadius: "4px",
							color: colors.text.primary
						}}
					/>
				);

			default:
				return (
					<input
						type="text"
						value={String(value)}
						onChange={(e) => { onChange(e.target.value); }}
						style={{
							width: "100%",
							padding: "6px 8px",
							fontSize: "14px",
							backgroundColor: colors.background.primary,
							border: `1px solid ${colors.border.primary}`,
							borderRadius: "4px",
							color: colors.text.primary
						}}
					/>
				);
		}

		return null;
	};

	const formatFilterValue = (filter: FilterCriteria): string => {
		if (filter.operator === "between" && Array.isArray(filter.value)) {
			return `${String(filter.value[0])} - ${String(filter.value[1])}`;
		}
		if (Array.isArray(filter.value)) {
			return filter.value.join(", ");
		}
		if (typeof filter.value === "boolean") {
			return filter.value ? "true" : "false";
		}
		return String(filter.value);
	};

	return (
		<div className={className}>
			<div style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				marginBottom: "12px"
			}}>
				<span style={{
					fontSize: "14px",
					fontWeight: 600,
					color: colors.text.primary
				}}>
          Filter Criteria
				</span>
				{!showAddForm && (
					<button
						onClick={() => { setShowAddForm(true); }}
						style={{
							padding: "4px 8px",
							fontSize: "12px",
							backgroundColor: colors.primary,
							color: colors.text.inverse,
							border: "none",
							borderRadius: "4px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "4px"
						}}
					>
						<IconPlus size={14} />
            Add Filter
					</button>
				)}
			</div>

			{/* Existing filters */}
			<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
				{filters.map((filter, index) => (
					<div
						key={`${filter.property}-${String(index)}`}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							padding: "8px",
							backgroundColor: filter.enabled ? colors.background.secondary : colors.background.tertiary,
							border: `1px solid ${colors.border.primary}`,
							borderRadius: "6px",
							opacity: filter.enabled ? 1 : 0.6
						}}
					>
						{/* Enable/disable toggle */}
						<button
							onClick={() => { handleToggleEnabled(index); }}
							style={{
								padding: "4px",
								backgroundColor: "transparent",
								border: "none",
								cursor: "pointer",
								color: filter.enabled ? colors.primary : colors.text.tertiary,
								display: "flex",
								alignItems: "center",
								justifyContent: "center"
							}}
						>
							{filter.enabled ? <IconEye size={16} /> : <IconEyeOff size={16} />}
						</button>

						{/* Filter description */}
						<div style={{
							flex: 1,
							fontSize: "14px",
							color: colors.text.primary
						}}>
							<div style={{ fontWeight: 500 }}>
								{filter.label || filter.property}
							</div>
							<div style={{
								fontSize: "12px",
								color: colors.text.secondary,
								marginTop: "2px"
							}}>
								{getAvailableOperators(availableProperties.find(p => p.property === filter.property)?.type ?? "string")
									.find(op => op.operator === filter.operator)?.label ?? filter.operator} {formatFilterValue(filter)}
							</div>
						</div>

						{/* Remove button */}
						<button
							onClick={() => { handleRemoveFilter(index); }}
							style={{
								padding: "4px",
								backgroundColor: "transparent",
								border: "none",
								cursor: "pointer",
								color: colors.error,
								display: "flex",
								alignItems: "center",
								justifyContent: "center"
							}}
						>
							<IconTrash size={16} />
						</button>
					</div>
				))}
			</div>

			{/* Add new filter form */}
			{showAddForm && (
				<div style={{
					marginTop: "12px",
					padding: "12px",
					backgroundColor: colors.background.tertiary,
					border: `1px solid ${colors.border.primary}`,
					borderRadius: "6px"
				}}>
					<div style={{
						display: "flex",
						flexDirection: "column",
						gap: "8px"
					}}>
						<div>
							<label style={{
								display: "block",
								fontSize: "12px",
								fontWeight: 600,
								color: colors.text.primary,
								marginBottom: "4px"
							}}>
                Property
							</label>
							<select
								value={newFilter.property}
								onChange={(e) => { handlePropertyChange(e.target.value); }}
								style={{
									width: "100%",
									padding: "6px 8px",
									fontSize: "14px",
									backgroundColor: colors.background.primary,
									border: `1px solid ${colors.border.primary}`,
									borderRadius: "4px",
									color: colors.text.primary
								}}
							>
								<option value="">Select property...</option>
								{availableProperties.map(property => (
									<option key={property.property} value={property.property}>
										{property.label}
									</option>
								))}
							</select>
						</div>

						{newFilter.property && (
							<>
								<div>
									<label style={{
										display: "block",
										fontSize: "12px",
										fontWeight: 600,
										color: colors.text.primary,
										marginBottom: "4px"
									}}>
                    Operator
									</label>
									<select
										value={newFilter.operator}
										onChange={(e) => { setNewFilter({ ...newFilter, operator: e.target.value as FilterOperator }); }}
										style={{
											width: "100%",
											padding: "6px 8px",
											fontSize: "14px",
											backgroundColor: colors.background.primary,
											border: `1px solid ${colors.border.primary}`,
											borderRadius: "4px",
											color: colors.text.primary
										}}
									>
										{getAvailableOperators(
											availableProperties.find(p => p.property === newFilter.property)?.type ?? "string"
										).map(operator => (
											<option key={operator.operator} value={operator.operator}>
												{operator.label}
											</option>
										))}
									</select>
								</div>

								<div>
									<label style={{
										display: "block",
										fontSize: "12px",
										fontWeight: 600,
										color: colors.text.primary,
										marginBottom: "4px"
									}}>
                    Value
									</label>
									{(() => {
										const selectedProperty = availableProperties.find(p => p.property === newFilter.property);
										if (!selectedProperty) return null;
										return renderValueInput(
											selectedProperty,
											newFilter.value,
											(value) => { setNewFilter({ ...newFilter, value }); }
										);
									})()}
								</div>
							</>
						)}

						<div style={{
							display: "flex",
							gap: "8px",
							marginTop: "8px"
						}}>
							<button
								onClick={handleAddFilter}
								disabled={!newFilter.property || newFilter.value === ""}
								style={{
									flex: 1,
									padding: "6px 12px",
									fontSize: "12px",
									backgroundColor: (newFilter.property && newFilter.value !== "") ? colors.primary : colors.text.tertiary,
									color: colors.text.inverse,
									border: "none",
									borderRadius: "4px",
									cursor: (newFilter.property && newFilter.value !== "") ? "pointer" : "not-allowed"
								}}
							>
                Add Filter
							</button>
							<button
								onClick={() => {
									setShowAddForm(false);
									setNewFilter({
										property: "",
										operator: "eq",
										value: "",
										label: ""
									});
								}}
								style={{
									flex: 1,
									padding: "6px 12px",
									fontSize: "12px",
									backgroundColor: "transparent",
									color: colors.text.secondary,
									border: `1px solid ${colors.border.primary}`,
									borderRadius: "4px",
									cursor: "pointer"
								}}
							>
                Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{filters.length === 0 && !showAddForm && (
				<div style={{
					padding: "20px",
					textAlign: "center",
					color: colors.text.secondary,
					fontSize: "12px",
					fontStyle: "italic"
				}}>
          No filters defined. Click "Add Filter" to add filtering.
				</div>
			)}

			{filters.length > 0 && (
				<div style={{
					marginTop: "8px",
					fontSize: "11px",
					color: colors.text.secondary
				}}>
					{filters.filter(f => f.enabled).length} of {filters.length} filters enabled
				</div>
			)}
		</div>
	);
};