import { Group, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCalendar } from '@tabler/icons-react';

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
            onChange={onStartDateChange as (value: string | null) => void}
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
            onChange={onEndDateChange as (value: string | null) => void}
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