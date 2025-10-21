import React from "react"
import { SegmentedControl } from "@mantine/core"

export type ViewMode = "raw" | "rich"

export type ViewToggleProps = {
	viewMode: ViewMode
	onToggle: (mode: ViewMode) => void
	entityType?: string
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onToggle, entityType }) => {
	const ariaLabel = entityType
		? `Toggle view mode for ${entityType}`
		: "Toggle view mode between raw JSON and rich graph"

	const data = [
		{ label: "Raw JSON", value: "raw" },
		{ label: "Rich Graph", value: "rich" },
	]

	return (
		<SegmentedControl
			value={viewMode}
			onChange={(value) => {
				onToggle(value as ViewMode)
			}}
			data={data}
			aria-label={ariaLabel}
			size="md"
		/>
	)
}

export { ViewToggle }
