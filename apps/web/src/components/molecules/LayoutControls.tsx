/**
 * Layout controls for switching graph layouts
 */

import React from "react";
import { Button, Popover, Stack, Text } from "@mantine/core";
import { IconLayout, IconNetwork } from "@tabler/icons-react";
import { useGraphStore } from "@/stores/graph-store";
import type { GraphLayout } from "@academic-explorer/graph";

const layoutOptions = [
	{
		type: "d3-force" as const,
		label: "D3 Force Layout",
		description: "Physics-based layout with optimal node separation",
		icon: IconNetwork,
	},
];

export const LayoutControls: React.FC = () => {
	const currentLayout = useGraphStore((state) => state.currentLayout);
	const setLayout = useGraphStore((state) => state.setLayout);

	const handleLayoutChange = () => {
		// Always use D3 force layout with empty options (hook will use fixed parameters)
		const newLayout: GraphLayout = {
			type: "d3-force",
			options: {}
		};

		setLayout(newLayout);
	};


	const currentOption = layoutOptions.find(opt => opt.type === currentLayout?.type);
	const CurrentIcon = currentOption?.icon || IconLayout;

	return (
		<Popover position="bottom-start" shadow="md">
			<Popover.Target>
				<Button
					leftSection={<CurrentIcon size={16} />}
					variant="light"
					size="sm"
				>
					{currentOption?.label || "Layout"}
				</Button>
			</Popover.Target>

			<Popover.Dropdown>
				<Stack gap="md" style={{ minWidth: 280 }}>
					<Text size="sm" fw={500}>Graph Layout</Text>

					<Stack gap="xs">
						{layoutOptions.map(option => {
							const OptionIcon = option.icon;
							return (
								<Button
									key={option.type}
									variant={currentLayout?.type === option.type ? "filled" : "subtle"}
									leftSection={<OptionIcon size={16} />}
									onClick={() => { handleLayoutChange(); }}
									size="sm"
									justify="flex-start"
									fullWidth
								>
									<div>
										<Text size="sm">{option.label}</Text>
										<Text size="xs" c="dimmed" style={{ fontSize: "11px" }}>
											{option.description}
										</Text>
									</div>
								</Button>
							);
						})}
					</Stack>

				</Stack>
			</Popover.Dropdown>
		</Popover>
	);
};