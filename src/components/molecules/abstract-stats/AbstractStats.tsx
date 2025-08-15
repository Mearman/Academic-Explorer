import { Group, Badge, Text } from '@mantine/core';
import React from 'react';

interface AbstractStatsProps {
  abstract: string | null;
  uniqueTerms: number;
  backgroundColor?: string;
}

export function AbstractStats({ 
  abstract, 
  uniqueTerms, 
  backgroundColor = "blue.0" 
}: AbstractStatsProps) {
  if (!abstract) return null;

  const wordCount = abstract.split(' ').length;
  const charCount = abstract.length;

  return (
    <Group gap="md" bg={backgroundColor} p="sm" style={{ borderRadius: '4px' }}>
      <Text size="sm" fw={500}>Statistics:</Text>
      <Badge variant="light" size="sm" color="blue">
        {wordCount} words
      </Badge>
      <Badge variant="light" size="sm" color="blue">
        {charCount} characters
      </Badge>
      <Badge variant="light" size="sm" color="blue">
        {uniqueTerms} unique terms
      </Badge>
    </Group>
  );
}