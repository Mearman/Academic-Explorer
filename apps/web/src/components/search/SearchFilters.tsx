import {
  Accordion,
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  RangeSlider,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconCalendar,
  IconFilter,
  IconHash,
  IconMath,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";

export interface AdvancedSearchFilters {
  // Text filters
  title?: string;
  abstract?: string;
  author?: string;
  institution?: string;
  venue?: string;
  keywords?: string;

  // Date filters
  publicationYear?: {
    from?: number;
    to?: number;
  };

  // Type filters
  entityType?: string[];
  publicationType?: string[];
  openAccess?: boolean;

  // Citation filters
  citationCount?: {
    from?: number;
    to?: number;
  };

  // Field of study
  fieldOfStudy?: string[];
  concepts?: string[];

  // Language
  language?: string[];
}

interface SearchFiltersProps {
  filters: AdvancedSearchFilters;
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
  onReset: () => void;
}

const ENTITY_TYPES = [
  { value: "works", label: "Works (Papers, Books, etc.)" },
  { value: "authors", label: "Authors" },
  { value: "institutions", label: "Institutions" },
  { value: "venues", label: "Venues (Journals, Conferences)" },
  { value: "concepts", label: "Concepts & Topics" },
];

const PUBLICATION_TYPES = [
  { value: "journal-article", label: "Journal Article" },
  { value: "book", label: "Book" },
  { value: "book-chapter", label: "Book Chapter" },
  { value: "conference-paper", label: "Conference Paper" },
  { value: "dissertation", label: "Dissertation/Thesis" },
  { value: "patent", label: "Patent" },
  { value: "preprint", label: "Preprint" },
  { value: "report", label: "Report" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
];

const COMMON_FIELDS = [
  { value: "Computer Science", label: "Computer Science" },
  { value: "Medicine", label: "Medicine" },
  { value: "Biology", label: "Biology" },
  { value: "Chemistry", label: "Chemistry" },
  { value: "Physics", label: "Physics" },
  { value: "Mathematics", label: "Mathematics" },
  { value: "Engineering", label: "Engineering" },
  { value: "Psychology", label: "Psychology" },
  { value: "Economics", label: "Economics" },
  { value: "Sociology", label: "Sociology" },
];

export const SearchFilters = ({
  filters,
  onFiltersChange,
  onReset,
}: SearchFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<AdvancedSearchFilters>(filters);

  const updateFilter = useCallback((
    field: keyof AdvancedSearchFilters,
    value: AdvancedSearchFilters[keyof AdvancedSearchFilters]
  ) => {
    const updated = { ...localFilters, [field]: value };
    setLocalFilters(updated);
    onFiltersChange(updated);
  }, [localFilters, onFiltersChange]);

  const hasActiveFilters = useCallback(() => {
    return Object.entries(localFilters).some(([_key, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "object") {
        return Object.values(value).some(v => v !== undefined && v !== null && v !== "");
      }
      return true;
    });
  }, [localFilters]);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    Object.entries(localFilters).forEach(([_key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (Array.isArray(value)) count += value.length;
      else if (typeof value === "object") {
        count += Object.values(value).filter(v => v !== undefined && v !== null && v !== "").length;
      } else count++;
    });
    return count;
  }, [localFilters]);

  const activeFilterCount = getActiveFilterCount();

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconFilter size={20} />
            <Title order={4}>Advanced Filters</Title>
            {activeFilterCount > 0 && (
              <Badge size="sm" color="blue" variant="filled">
                {activeFilterCount} active
              </Badge>
            )}
          </Group>

          <Group gap="xs">
            {hasActiveFilters() && (
              <Button
                variant="outline"
                size="sm"
                leftSection={<IconX size={14} />}
                onClick={onReset}
              >
                Clear All
              </Button>
            )}
          </Group>
        </Group>

        {/* Filters */}
        <Accordion
          variant="contained"
          radius="md"
          defaultValue={["text", "dates"]}
          multiple
        >
          {/* Text-based Filters */}
          <Accordion.Item value="text">
            <Accordion.Control icon={<IconHash size={16} />}>
              Text Search
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <TextInput
                  label="Title"
                  placeholder="Search in title only"
                  value={localFilters.title || ""}
                  onChange={(e) => updateFilter("title", e.target.value)}
                  rightSection={
                    localFilters.title && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => updateFilter("title", "")}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )
                  }
                />

                <TextInput
                  label="Abstract"
                  placeholder="Search in abstract only"
                  value={localFilters.abstract || ""}
                  onChange={(e) => updateFilter("abstract", e.target.value)}
                  rightSection={
                    localFilters.abstract && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => updateFilter("abstract", "")}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )
                  }
                />

                <TextInput
                  label="Author"
                  placeholder="Search by author name"
                  value={localFilters.author || ""}
                  onChange={(e) => updateFilter("author", e.target.value)}
                  rightSection={
                    localFilters.author && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => updateFilter("author", "")}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )
                  }
                />

                <TextInput
                  label="Institution"
                  placeholder="Search by institution name"
                  value={localFilters.institution || ""}
                  onChange={(e) => updateFilter("institution", e.target.value)}
                  rightSection={
                    localFilters.institution && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => updateFilter("institution", "")}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )
                  }
                />

                <TextInput
                  label="Venue"
                  placeholder="Journal or conference name"
                  value={localFilters.venue || ""}
                  onChange={(e) => updateFilter("venue", e.target.value)}
                  rightSection={
                    localFilters.venue && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => updateFilter("venue", "")}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )
                  }
                />

                <TextInput
                  label="Keywords"
                  placeholder="Comma-separated keywords"
                  value={localFilters.keywords || ""}
                  onChange={(e) => updateFilter("keywords", e.target.value)}
                  rightSection={
                    localFilters.keywords && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => updateFilter("keywords", "")}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )
                  }
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Date and Citation Filters */}
          <Accordion.Item value="dates">
            <Accordion.Control icon={<IconCalendar size={16} />}>
              Date & Citation Metrics
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <div>
                  <Text size="sm" fw={500} mb="xs">
                    Publication Year
                  </Text>
                  <RangeSlider
                    min={1900}
                    max={2024}
                    value={[
                      localFilters.publicationYear?.from || 1900,
                      localFilters.publicationYear?.to || 2024,
                    ]}
                    onChange={([from, to]) =>
                      updateFilter("publicationYear", { from, to })
                    }
                    label={(value) => value.toString()}
                    marks={[
                      { value: 1900, label: "1900" },
                      { value: 1950, label: "1950" },
                      { value: 2000, label: "2000" },
                      { value: 2020, label: "2020" },
                      { value: 2024, label: "2024" },
                    ]}
                  />
                </div>

                <div>
                  <Text size="sm" fw={500} mb="xs">
                    Citation Count
                  </Text>
                  <Group grow>
                    <NumberInput
                      placeholder="From"
                      min={0}
                      value={localFilters.citationCount?.from}
                      onChange={(value) =>
                        updateFilter("citationCount", {
                          ...localFilters.citationCount,
                          from: typeof value === "number" ? value : undefined,
                        })
                      }
                    />
                    <NumberInput
                      placeholder="To"
                      min={0}
                      value={localFilters.citationCount?.to}
                      onChange={(value) =>
                        updateFilter("citationCount", {
                          ...localFilters.citationCount,
                          to: typeof value === "number" ? value : undefined,
                        })
                      }
                    />
                  </Group>
                </div>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Type and Classification Filters */}
          <Accordion.Item value="types">
            <Accordion.Control icon={<IconMath size={16} />}>
              Types & Classification
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <MultiSelect
                  label="Entity Types"
                  placeholder="Select types to search"
                  data={ENTITY_TYPES}
                  value={localFilters.entityType || []}
                  onChange={(value) => updateFilter("entityType", value)}
                />

                <MultiSelect
                  label="Publication Types"
                  placeholder="Select publication types"
                  data={PUBLICATION_TYPES}
                  value={localFilters.publicationType || []}
                  onChange={(value) => updateFilter("publicationType", value)}
                />

                <MultiSelect
                  label="Languages"
                  placeholder="Select languages"
                  data={LANGUAGES}
                  value={localFilters.language || []}
                  onChange={(value) => updateFilter("language", value)}
                  searchable
                />

                <MultiSelect
                  label="Fields of Study"
                  placeholder="Select academic fields"
                  data={COMMON_FIELDS}
                  value={localFilters.fieldOfStudy || []}
                  onChange={(value) => updateFilter("fieldOfStudy", value)}
                  searchable
                />

                <Checkbox
                  label="Open Access only"
                  checked={localFilters.openAccess || false}
                  onChange={(e) => updateFilter("openAccess", e.currentTarget.checked)}
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Concept-based Filters */}
          <Accordion.Item value="concepts">
            <Accordion.Control icon={<IconUsers size={16} />}>
              Concepts & Topics
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Search for specific academic concepts, topics, or research areas.
                  This helps find papers that discuss particular themes or methodologies.
                </Text>

                <MultiSelect
                  label="Concepts"
                  placeholder="e.g., Machine Learning, Climate Change, COVID-19"
                  data={COMMON_FIELDS}
                  value={localFilters.concepts || []}
                  onChange={(value) => updateFilter("concepts", value)}
                  searchable
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        {/* Active Filters Summary */}
        {hasActiveFilters() && (
          <Paper p="sm" bg="blue.0" withBorder style={{ borderColor: "var(--mantine-color-blue-2)" }}>
            <Text size="sm" fw={500} mb="xs">
              Active Filters:
            </Text>
            <Group gap="xs" wrap="wrap">
              {Object.entries(localFilters).map(([key, _value]) => {
                const value = localFilters[key];
                if (!value || (Array.isArray(value) && value.length === 0)) return null;

                const formatValue = (k: string, v: unknown): string => {
                  switch (k) {
                    case "entityType":
                    case "publicationType":
                    case "language":
                    case "fieldOfStudy":
                    case "concepts":
                      return `${k}: ${Array.isArray(v) ? v.join(", ") : v}`;
                    case "publicationYear":
                      if (typeof v === "object" && v.from && v.to) {
                        return `year: ${v.from}-${v.to}`;
                      }
                      return "";
                    case "citationCount":
                      if (typeof v === "object" && (v.from || v.to)) {
                        return `citations: ${v.from || "0"}-${v.to || "∞"}`;
                      }
                      return "";
                    case "openAccess":
                      return v ? "Open Access" : "";
                    default:
                      if (typeof v === "string") return `${k}: ${v}`;
                      return "";
                  }
                };

                const formatted = formatValue(key, value);
                if (!formatted) return null;

                return (
                  <Badge
                    key={key}
                    size="sm"
                    variant="light"
                    color="blue"
                    styles={{
                      root: { cursor: "default" },
                    }}
                  >
                    {formatted}
                  </Badge>
                );
              })}
            </Group>
          </Paper>
        )}
      </Stack>
    </Paper>
  );
};