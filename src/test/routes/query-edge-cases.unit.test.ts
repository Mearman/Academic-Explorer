import { describe, it, expect } from 'vitest';
import type { WorksParams } from '@/lib/openalex/types';

// Edge case testing for URL parameter conversion
type SearchParams = {
  q?: string;
  field?: 'all' | 'title' | 'abstract' | 'fulltext';
  mode?: 'basic' | 'boolean' | 'exact' | 'no_stem';
  from_date?: string;
  to_date?: string;
  year?: number;
  is_oa?: boolean;
  has_fulltext?: boolean;
  has_doi?: boolean;
  has_abstract?: boolean;
  not_retracted?: boolean;
  min_citations?: number;
  max_citations?: number;
  author_id?: string;
  institution_id?: string;
  source_id?: string;
  funder_id?: string;
  topic_id?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  per_page?: number;
  sample?: number;
  group_by?: string;
  page?: number;
};

// Extracted conversion function for testing
function convertUrlParamsToWorksParams(params: SearchParams): WorksParams {
  const worksParams: WorksParams = {};

  // Basic search query
  if (params.q) {
    worksParams.search = params.q;
  }

  // Build filter string from params
  const filters: string[] = [];
  
  if (params.is_oa !== undefined) {
    filters.push(`is_oa:${params.is_oa}`);
  }
  if (params.has_fulltext !== undefined) {
    filters.push(`has_fulltext:${params.has_fulltext}`);
  }
  if (params.has_doi !== undefined) {
    filters.push(`has_doi:${params.has_doi}`);
  }
  if (params.has_abstract !== undefined) {
    filters.push(`has_abstract:${params.has_abstract}`);
  }
  if (params.not_retracted !== undefined) {
    filters.push(`is_retracted:${!params.not_retracted}`);
  }
  if (params.year !== undefined) {
    filters.push(`publication_year:${params.year}`);
  }
  if (params.author_id) {
    filters.push(`authorships.author.id:${params.author_id}`);
  }
  if (params.institution_id) {
    filters.push(`authorships.institutions.id:${params.institution_id}`);
  }
  if (params.source_id) {
    filters.push(`primary_location.source.id:${params.source_id}`);
  }
  if (params.funder_id) {
    filters.push(`grants.funder:${params.funder_id}`);
  }
  if (params.topic_id) {
    filters.push(`topics.id:${params.topic_id}`);
  }

  if (filters.length > 0) {
    worksParams.filter = filters.join(',');
  }

  // Date range
  if (params.from_date) {
    worksParams.from_publication_date = params.from_date;
  }
  if (params.to_date) {
    worksParams.to_publication_date = params.to_date;
  }

  // Sort and pagination
  if (params.sort && params.order) {
    worksParams.sort = `${params.sort}:${params.order}`;
  } else if (params.sort) {
    worksParams.sort = `${params.sort}:desc`;
  }
  
  if (params.per_page) {
    worksParams.per_page = params.per_page;
  }
  if (params.sample) {
    worksParams.sample = params.sample;
  }
  if (params.group_by) {
    worksParams.group_by = params.group_by;
  }
  if (params.page) {
    worksParams.page = params.page;
  }

  return worksParams;
}

