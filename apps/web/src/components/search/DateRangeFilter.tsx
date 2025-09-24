import { Group, Text } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";

interface DateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  label?: string;
  disabled?: boolean;
}

export function DateRangeFilter({
	startDate,
	endDate,
	onStartDateChange,
	onEndDateChange,
	label = "Publication Date Range",
	disabled = false,
}: DateRangeFilterProps) {
	const handleStartDateChange = (value: string | null) => {
		onStartDateChange(value ? new Date(value) : null);
	};

	const handleEndDateChange = (value: string | null) => {
		onEndDateChange(value ? new Date(value) : null);
	};
	return (
		<Group align="flex-end">
			<div>
				{label && (
					<Text size="sm" fw={500} mb={5}>
						{label}
					</Text>
				)}

				<Group gap="xs">
					<DatePickerInput
						placeholder="Start date"
						value={startDate}
						onChange={handleStartDateChange}
						leftSection={<IconCalendar size={16} />}
						{...(endDate && { maxDate: endDate })}
						disabled={disabled}
						clearable
						w={140}
					/>

					<Text c="dimmed" size="sm">
            to
					</Text>

					<DatePickerInput
						placeholder="End date"
						value={endDate}
						onChange={handleEndDateChange}
						leftSection={<IconCalendar size={16} />}
						{...(startDate && { minDate: startDate })}
						disabled={disabled}
						clearable
						w={140}
					/>
				</Group>
			</div>
		</Group>
	);
}