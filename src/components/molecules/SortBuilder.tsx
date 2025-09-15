/**
 * SortBuilder component
 * Allows users to add, remove, and reorder multiple sort criteria
 */

import React, { useState } from "react";
import {
	IconChevronUp,
	IconChevronDown,
	IconTrash,
	IconPlus,
	IconGripVertical
} from "@tabler/icons-react";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type {
	SortCriteria,
	ExpansionTarget
} from "@/lib/graph/types/expansion-settings";
import { getPropertiesForTarget } from "@/lib/graph/types/expansion-settings";

interface SortBuilderProps {
  target: ExpansionTarget;
  sorts: SortCriteria[];
  onSortsChange: (sorts: SortCriteria[]) => void;
  className?: string;
}

interface NewSortForm {
  property: string;
  direction: "asc" | "desc";
  label: string;
}

export const SortBuilder: React.FC<SortBuilderProps> = ({
	target,
	sorts,
	onSortsChange,
	className
}) => {
	const { colors } = useThemeColors();
	const [showAddForm, setShowAddForm] = useState(false);
	const [newSort, setNewSort] = useState<NewSortForm>({
		property: "",
		direction: "desc",
		label: ""
	});

	// Get available properties for this target
	const availableProperties = getPropertiesForTarget(target).filter(p => p.sortable);

	const handleAddSort = () => {
		if (!newSort.property) return;

		const selectedProperty = availableProperties.find(p => p.property === newSort.property);
		const maxPriority = Math.max(0, ...sorts.map(s => s.priority));

		const newSortCriteria: SortCriteria = {
			property: newSort.property,
			direction: newSort.direction,
			priority: maxPriority + 1,
			label: newSort.label || selectedProperty?.label || newSort.property
		};

		onSortsChange([...sorts, newSortCriteria]);

		// Reset form
		setNewSort({
			property: "",
			direction: "desc",
			label: ""
		});
		setShowAddForm(false);
	};

	const handleRemoveSort = (index: number) => {
		const newSorts = sorts.filter((_, i) => i !== index);
		// Renumber priorities
		newSorts.forEach((sort, i) => {
			sort.priority = i + 1;
		});
		onSortsChange(newSorts);
	};

	const handleDirectionChange = (index: number, direction: "asc" | "desc") => {
		const newSorts = [...sorts];
		newSorts[index] = { ...newSorts[index], direction };
		onSortsChange(newSorts);
	};

	const handleMoveSort = (index: number, direction: "up" | "down") => {
		if (
			(direction === "up" && index === 0) ||
      (direction === "down" && index === sorts.length - 1)
		) {
			return;
		}

		const newSorts = [...sorts];
		const targetIndex = direction === "up" ? index - 1 : index + 1;

		// Swap items
		[newSorts[index], newSorts[targetIndex]] = [newSorts[targetIndex], newSorts[index]];

		// Renumber priorities
		newSorts.forEach((sort, i) => {
			sort.priority = i + 1;
		});

		onSortsChange(newSorts);
	};

	const handlePropertyChange = (property: string) => {
		const selectedProperty = availableProperties.find(p => p.property === property);
		setNewSort({
			...newSort,
			property,
			label: selectedProperty?.label || property
		});
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
          Sort Criteria
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
            Add Sort
					</button>
				)}
			</div>

			{/* Existing sorts */}
			<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
				{sorts.map((sort, index) => (
					<div
						key={`${sort.property}-${String(sort.priority)}`}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							padding: "8px",
							backgroundColor: colors.background.secondary,
							border: `1px solid ${colors.border.primary}`,
							borderRadius: "6px"
						}}
					>
						{/* Drag handle */}
						<div style={{
							cursor: "grab",
							color: colors.text.tertiary,
							display: "flex",
							alignItems: "center"
						}}>
							<IconGripVertical size={16} />
						</div>

						{/* Priority indicator */}
						<div style={{
							minWidth: "20px",
							height: "20px",
							borderRadius: "50%",
							backgroundColor: colors.primary,
							color: colors.text.inverse,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: "12px",
							fontWeight: 600
						}}>
							{sort.priority}
						</div>

						{/* Property label */}
						<div style={{
							flex: 1,
							fontSize: "14px",
							color: colors.text.primary,
							fontWeight: 500
						}}>
							{sort.label || sort.property}
						</div>

						{/* Direction toggle */}
						<div style={{
							display: "flex",
							backgroundColor: colors.background.primary,
							border: `1px solid ${colors.border.primary}`,
							borderRadius: "4px",
							overflow: "hidden"
						}}>
							<button
								onClick={() => { handleDirectionChange(index, "desc"); }}
								style={{
									padding: "4px 8px",
									fontSize: "12px",
									backgroundColor: sort.direction === "desc" ? colors.primary : "transparent",
									color: sort.direction === "desc" ? colors.text.inverse : colors.text.primary,
									border: "none",
									cursor: "pointer"
								}}
							>
                ↓ Desc
							</button>
							<button
								onClick={() => { handleDirectionChange(index, "asc"); }}
								style={{
									padding: "4px 8px",
									fontSize: "12px",
									backgroundColor: sort.direction === "asc" ? colors.primary : "transparent",
									color: sort.direction === "asc" ? colors.text.inverse : colors.text.primary,
									border: "none",
									borderLeft: `1px solid ${colors.border.primary}`,
									cursor: "pointer"
								}}
							>
                ↑ Asc
							</button>
						</div>

						{/* Move buttons */}
						<div style={{
							display: "flex",
							flexDirection: "column",
							gap: "2px"
						}}>
							<button
								onClick={() => { handleMoveSort(index, "up"); }}
								disabled={index === 0}
								style={{
									padding: "2px",
									backgroundColor: "transparent",
									border: "none",
									cursor: index === 0 ? "not-allowed" : "pointer",
									color: index === 0 ? colors.text.tertiary : colors.text.secondary,
									display: "flex",
									alignItems: "center",
									justifyContent: "center"
								}}
							>
								<IconChevronUp size={14} />
							</button>
							<button
								onClick={() => { handleMoveSort(index, "down"); }}
								disabled={index === sorts.length - 1}
								style={{
									padding: "2px",
									backgroundColor: "transparent",
									border: "none",
									cursor: index === sorts.length - 1 ? "not-allowed" : "pointer",
									color: index === sorts.length - 1 ? colors.text.tertiary : colors.text.secondary,
									display: "flex",
									alignItems: "center",
									justifyContent: "center"
								}}
							>
								<IconChevronDown size={14} />
							</button>
						</div>

						{/* Remove button */}
						<button
							onClick={() => { handleRemoveSort(index); }}
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

			{/* Add new sort form */}
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
								value={newSort.property}
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

						<div>
							<label style={{
								display: "block",
								fontSize: "12px",
								fontWeight: 600,
								color: colors.text.primary,
								marginBottom: "4px"
							}}>
                Direction
							</label>
							<select
								value={newSort.direction}
								onChange={(e) => { setNewSort({ ...newSort, direction: e.target.value as "asc" | "desc" }); }}
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
								<option value="desc">Descending (↓)</option>
								<option value="asc">Ascending (↑)</option>
							</select>
						</div>

						<div style={{
							display: "flex",
							gap: "8px",
							marginTop: "8px"
						}}>
							<button
								onClick={handleAddSort}
								disabled={!newSort.property}
								style={{
									flex: 1,
									padding: "6px 12px",
									fontSize: "12px",
									backgroundColor: newSort.property ? colors.primary : colors.text.tertiary,
									color: colors.text.inverse,
									border: "none",
									borderRadius: "4px",
									cursor: newSort.property ? "pointer" : "not-allowed"
								}}
							>
                Add Sort
							</button>
							<button
								onClick={() => {
									setShowAddForm(false);
									setNewSort({
										property: "",
										direction: "desc",
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

			{sorts.length === 0 && !showAddForm && (
				<div style={{
					padding: "20px",
					textAlign: "center",
					color: colors.text.secondary,
					fontSize: "12px",
					fontStyle: "italic"
				}}>
          No sort criteria defined. Click "Add Sort" to add sorting.
				</div>
			)}
		</div>
	);
};