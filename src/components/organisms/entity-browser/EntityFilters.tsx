'use client';

import {
  Group,
  Select,
  NumberInput,
  Switch,
  TextInput,
  MultiSelect,
  Stack,
  Text,
  Paper,
} from '@mantine/core';
import { useMemo, useCallback } from 'react';

import { EntityType } from '@/lib/openalex/utils/entity-detection';

import * as styles from './entity-browser.css';

interface EntityFiltersProps {
  entityType: EntityType;
  filters: Record<string, unknown>;
  onChange: (filters: Record<string, unknown>) => void;
}

export function EntityFilters({ entityType, filters, onChange }: EntityFiltersProps) {
  const updateFilter = useCallback((key: string, value: unknown) => {
    const newFilters = { ...filters };
    
    if (value === null || value === undefined || value === '' || 
        (Array.isArray(value) && value.length === 0)) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    
    onChange(newFilters);
  }, [filters, onChange]);

  const filterConfig = useMemo(() => {
    switch (entityType) {
      case 'author':
        return {
          numeric: [
            { key: 'cited_by_count', label: 'Citations', min: 0 },
            { key: 'works_count', label: 'Works', min: 0 },
            { key: 'h_index', label: 'H-Index', min: 0 },
            { key: 'i10_index', label: 'i10-Index', min: 0 },
          ],
          select: [
            {
              key: 'has_orcid',
              label: 'Has ORCID',
              options: [
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ],
            },
          ],
          text: [
            { key: 'affiliations.institution.country_code', label: 'Institution Country' },
          ],
        };

      case 'institution':
        return {
          numeric: [
            { key: 'cited_by_count', label: 'Citations', min: 0 },
            { key: 'works_count', label: 'Works', min: 0 },
          ],
          select: [
            {
              key: 'type',
              label: 'Institution Type',
              options: [
                { value: 'education', label: 'Education' },
                { value: 'healthcare', label: 'Healthcare' },
                { value: 'company', label: 'Company' },
                { value: 'archive', label: 'Archive' },
                { value: 'nonprofit', label: 'Nonprofit' },
                { value: 'government', label: 'Government' },
                { value: 'facility', label: 'Facility' },
                { value: 'other', label: 'Other' },
              ],
            },
            {
              key: 'continent',
              label: 'Continent',
              options: [
                { value: 'africa', label: 'Africa' },
                { value: 'asia', label: 'Asia' },
                { value: 'europe', label: 'Europe' },
                { value: 'north_america', label: 'North America' },
                { value: 'oceania', label: 'Oceania' },
                { value: 'south_america', label: 'South America' },
              ],
            },
          ],
          text: [
            { key: 'country_code', label: 'Country Code (e.g., US, GB)' },
          ],
          boolean: [
            { key: 'is_super_system', label: 'Is Super System' },
          ],
        };

      case 'source':
        return {
          numeric: [
            { key: 'cited_by_count', label: 'Citations', min: 0 },
            { key: 'works_count', label: 'Works', min: 0 },
            { key: 'h_index', label: 'H-Index', min: 0 },
          ],
          select: [
            {
              key: 'type',
              label: 'Source Type',
              options: [
                { value: 'journal', label: 'Journal' },
                { value: 'conference', label: 'Conference' },
                { value: 'repository', label: 'Repository' },
                { value: 'ebook_platform', label: 'Ebook Platform' },
                { value: 'book_series', label: 'Book Series' },
                { value: 'book', label: 'Book' },
              ],
            },
          ],
          boolean: [
            { key: 'is_oa', label: 'Open Access' },
            { key: 'is_in_doaj', label: 'In DOAJ' },
          ],
        };

      case 'topic':
        return {
          numeric: [
            { key: 'cited_by_count', label: 'Citations', min: 0 },
            { key: 'works_count', label: 'Works', min: 0 },
          ],
          select: [
            {
              key: 'level',
              label: 'Topic Level',
              options: [
                { value: '0', label: 'Domain (Level 0)' },
                { value: '1', label: 'Field (Level 1)' },
                { value: '2', label: 'Subfield (Level 2)' },
                { value: '3', label: 'Topic (Level 3)' },
              ],
            },
          ],
        };

      case 'funder':
        return {
          numeric: [
            { key: 'cited_by_count', label: 'Citations', min: 0 },
            { key: 'works_count', label: 'Works', min: 0 },
            { key: 'grants_count', label: 'Grants', min: 0 },
          ],
          text: [
            { key: 'country_code', label: 'Country Code (e.g., US, GB)' },
          ],
        };

      case 'publisher':
        return {
          numeric: [
            { key: 'cited_by_count', label: 'Citations', min: 0 },
            { key: 'works_count', label: 'Works', min: 0 },
          ],
          multiSelect: [
            {
              key: 'country_codes',
              label: 'Country Codes',
              options: [
                { value: 'US', label: 'United States' },
                { value: 'GB', label: 'United Kingdom' },
                { value: 'DE', label: 'Germany' },
                { value: 'NL', label: 'Netherlands' },
                { value: 'CH', label: 'Switzerland' },
                { value: 'FR', label: 'France' },
                { value: 'CA', label: 'Canada' },
                { value: 'AU', label: 'Australia' },
              ],
            },
          ],
        };

      case 'concept':
        return {
          numeric: [
            { key: 'cited_by_count', label: 'Citations', min: 0 },
            { key: 'works_count', label: 'Works', min: 0 },
            { key: 'level', label: 'Concept Level', min: 0, max: 5 },
          ],
        };

      case 'work':
        return {
          numeric: [
            { key: 'cited_by_count', label: 'Citations', min: 0 },
            { key: 'publication_year', label: 'Publication Year', min: 1000, max: new Date().getFullYear() },
          ],
          boolean: [
            { key: 'is_oa', label: 'Open Access' },
            { key: 'has_fulltext', label: 'Has Full Text' },
            { key: 'has_doi', label: 'Has DOI' },
            { key: 'has_abstract', label: 'Has Abstract' },
          ],
          select: [
            {
              key: 'type',
              label: 'Work Type',
              options: [
                { value: 'article', label: 'Article' },
                { value: 'book', label: 'Book' },
                { value: 'book-chapter', label: 'Book Chapter' },
                { value: 'dataset', label: 'Dataset' },
                { value: 'dissertation', label: 'Dissertation' },
                { value: 'preprint', label: 'Preprint' },
                { value: 'other', label: 'Other' },
              ],
            },
          ],
        };

      default:
        return { numeric: [], select: [], text: [], boolean: [], multiSelect: [] };
    }
  }, [entityType]);

  if (!filterConfig.numeric?.length && !filterConfig.select?.length && 
      !filterConfig.text?.length && !filterConfig.boolean?.length && 
      !filterConfig.multiSelect?.length) {
    return (
      <Paper p="md" withBorder className={styles.filterSection}>
        <Text size="sm" c="dimmed" ta="center">
          No filters available for {entityType.toLowerCase()}s
        </Text>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder className={styles.filterSection}>
      <Text size="sm" fw={500} mb="md">
        Filter {entityType.charAt(0) + entityType.slice(1).toLowerCase()}s
      </Text>
      
      <Stack gap="md">
        {/* Numeric Filters */}
        {filterConfig.numeric && filterConfig.numeric.length > 0 && (
          <div className={styles.filterRow}>
            {filterConfig.numeric.map((filter) => (
              <Group key={filter.key} gap="xs">
                <NumberInput
                  label={`Min ${filter.label}`}
                  placeholder="Min"
                  min={filter.min}
                  max={'max' in filter ? filter.max : undefined}
                  value={filters[`${filter.key}_min`] as number || ''}
                  onChange={(value) => updateFilter(`${filter.key}_min`, value)}
                  size="sm"
                  style={{ flex: 1 }}
                />
                <NumberInput
                  label={`Max ${filter.label}`}
                  placeholder="Max"
                  min={filter.min}
                  max={'max' in filter ? filter.max : undefined}
                  value={filters[`${filter.key}_max`] as number || ''}
                  onChange={(value) => updateFilter(`${filter.key}_max`, value)}
                  size="sm"
                  style={{ flex: 1 }}
                />
              </Group>
            ))}
          </div>
        )}

        {/* Select Filters */}
        {filterConfig.select && filterConfig.select.length > 0 && (
          <div className={styles.filterRow}>
            {filterConfig.select.map((filter) => (
              <Select
                key={filter.key}
                label={filter.label}
                placeholder={`Select ${filter.label.toLowerCase()}`}
                data={filter.options}
                value={filters[filter.key] as string || null}
                onChange={(value) => updateFilter(filter.key, value)}
                clearable
                size="sm"
              />
            ))}
          </div>
        )}

        {/* Multi Select Filters */}
        {filterConfig.multiSelect && filterConfig.multiSelect.length > 0 && (
          <div className={styles.filterRow}>
            {filterConfig.multiSelect.map((filter) => (
              <MultiSelect
                key={filter.key}
                label={filter.label}
                placeholder={`Select ${filter.label.toLowerCase()}`}
                data={filter.options}
                value={filters[filter.key] as string[] || []}
                onChange={(value) => updateFilter(filter.key, value)}
                clearable
                size="sm"
              />
            ))}
          </div>
        )}

        {/* Text Filters */}
        {filterConfig.text && filterConfig.text.length > 0 && (
          <div className={styles.filterRow}>
            {filterConfig.text.map((filter) => (
              <TextInput
                key={filter.key}
                label={filter.label}
                placeholder={`Enter ${filter.label.toLowerCase()}`}
                value={filters[filter.key] as string || ''}
                onChange={(e) => updateFilter(filter.key, e.target.value)}
                size="sm"
              />
            ))}
          </div>
        )}

        {/* Boolean Filters */}
        {filterConfig.boolean && filterConfig.boolean.length > 0 && (
          <Group gap="lg">
            {filterConfig.boolean.map((filter) => (
              <Switch
                key={filter.key}
                label={filter.label}
                checked={filters[filter.key] as boolean || false}
                onChange={(event) => updateFilter(filter.key, event.currentTarget.checked)}
                size="sm"
              />
            ))}
          </Group>
        )}
      </Stack>
    </Paper>
  );
}