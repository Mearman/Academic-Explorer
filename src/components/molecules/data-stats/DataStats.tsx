import { Group, Badge } from '@mantine/core';
import React from 'react';

interface DataStatsProps {
  sizeKB: string;
  fieldCount?: number;
}

export function DataStats({ sizeKB, fieldCount }: DataStatsProps) {
  return (
    <Group gap="xs">
      <Badge variant="light" size="sm">
        {sizeKB} KB
      </Badge>
      {fieldCount !== undefined && fieldCount > 0 && (
        <Badge variant="light" size="sm" color="blue">
          {fieldCount} fields
        </Badge>
      )}
    </Group>
  );
}