/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { describe, it, expect } from 'vitest';

import { reconstructAbstract } from '@/lib/openalex/utils/transformers';

// Mock data with abstract_inverted_index
const mockInvertedIndex = {
  'This': [0],
  'is': [1, 5],
  'a': [2],
  'test': [3],
  'abstract': [4],
  'working': [6],
  'properly': [7]
};

const mockWorkData = {
  id: 'https://openalex.org/W12345',
  display_name: 'Test Work',
  abstract_inverted_index: mockInvertedIndex,
  publication_year: 2023,
  cited_by_count: 42
};

const mockWorkDataWithoutAbstract = {
  id: 'https://openalex.org/W67890',
  display_name: 'Test Work Without Abstract',
  publication_year: 2023,
  cited_by_count: 10
};

describe('RawDataView Abstract Reconstruction', () => {
  it('reconstructs abstract correctly from inverted index', () => {
    const result = reconstructAbstract(mockInvertedIndex);
    expect(result).toBe('This is a test abstract is working properly');
  });

  it('returns null for empty inverted index', () => {
    const result = reconstructAbstract({});
    expect(result).toBeNull();
  });

  it('returns null for undefined inverted index', () => {
    const result = reconstructAbstract(undefined);
    expect(result).toBeNull();
  });

  it('detects abstract_inverted_index in data correctly', () => {
    // Test the logic used in RawDataView
    const hasAbstractIndex = mockWorkData && 
      typeof mockWorkData === 'object' && 
      'abstract_inverted_index' in mockWorkData && 
      mockWorkData.abstract_inverted_index &&
      typeof mockWorkData.abstract_inverted_index === 'object' &&
      Object.keys(mockWorkData.abstract_inverted_index).length > 0;
    
    expect(hasAbstractIndex).toBe(true);
  });

  it('correctly identifies data without abstract_inverted_index', () => {
    // Test the logic used in RawDataView
    const hasAbstractIndex = mockWorkDataWithoutAbstract && 
      typeof mockWorkDataWithoutAbstract === 'object' && 
      'abstract_inverted_index' in mockWorkDataWithoutAbstract && 
      mockWorkDataWithoutAbstract.abstract_inverted_index &&
      typeof mockWorkDataWithoutAbstract.abstract_inverted_index === 'object' &&
      Object.keys(mockWorkDataWithoutAbstract.abstract_inverted_index).length > 0;
    
    expect(hasAbstractIndex).toBe(false);
  });

  it('handles complex inverted index with multiple occurrences', () => {
    const complexIndex = {
      'Machine': [0, 15],
      'learning': [1, 16],
      'algorithms': [2],
      'are': [3],
      'used': [4],
      'in': [5, 12],
      'various': [6],
      'applications': [7],
      'including': [8],
      'natural': [9],
      'language': [10],
      'processing': [11],
      'computer': [13],
      'vision': [14]
    };

    const result = reconstructAbstract(complexIndex);
    expect(result).toContain('Machine learning algorithms');
    expect(result).toContain('natural language processing');
    expect(result).toContain('computer vision');
    expect(result.split(' ').length).toBe(17); // Should have 17 words total
  });
});