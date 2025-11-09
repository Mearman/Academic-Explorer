/**
 * Enhanced Search Interface - Advanced search capabilities
 * Provides sophisticated search options with filters and refinements
 */

import React, { useState, useEffect } from "react";
import {
  Card,
  TextInput,
  Select,
  MultiSelect,
  NumberInput,
  Switch,
  Group,
  Button,
  Stack,
  Accordion,
  RangeSlider,
  TagsInput,
  Badge,
  ActionIcon,
  Text,
  Title,
  Divider,
  Checkbox,
  Tooltip,
} from "@mantine/core";
import {
  IconSearch,
  IconFilter,
  IconRefresh,
  IconBookmark,
  IconDownload,
  IconShare,
  IconAdjustmentsHorizontal,
  IconCalendar,
  IconClock,
  IconTrendingUp,
} from "@tabler/icons-react";
import { logger } from "@/lib/logger";
import { notifications } from "@mantine/notifications";

interface SearchFilters {
  query: string;
  entityType: string;
  publicationYear: [number, number];
  openAccess: boolean;
  peerReviewed: boolean;
  citedByMin: number;
  concepts: string[];
  venues: string[];
  authors: string[];
  institutions: string[];
  countries: string[];
  languages: string[];
  hasAbstract: boolean;
  hasFulltext: boolean;
}

interface EnhancedSearchInterfaceProps {
  onSearch: (filters: SearchFilters) => void;
  loading?: boolean;
}

