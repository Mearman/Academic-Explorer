import { useState, useCallback } from "react";
import { Stack, TextInput, Group, Paper, Title, Button } from "@mantine/core";
import {
  IconSearch,
  IconUser,
  IconBuilding,
  IconBook,
  IconFileText,
} from "@tabler/icons-react";

/**
 * Structure for field-specific search values
 */
interface FieldSearchValues {
  title: string;
  abstract: string;
  author: string;
  institution: string;
}

/**
 * Props for the FieldSearch component
 */
interface FieldSearchProps {
  /** Callback when search values change */
  onChange?: (values: FieldSearchValues) => void;
  /** Callback when search is triggered */
  onSearch?: (values: FieldSearchValues) => void;
  /** Whether the search is currently loading */
  isLoading?: boolean;
  /** Initial values for the search fields */
  initialValues?: Partial<FieldSearchValues>;
  /** Whether to show the search button */
  showSearchButton?: boolean;
  /** Custom placeholder text for each field */
  placeholders?: Partial<Record<keyof FieldSearchValues, string>>;
}

/**
 * Default placeholder text for each search field
 */
const DEFAULT_PLACEHOLDERS: Record<keyof FieldSearchValues, string> = {
  title: "Search by title...",
  abstract: "Search by abstract content...",
  author: "Search by author name...",
  institution: "Search by institution name...",
};

/**
 * Field-specific search input component with separate inputs for title, abstract, author, and institution searches.
 * Provides a structured interface for targeted academic literature searches.
 */
export function FieldSearch({
  onChange,
  onSearch,
  isLoading = false,
  initialValues = {},
  showSearchButton = true,
  placeholders = {},
}: FieldSearchProps) {
  // Initialize state with default empty values merged with initial values
  const [searchValues, setSearchValues] = useState<FieldSearchValues>({
    title: initialValues.title ?? "",
    abstract: initialValues.abstract ?? "",
    author: initialValues.author ?? "",
    institution: initialValues.institution ?? "",
  });

  // Merge default placeholders with custom ones
  const finalPlaceholders = { ...DEFAULT_PLACEHOLDERS, ...placeholders };

  /**
   * Handle changes to individual search fields
   */
  const handleFieldChange = useCallback(
    ({ field, value }) => {
      const newValues = { ...searchValues, [field]: value };
      setSearchValues(newValues);
      onChange?.(newValues);
    },
    [searchValues, onChange],
  );

  /**
   * Handle search trigger
   */
  const handleSearch = useCallback(() => {
    onSearch?.(searchValues);
  }, [searchValues, onSearch]);

  /**
   * Clear all search fields
   */
  const handleClear = useCallback(() => {
    const emptyValues: FieldSearchValues = {
      title: "",
      abstract: "",
      author: "",
      institution: "",
    };
    setSearchValues(emptyValues);
    onChange?.(emptyValues);
  }, [onChange]);

  /**
   * Check if any field has a value
   */
  const hasAnyValue = Object.values(searchValues).some(
    (value) => value.trim() !== "",
  );

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Title order={3}>Field-Specific Search</Title>

        <Stack gap="sm">
          {/* Title Search */}
          <TextInput
            label="Title"
            placeholder={finalPlaceholders.title}
            leftSection={<IconBook size={16} />}
            value={searchValues.title}
            onChange={(e) =>
              handleFieldChange({ field: "title", value: e.target.value })
            }
            disabled={isLoading}
            size="md"
            aria-label="Search by work title"
          />

          {/* Abstract Search */}
          <TextInput
            label="Abstract"
            placeholder={finalPlaceholders.abstract}
            leftSection={<IconFileText size={16} />}
            value={searchValues.abstract}
            onChange={(e) =>
              handleFieldChange({ field: "abstract", value: e.target.value })
            }
            disabled={isLoading}
            size="md"
            aria-label="Search by abstract content"
          />

          {/* Author Search */}
          <TextInput
            label="Author"
            placeholder={finalPlaceholders.author}
            leftSection={<IconUser size={16} />}
            value={searchValues.author}
            onChange={(e) =>
              handleFieldChange({ field: "author", value: e.target.value })
            }
            disabled={isLoading}
            size="md"
            aria-label="Search by author name"
          />

          {/* Institution Search */}
          <TextInput
            label="Institution"
            placeholder={finalPlaceholders.institution}
            leftSection={<IconBuilding size={16} />}
            value={searchValues.institution}
            onChange={(e) =>
              handleFieldChange({ field: "institution", value: e.target.value })
            }
            disabled={isLoading}
            size="md"
            aria-label="Search by institution name"
          />
        </Stack>

        {(showSearchButton || hasAnyValue) && (
          <Group justify="flex-end">
            {hasAnyValue && (
              <Button
                variant="subtle"
                onClick={handleClear}
                disabled={isLoading}
                size="sm"
              >
                Clear All
              </Button>
            )}

            {showSearchButton && (
              <Button
                onClick={handleSearch}
                loading={isLoading}
                leftSection={<IconSearch size={16} />}
                disabled={!hasAnyValue}
              >
                Search
              </Button>
            )}
          </Group>
        )}
      </Stack>
    </Paper>
  );
}

export type { FieldSearchValues, FieldSearchProps };
