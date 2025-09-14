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
						onChange={(value: string | null) => {
							if (value === null) {
								onStartDateChange(null);
							} else {
								const date = new Date(value);
								onStartDateChange(isNaN(date.getTime()) ? null : date);
							}
						}}
						leftSection={<IconCalendar size={16} />}
						maxDate={endDate || undefined}
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
						onChange={(value: string | null) => {
							if (value === null) {
								onEndDateChange(null);
							} else {
								const date = new Date(value);
								onEndDateChange(isNaN(date.getTime()) ? null : date);
							}
						}}
						leftSection={<IconCalendar size={16} />}
						minDate={startDate || undefined}
						disabled={disabled}
						clearable
						w={140}
					/>
				</Group>
			</div>
		</Group>
	);
}