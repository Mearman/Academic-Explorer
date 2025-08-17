'use client';

import { Select } from '@mantine/core';
import { IconSortDescending } from '@tabler/icons-react';
import { useMemo } from 'react';

import { EntityType } from '@/lib/openalex/utils/entity-detection';

interface EntitySortOptionsProps {
  entityType: EntityType;
  value: string;
  onChange: (value: string) => void;
}

export function EntitySortOptions({ entityType, value, onChange }: EntitySortOptionsProps) {
  const sortOptions = useMemo(() => {
    const commonOptions = [
      { value: 'cited_by_count:desc', label: 'Most Cited' },
      { value: 'cited_by_count:asc', label: 'Least Cited' },
      { value: 'works_count:desc', label: 'Most Works' },
      { value: 'works_count:asc', label: 'Least Works' },
      { value: 'display_name:asc', label: 'Name (A-Z)' },
      { value: 'display_name:desc', label: 'Name (Z-A)' },
    ];

    switch (entityType) {
      case 'author':
        return [
          ...commonOptions,
          { value: 'h_index:desc', label: 'Highest H-Index' },
          { value: 'h_index:asc', label: 'Lowest H-Index' },
          { value: 'i10_index:desc', label: 'Highest i10-Index' },
          { value: 'i10_index:asc', label: 'Lowest i10-Index' },
          { value: 'last_known_institution:asc', label: 'Institution (A-Z)' },
          { value: 'last_known_institution:desc', label: 'Institution (Z-A)' },
        ];

      case 'institution':
        return [
          ...commonOptions,
          { value: 'h_index:desc', label: 'Highest H-Index' },
          { value: 'h_index:asc', label: 'Lowest H-Index' },
          { value: 'country_code:asc', label: 'Country (A-Z)' },
          { value: 'country_code:desc', label: 'Country (Z-A)' },
          { value: 'type:asc', label: 'Type (A-Z)' },
        ];

      case 'source':
        return [
          ...commonOptions,
          { value: 'h_index:desc', label: 'Highest H-Index' },
          { value: 'h_index:asc', label: 'Lowest H-Index' },
          { value: 'type:asc', label: 'Type (A-Z)' },
          { value: 'is_oa:desc', label: 'Open Access First' },
          { value: 'is_oa:asc', label: 'Closed Access First' },
        ];

      case 'topic':
        return [
          ...commonOptions,
          { value: 'level:asc', label: 'Broadest First (Level)' },
          { value: 'level:desc', label: 'Most Specific First (Level)' },
          { value: 'subfield:asc', label: 'Subfield (A-Z)' },
          { value: 'field:asc', label: 'Field (A-Z)' },
          { value: 'domain:asc', label: 'Domain (A-Z)' },
        ];

      case 'funder':
        return [
          ...commonOptions,
          { value: 'grants_count:desc', label: 'Most Grants' },
          { value: 'grants_count:asc', label: 'Least Grants' },
          { value: 'country_code:asc', label: 'Country (A-Z)' },
          { value: 'country_code:desc', label: 'Country (Z-A)' },
        ];

      case 'publisher':
        return [
          ...commonOptions,
          { value: 'sources_count:desc', label: 'Most Sources' },
          { value: 'sources_count:asc', label: 'Least Sources' },
        ];

      case 'concept':
        return [
          ...commonOptions,
          { value: 'level:asc', label: 'Broadest First (Level)' },
          { value: 'level:desc', label: 'Most Specific First (Level)' },
        ];

      case 'work':
        return [
          { value: 'cited_by_count:desc', label: 'Most Cited' },
          { value: 'cited_by_count:asc', label: 'Least Cited' },
          { value: 'publication_date:desc', label: 'Newest First' },
          { value: 'publication_date:asc', label: 'Oldest First' },
          { value: 'display_name:asc', label: 'Title (A-Z)' },
          { value: 'display_name:desc', label: 'Title (Z-A)' },
          { value: 'is_oa:desc', label: 'Open Access First' },
          { value: 'is_oa:asc', label: 'Closed Access First' },
        ];

      default:
        return commonOptions;
    }
  }, [entityType]);

  return (
    <Select
      data={sortOptions}
      value={value}
      onChange={(selectedValue) => onChange(selectedValue || 'cited_by_count:desc')}
      placeholder="Sort by..."
      leftSection={<IconSortDescending size={16} />}
      size="md"
      style={{ minWidth: 180 }}
    />
  );
}