describe('Query URL Parameter Edge Cases', () => {
  describe('Input Validation', () => {
    it('should handle null and undefined parameters', () => {
      const params = {
        q: undefined,
        sort: null as any,
        order: undefined,
        year: null as any,
        per_page: undefined
      };
      
      const result = convertUrlParamsToWorksParams(params);
      // null gets converted to string "null" in filters
      expect(result).toEqual({
        filter: 'publication_year:null'
      });
    });

    it('should handle empty string parameters', () => {
      const params: SearchParams = {
        q: '',
        author_id: '',
        institution_id: '',
        source_id: ''
      };
      
      const result = convertUrlParamsToWorksParams(params);
      // Empty strings should be ignored for IDs, but q might be preserved
      expect(result).toEqual({});
    });

    it('should handle whitespace-only strings', () => {
      const params: SearchParams = {
        q: '   ',
        author_id: '\t\n',
        source_id: ' '
      };
      
      const result = convertUrlParamsToWorksParams(params);
      expect(result.search).toBe('   '); // Preserve whitespace in search query
      // The function doesn't filter out whitespace-only strings for IDs
      expect(result.filter).toBe('authorships.author.id:\t\n,primary_location.source.id: ');
    });
  });

  describe('Numeric Edge Cases', () => {
    it('should handle zero values correctly', () => {
      const params: SearchParams = {
        year: 0,
        per_page: 0,
        page: 0,
        sample: 0
      };
      
      const result = convertUrlParamsToWorksParams(params);
      // Zero values are falsy in if checks, so only year (in filter) is included
      expect(result).toEqual({
        filter: 'publication_year:0'
      });
    });

    it('should handle negative numbers', () => {
      const params: SearchParams = {
        year: -2023,
        per_page: -10,
        page: -1
      };
      
      const result = convertUrlParamsToWorksParams(params);
      expect(result).toEqual({
        filter: 'publication_year:-2023',
        per_page: -10,
        page: -1
      });
    });

    it('should handle very large numbers', () => {
      const params: SearchParams = {
        year: 999999,
        per_page: 10000,
        page: Number.MAX_SAFE_INTEGER
      };
      
      const result = convertUrlParamsToWorksParams(params);
      expect(result).toEqual({
        filter: 'publication_year:999999',
        per_page: 10000,
        page: Number.MAX_SAFE_INTEGER
      });
    });
  });

  describe('String Edge Cases', () => {
    it('should handle special characters in search query', () => {
      const params: SearchParams = {
        q: 'test "quoted text" AND (machine learning) NOT retracted'
      };
      
      const result = convertUrlParamsToWorksParams(params);
      expect(result.search).toBe('test "quoted text" AND (machine learning) NOT retracted');
    });

    it('should handle Unicode characters', () => {
      const params: SearchParams = {
        q: 'résumé naïve café 机器学习 مُصْطَلَح'
      };
      
      const result = convertUrlParamsToWorksParams(params);
      expect(result.search).toBe('résumé naïve café 机器学习 مُصْطَلَح');
    });

    it('should handle very long strings', () => {
      const longQuery = 'a'.repeat(10000);
      const params: SearchParams = { q: longQuery };
      
      const result = convertUrlParamsToWorksParams(params);
      expect(result.search).toBe(longQuery);
      expect(result.search?.length).toBe(10000);
    });

    it('should handle entity IDs with special formats', () => {
      const params: SearchParams = {
        author_id: 'A1234567890',
        institution_id: 'I9876543210',
        source_id: 'S5555666777',
        funder_id: 'F1111222333',
        topic_id: 'T4444555666'
      };
      
      const result = convertUrlParamsToWorksParams(params);
      expect(result.filter).toBe(
        'authorships.author.id:A1234567890,' +
        'authorships.institutions.id:I9876543210,' +
        'primary_location.source.id:S5555666777,' +
        'grants.funder:F1111222333,' +
        'topics.id:T4444555666'
      );
    });
  });

  describe('Date Edge Cases', () => {
    it('should handle various date formats', () => {
      const params: SearchParams = {
        from_date: '2023-01-01',
        to_date: '2023-12-31'
      };
      
      const result = convertUrlParamsToWorksParams(params);
      expect(result).toEqual({
        from_publication_date: '2023-01-01',
        to_publication_date: '2023-12-31'
      });
    });

    it('should handle invalid date strings', () => {
      const params: SearchParams = {
        from_date: 'not-a-date',
        to_date: '2023-13-45' // Invalid date
      };
      
      const result = convertUrlParamsToWorksParams(params);
      // Function should pass through as-is, validation happens elsewhere
      expect(result).toEqual({
        from_publication_date: 'not-a-date',
        to_publication_date: '2023-13-45'
      });
    });

    it('should handle edge date values', () => {
      const params: SearchParams = {
        from_date: '0000-01-01',
        to_date: '9999-12-31'
      };
      
      const result = convertUrlParamsToWorksParams(params);
      expect(result).toEqual({
        from_publication_date: '0000-01-01',
        to_publication_date: '9999-12-31'
      });
    });
  });

  describe('Boolean Edge Cases', () => {
    it('should handle explicit boolean false values', () => {
      const params: SearchParams = {
        is_oa: false,
        has_fulltext: false,
        has_doi: false,
        has_abstract: false,
        not_retracted: false
      };
      
      const result = convertUrlParamsToWorksParams(params);
      expect(result.filter).toBe(
        'is_oa:false,has_fulltext:false,has_doi:false,has_abstract:false,is_retracted:true'
      );
    });

    it('should distinguish between false and undefined', () => {
      const params1: SearchParams = { is_oa: false };
      const params2: SearchParams = { is_oa: undefined };
      
      const result1 = convertUrlParamsToWorksParams(params1);
      const result2 = convertUrlParamsToWorksParams(params2);
      
      expect(result1.filter).toBe('is_oa:false');
      expect(result2.filter).toBeUndefined();
    });
  });

  describe('Sort Parameter Edge Cases', () => {
    it('should handle sort without order', () => {
      const params: SearchParams = { sort: 'publication_date' };
      const result = convertUrlParamsToWorksParams(params);
      expect(result.sort).toBe('publication_date:desc');
    });

    it('should handle empty sort parameter', () => {
      const params: SearchParams = { sort: '', order: 'asc' };
      const result = convertUrlParamsToWorksParams(params);
      expect(result.sort).toBeUndefined();
    });

    it('should handle special characters in sort field', () => {
      const params: SearchParams = { sort: 'custom_field_123', order: 'desc' };
      const result = convertUrlParamsToWorksParams(params);
      expect(result.sort).toBe('custom_field_123:desc');
    });
  });

  describe('Complex Filter Combinations', () => {
    it('should build complex filter strings correctly', () => {
      const params: SearchParams = {
        is_oa: true,
        has_fulltext: false,
        year: 2023,
        not_retracted: true,
        author_id: 'A123',
        institution_id: 'I456'
      };
      
      const result = convertUrlParamsToWorksParams(params);
      expect(result.filter).toBe(
        'is_oa:true,has_fulltext:false,is_retracted:false,publication_year:2023,' +
        'authorships.author.id:A123,authorships.institutions.id:I456'
      );
    });

    it('should handle single filter correctly', () => {
      const params: SearchParams = { is_oa: true };
      const result = convertUrlParamsToWorksParams(params);
      expect(result.filter).toBe('is_oa:true');
    });

    it('should handle no filters correctly', () => {
      const params: SearchParams = { q: 'test' };
      const result = convertUrlParamsToWorksParams(params);
      expect(result.filter).toBeUndefined();
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle large number of parameters efficiently', () => {
      const manyParams: SearchParams = {};
      
      // Create many parameters
      for (let i = 0; i < 1000; i++) {
        (manyParams as any)[`custom_param_${i}`] = `value_${i}`;
      }
      
      // Add valid parameters
      manyParams.q = 'test';
      manyParams.year = 2023;
      
      const result = convertUrlParamsToWorksParams(manyParams);
      
      // Should only process known parameters
      expect(result).toEqual({
        search: 'test',
        filter: 'publication_year:2023'
      });
    });

    it('should handle deeply nested object-like parameters', () => {
      const params = {
        q: 'test',
        nested: { deep: { value: 'should be ignored' } } as any,
        array: [1, 2, 3] as any,
        year: 2023
      };
      
      const result = convertUrlParamsToWorksParams(params);
      expect(result).toEqual({
        search: 'test',
        filter: 'publication_year:2023'
      });
    });
  });
});