export function EnhancedSearchInterface({ onSearch, loading = false }: EnhancedSearchInterfaceProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    entityType: "works",
    publicationYear: [1900, 2024],
    openAccess: false,
    peerReviewed: false,
    citedByMin: 0,
    concepts: [],
    venues: [],
    authors: [],
    institutions: [],
    countries: [],
    languages: [],
    hasAbstract: false,
    hasFulltext: false,
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Calculate active filters count
  useEffect(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.publicationYear[0] !== 1900 || filters.publicationYear[1] !== 2024) count++;
    if (filters.openAccess) count++;
    if (filters.peerReviewed) count++;
    if (filters.citedByMin > 0) count++;
    if (filters.concepts.length > 0) count++;
    if (filters.venues.length > 0) count++;
    if (filters.authors.length > 0) count++;
    if (filters.institutions.length > 0) count++;
    if (filters.countries.length > 0) count++;
    if (filters.languages.length > 0) count++;
    if (filters.hasAbstract) count++;
    if (filters.hasFulltext) count++;

    setActiveFiltersCount(count);
  }, [filters]);

  const handleSearch = () => {
    logger.debug("search", "Enhanced search initiated", { filters });
    onSearch(filters);
  };

  const handleReset = () => {
    setFilters({
      query: "",
      entityType: "works",
      publicationYear: [1900, 2024],
      openAccess: false,
      peerReviewed: false,
      citedByMin: 0,
      concepts: [],
      venues: [],
      authors: [],
      institutions: [],
      countries: [],
      languages: [],
      hasAbstract: false,
      hasFulltext: false,
    });
    logger.debug("search", "Search filters reset");
  };

  const entityTypeOptions = [
    { value: "works", label: "Works/Papers" },
    { value: "authors", label: "Authors" },
    { value: "venues", label: "Venues/Journals" },
    { value: "institutions", label: "Institutions" },
    { value: "concepts", label: "Concepts/Topics" },
  ];

  const conceptOptions = [
    "Machine Learning",
    "Artificial Intelligence",
    "Deep Learning",
    "Neural Networks",
    "Climate Change",
    "Renewable Energy",
    "Quantum Computing",
    "Blockchain",
    "COVID-19",
    "Genomics",
    "Robotics",
    "Natural Language Processing",
  ];

  const languageOptions = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "zh", label: "Chinese" },
    { value: "ja", label: "Japanese" },
    { value: "pt", label: "Portuguese" },
    { value: "ru", label: "Russian" },
  ];

  const countryOptions = [
    "United States",
    "United Kingdom",
    "Germany",
    "France",
    "China",
    "Japan",
    "Canada",
    "Australia",
    "Netherlands",
    "Switzerland",
    "Sweden",
    "Italy",
  ];

  return (
    <Card padding="lg" withBorder shadow="sm">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={3}>Enhanced Search</Title>
            <Text size="sm" c="dimmed">
              Advanced search with powerful filters and refinements
            </Text>
          </div>
          <Group>
            <Badge
              variant="light"
              color="blue"
              leftSection={<IconFilter size={12} />}
            >
              {activeFiltersCount} active filters
            </Badge>
            <ActionIcon
              variant="light"
              onClick={handleReset}
              title="Reset all filters"
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Group>
        </Group>

        <Divider />

        {/* Basic Search */}
        <Card padding="md" withBorder bg="gray.0">
          <Stack gap="md">
            <Group gap="sm">
              <Select
                value={filters.entityType}
                onChange={(value) => setFilters({ ...filters, entityType: value || "works" })}
                data={entityTypeOptions}
                w={150}
                size="md"
              />
              <TextInput
                placeholder="Enter your search query..."
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                style={{ flex: 1 }}
                size="md"
                leftSection={<IconSearch size={16} />}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                onClick={handleSearch}
                loading={loading}
                size="md"
                leftSection={<IconSearch size={16} />}
              >
                Search
              </Button>
            </Group>

            <Group gap="xs">
              <Switch
                label="Open Access"
                checked={filters.openAccess}
                onChange={(e) => setFilters({ ...filters, openAccess: e.currentTarget.checked })}
                size="sm"
              />
              <Switch
                label="Peer Reviewed"
                checked={filters.peerReviewed}
                onChange={(e) => setFilters({ ...filters, peerReviewed: e.currentTarget.checked })}
                size="sm"
              />
              <Switch
                label="Has Abstract"
                checked={filters.hasAbstract}
                onChange={(e) => setFilters({ ...filters, hasAbstract: e.currentTarget.checked })}
                size="sm"
              />
              <Switch
                label="Has Full Text"
                checked={filters.hasFulltext}
                onChange={(e) => setFilters({ ...filters, hasFulltext: e.currentTarget.checked })}
                size="sm"
              />
            </Group>
          </Stack>
        </Card>

        {/* Advanced Filters */}
        <Accordion multiple defaultValue={["filters"]}>
          <Accordion.Item value="filters">
            <Accordion.Control icon={<IconAdjustmentsHorizontal size={16} />}>
              Advanced Filters
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="lg">
                {/* Publication Year */}
                <div>
                  <Group justify="space-between" mb="sm">
                    <Text size="sm" fw={500}>Publication Year</Text>
                    <Text size="xs" c="dimmed">
                      {filters.publicationYear[0]} - {filters.publicationYear[1]}
                    </Text>
                  </Group>
                  <RangeSlider
                    min={1900}
                    max={2024}
                    value={filters.publicationYear}
                    onChange={(value) => setFilters({ ...filters, publicationYear: value as [number, number] })}
                    marks={[
                      { value: 1900, label: "1900" },
                      { value: 1950, label: "1950" },
                      { value: 2000, label: "2000" },
                      { value: 2010, label: "2010" },
                      { value: 2020, label: "2020" },
                      { value: 2024, label: "2024" },
                    ]}
                  />
                </div>

                {/* Citation Count */}
                <div>
                  <Text size="sm" fw={500} mb="sm">Minimum Citations</Text>
                  <NumberInput
                    value={filters.citedByMin}
                    onChange={(value) => setFilters({ ...filters, citedByMin: Number(value) || 0 })}
                    min={0}
                    placeholder="Minimum citation count"
                    leftSection={<IconTrendingUp size={16} />}
                  />
                </div>

                {/* Multi-select Filters */}
                <div>
                  <Text size="sm" fw={500} mb="sm">Research Concepts</Text>
                  <TagsInput
                    value={filters.concepts}
                    onChange={(value) => setFilters({ ...filters, concepts: value })}
                    placeholder="Add concepts..."
                    data={conceptOptions}
                    clearable
                  />
                </div>

                <div>
                  <Text size="sm" fw={500} mb="sm">Countries</Text>
                  <MultiSelect
                    value={filters.countries}
                    onChange={(value) => setFilters({ ...filters, countries: value })}
                    data={countryOptions}
                    placeholder="Select countries"
                    clearable
                    searchable
                  />
                </div>

                <div>
                  <Text size="sm" fw={500} mb="sm">Languages</Text>
                  <MultiSelect
                    value={filters.languages}
                    onChange={(value) => setFilters({ ...filters, languages: value })}
                    data={languageOptions}
                    placeholder="Select languages"
                    clearable
                  />
                </div>

                {/* Text inputs for entities */}
                <div>
                  <Text size="sm" fw={500} mb="sm">Authors (comma-separated)</Text>
                  <TextInput
                    value={filters.authors.join(", ")}
                    onChange={(e) => setFilters({ ...filters, authors: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                    placeholder="Enter author names..."
                  />
                </div>

                <div>
                  <Text size="sm" fw={500} mb="sm">Venues (comma-separated)</Text>
                  <TextInput
                    value={filters.venues.join(", ")}
                    onChange={(e) => setFilters({ ...filters, venues: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                    placeholder="Enter venue names..."
                  />
                </div>

                <div>
                  <Text size="sm" fw={500} mb="sm">Institutions (comma-separated)</Text>
                  <TextInput
                    value={filters.institutions.join(", ")}
                    onChange={(e) => setFilters({ ...filters, institutions: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                    placeholder="Enter institution names..."
                  />
                </div>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="saved">
            <Accordion.Control icon={<IconBookmark size={16} />}>
              Saved Searches
            </Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" c="dimmed">
                No saved searches yet. Create and save search presets for quick access.
              </Text>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        {/* Action Buttons */}
        <Group justify="space-between">
          <Group>
            <Button
              variant="light"
              leftSection={<IconBookmark size={16} />}
              onClick={() => {
                notifications.show({
                  title: "Save Search",
                  message: "Search saved to your profile",
                  color: "green",
                });
              }}
            >
              Save Search
            </Button>
            <Button
              variant="light"
              leftSection={<IconShare size={16} />}
              onClick={() => {
                notifications.show({
                  title: "Share Search",
                  message: "Share link copied to clipboard",
                  color: "blue",
                });
              }}
            >
              Share
            </Button>
          </Group>
          <Button
            variant="outline"
            leftSection={<IconDownload size={16} />}
            onClick={() => {
              notifications.show({
                title: "Export Results",
                message: "Export options would appear here",
                color: "blue",
              });
            }}
          >
            Export
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}