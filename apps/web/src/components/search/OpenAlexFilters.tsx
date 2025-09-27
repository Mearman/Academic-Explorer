import { Group, NumberInput, Select, Stack, Text } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconCalendar, IconHash, IconShield } from "@tabler/icons-react";

// OpenAlex filter state interface
export interface OpenAlexFilterState {
  // Date range filters
  fromPublicationDate: Date | null;
  toPublicationDate: Date | null;

  // Citation count range
  minCitationCount: number | string;
  maxCitationCount: number | string;

  // Open access status
  openAccessStatus: string | null;
}

// Component props interface
export interface OpenAlexFiltersProps {
  filters: OpenAlexFilterState;
  onFiltersChange: (filters: Partial<OpenAlexFilterState>) => void;
  disabled?: boolean;
  compact?: boolean;
}

// Open access options for the select dropdown
const OPEN_ACCESS_OPTIONS = [
  { value: "", label: "Any" },
  { value: "true", label: "Open Access Only" },
  { value: "false", label: "Non-Open Access Only" },
] as const;

export function OpenAlexFilters({
  filters,
  onFiltersChange,
  disabled = false,
  compact = false,
}: OpenAlexFiltersProps) {

  // Publication date range handlers
  const handleFromDateChange = (value: string | null) => {
    onFiltersChange({
      fromPublicationDate: value ? new Date(value) : null,
    });
  };

  const handleToDateChange = (value: string | null) => {
    onFiltersChange({
      toPublicationDate: value ? new Date(value) : null,
    });
  };

  // Citation count handlers
  const handleMinCitationChange = (value: string | number) => {
    onFiltersChange({
      minCitationCount: value,
    });
  };

  const handleMaxCitationChange = (value: string | number) => {
    onFiltersChange({
      maxCitationCount: value,
    });
  };

  // Open access status handler
  const handleOpenAccessChange = (value: string | null) => {
    onFiltersChange({
      openAccessStatus: value,
    });
  };

  return (
    <Stack gap={compact ? "sm" : "md"}>
      {/* Publication Date Range Filter */}
      <Group align="flex-end">
        <div>
          <Text size="sm" fw={500} mb={5}>
            Publication Date Range
          </Text>
          <Group gap="xs">
            <DatePickerInput
              placeholder="From date"
              value={filters.fromPublicationDate}
              onChange={handleFromDateChange}
              leftSection={<IconCalendar size={16} />}
              maxDate={filters.toPublicationDate || undefined}
              disabled={disabled}
              clearable
              w={compact ? 120 : 140}
              size={compact ? "sm" : "md"}
              aria-label="Publication start date"
            />

            <Text c="dimmed" size="sm">
              to
            </Text>

            <DatePickerInput
              placeholder="To date"
              value={filters.toPublicationDate}
              onChange={handleToDateChange}
              leftSection={<IconCalendar size={16} />}
              minDate={filters.fromPublicationDate || undefined}
              disabled={disabled}
              clearable
              w={compact ? 120 : 140}
              size={compact ? "sm" : "md"}
              aria-label="Publication end date"
            />
          </Group>
        </div>
      </Group>

      {/* Citation Count Range Filter */}
      <Group align="flex-end">
        <div>
          <Text size="sm" fw={500} mb={5}>
            Citation Count Range
          </Text>
          <Group gap="xs">
            <NumberInput
              placeholder="Min citations"
              value={filters.minCitationCount}
              onChange={handleMinCitationChange}
              leftSection={<IconHash size={16} />}
              min={0}
              max={typeof filters.maxCitationCount === 'number' ? filters.maxCitationCount : undefined}
              disabled={disabled}
              allowNegative={false}
              allowDecimal={false}
              w={compact ? 110 : 130}
              size={compact ? "sm" : "md"}
              aria-label="Minimum citation count"
            />

            <Text c="dimmed" size="sm">
              to
            </Text>

            <NumberInput
              placeholder="Max citations"
              value={filters.maxCitationCount}
              onChange={handleMaxCitationChange}
              leftSection={<IconHash size={16} />}
              min={typeof filters.minCitationCount === 'number' ? filters.minCitationCount : 0}
              disabled={disabled}
              allowNegative={false}
              allowDecimal={false}
              w={compact ? 110 : 130}
              size={compact ? "sm" : "md"}
              aria-label="Maximum citation count"
            />
          </Group>
        </div>
      </Group>

      {/* Open Access Status Filter */}
      <Group align="flex-end">
        <div>
          <Text size="sm" fw={500} mb={5}>
            Open Access Status
          </Text>
          <Select
            placeholder="Select access type"
            value={filters.openAccessStatus}
            onChange={handleOpenAccessChange}
            data={OPEN_ACCESS_OPTIONS}
            leftSection={<IconShield size={16} />}
            disabled={disabled}
            clearable
            w={compact ? 160 : 180}
            size={compact ? "sm" : "md"}
            aria-label="Open access status filter"
          />
        </div>
      </Group>
    </Stack>
  );
}

// Default filter state for convenience
export const DEFAULT_OPENALEX_FILTERS: OpenAlexFilterState = {
  fromPublicationDate: null,
  toPublicationDate: null,
  minCitationCount: "",
  maxCitationCount: "",
  openAccessStatus: null,
};

// Utility function to convert filters to OpenAlex API format
export function convertToOpenAlexAPIFilters(filters: OpenAlexFilterState): Record<string, unknown> {
  const apiFilters: Record<string, unknown> = {};

  // Convert date filters
  if (filters.fromPublicationDate) {
    apiFilters["from_publication_date"] = filters.fromPublicationDate.toISOString().split('T')[0];
  }

  if (filters.toPublicationDate) {
    apiFilters["to_publication_date"] = filters.toPublicationDate.toISOString().split('T')[0];
  }

  // Convert citation count filters
  if (filters.minCitationCount !== "" && filters.maxCitationCount !== "") {
    // Both min and max specified - use range format
    apiFilters["cited_by_count"] = `${filters.minCitationCount}-${filters.maxCitationCount}`;
  } else if (filters.minCitationCount !== "") {
    // Only min specified - use >= format
    apiFilters["cited_by_count"] = `>=${filters.minCitationCount}`;
  } else if (filters.maxCitationCount !== "") {
    // Only max specified - use <= format
    apiFilters["cited_by_count"] = `<=${filters.maxCitationCount}`;
  }

  // Convert open access filter
  if (filters.openAccessStatus && filters.openAccessStatus !== "") {
    apiFilters["is_oa"] = filters.openAccessStatus === "true";
  }

  return apiFilters;
}

// Utility function to validate filter state
export function validateOpenAlexFilters(filters: OpenAlexFilterState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate date range
  if (filters.fromPublicationDate && filters.toPublicationDate) {
    if (filters.fromPublicationDate > filters.toPublicationDate) {
      errors.push("Publication start date must be before end date");
    }
  }

  // Validate citation count range
  const minCitations = typeof filters.minCitationCount === 'number' ? filters.minCitationCount : parseInt(String(filters.minCitationCount));
  const maxCitations = typeof filters.maxCitationCount === 'number' ? filters.maxCitationCount : parseInt(String(filters.maxCitationCount));

  if (!isNaN(minCitations) && !isNaN(maxCitations)) {
    if (minCitations > maxCitations) {
      errors.push("Minimum citation count must be less than or equal to maximum");
    }
  }

  if (!isNaN(minCitations) && minCitations < 0) {
    errors.push("Citation count cannot be negative");
  }

  if (!isNaN(maxCitations) && maxCitations < 0) {
    errors.push("Citation count cannot be negative");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}