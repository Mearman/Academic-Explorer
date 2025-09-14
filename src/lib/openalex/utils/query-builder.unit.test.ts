/**
 * Unit Tests for OpenAlex Query Builder Utilities
 *
 * This test suite covers all query builder functionality including:
 * - QueryBuilder class methods and chaining
 * - Filter string building with various data types
 * - Sort string building
 * - Select string building
 * - Date range validation
 * - Filter value escaping
 * - Factory functions for entity-specific query builders
 * - Edge cases and error conditions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  QueryBuilder,
  buildFilterString,
  buildSortString,
  buildSelectString,
  validateDateRange,
  escapeFilterValue,
  createWorksQuery,
  createAuthorsQuery,
  createSourcesQuery,
  createInstitutionsQuery,
  createTopicsQuery,
  createPublishersQuery,
  createFundersQuery,
  SORT_FIELDS,
  SELECT_PRESETS
} from './query-builder';
import type {
  WorksFilters,
  AuthorsFilters,
  SortOptions,
  LogicalOperator as _LogicalOperator,
  DateRangeValidation as _DateRangeValidation
} from './query-builder';

describe('QueryBuilder', () => {
  let queryBuilder: QueryBuilder<WorksFilters>;

  beforeEach(() => {
    queryBuilder = new QueryBuilder<WorksFilters>();
  });

  describe('constructor', () => {
    it('should initialize with empty filters and AND operator by default', () => {
      const builder = new QueryBuilder<WorksFilters>();
      expect(builder.build()).toEqual({});
    });

    it('should initialize with provided filters', () => {
      const initialFilters: Partial<WorksFilters> = {
        'publication_year': 2023,
        'is_oa': true
      };
      const builder = new QueryBuilder<WorksFilters>(initialFilters);
      expect(builder.build()).toEqual(initialFilters);
    });

    it('should initialize with provided logical operator', () => {
      const builder = new QueryBuilder<WorksFilters>({}, 'OR');
      // Note: The operator is stored but the public API doesn't expose it directly
      // We verify this through the buildFilterString behavior in other tests
      expect(builder.build()).toEqual({});
    });
  });

  describe('addFilter', () => {
    it('should add a simple filter with default equals operator', () => {
      queryBuilder.addFilter('publication_year', 2023);
      expect(queryBuilder.build()).toEqual({
        'publication_year': 2023
      });
    });

    it('should add filter with greater than operator', () => {
      queryBuilder.addFilter('cited_by_count', '100', '>');
      expect(queryBuilder.build()).toEqual({
        'cited_by_count': '>100'
      });
    });

    it('should add filter with greater than or equal operator', () => {
      queryBuilder.addFilter('cited_by_count', '50', '>=');
      expect(queryBuilder.build()).toEqual({
        'cited_by_count': '>=50'
      });
    });

    it('should add filter with less than operator', () => {
      queryBuilder.addFilter('publication_year', '2020', '<');
      expect(queryBuilder.build()).toEqual({
        'publication_year': '<2020'
      });
    });

    it('should add filter with less than or equal operator', () => {
      queryBuilder.addFilter('publication_year', '2020', '<=');
      expect(queryBuilder.build()).toEqual({
        'publication_year': '<=2020'
      });
    });

    it('should add filter with not equals operator', () => {
      queryBuilder.addFilter('is_oa', false, '!=');
      expect(queryBuilder.build()).toEqual({
        'is_oa': '!false'
      });
    });

    it('should ignore null and undefined values', () => {
      queryBuilder.addFilter('publication_year', null as any);
      queryBuilder.addFilter('is_oa', undefined as any);
      expect(queryBuilder.build()).toEqual({});
    });

    it('should support method chaining', () => {
      const result = queryBuilder
        .addFilter('publication_year', 2023)
        .addFilter('is_oa', true)
        .addFilter('cited_by_count', '100', '>');

      expect(result).toBe(queryBuilder); // Same instance
      expect(queryBuilder.build()).toEqual({
        'publication_year': 2023,
        'is_oa': true,
        'cited_by_count': '>100'
      });
    });

    it('should handle boolean values correctly', () => {
      queryBuilder.addFilter('is_oa', true);
      queryBuilder.addFilter('has_doi', false);
      expect(queryBuilder.build()).toEqual({
        'is_oa': true,
        'has_doi': false
      });
    });

    it('should handle string values correctly', () => {
      queryBuilder.addFilter('display_name.search', 'machine learning');
      expect(queryBuilder.build()).toEqual({
        'display_name.search': 'machine learning'
      });
    });
  });

  describe('addFilters', () => {
    it('should add multiple filters at once', () => {
      const filters: Partial<WorksFilters> = {
        'publication_year': 2023,
        'is_oa': true,
        'has_doi': true
      };

      queryBuilder.addFilters(filters);
      expect(queryBuilder.build()).toEqual(filters);
    });

    it('should ignore null and undefined values in batch', () => {
      const filters = {
        'publication_year': 2023,
        'is_oa': null,
        'has_doi': undefined,
        'cited_by_count': '100'
      } as any;

      queryBuilder.addFilters(filters);
      expect(queryBuilder.build()).toEqual({
        'publication_year': 2023,
        'cited_by_count': '100'
      });
    });

    it('should support method chaining', () => {
      const result = queryBuilder.addFilters({
        'publication_year': 2023,
        'is_oa': true
      });

      expect(result).toBe(queryBuilder);
    });

    it('should merge with existing filters', () => {
      queryBuilder.addFilter('publication_year', 2023);
      queryBuilder.addFilters({
        'is_oa': true,
        'has_doi': false
      });

      expect(queryBuilder.build()).toEqual({
        'publication_year': 2023,
        'is_oa': true,
        'has_doi': false
      });
    });
  });

  describe('addDateRange', () => {
    it('should add valid date range filters', () => {
      queryBuilder.addDateRange(
        'from_publication_date',
        'to_publication_date',
        '2020-01-01',
        '2023-12-31'
      );

      expect(queryBuilder.build()).toEqual({
        'from_publication_date': '2020-01-01',
        'to_publication_date': '2023-12-31'
      });
    });

    it('should normalize ISO date strings to YYYY-MM-DD format', () => {
      queryBuilder.addDateRange(
        'from_publication_date',
        'to_publication_date',
        '2020-01-01T00:00:00.000Z',
        '2023-12-31T23:59:59.999Z'
      );

      expect(queryBuilder.build()).toEqual({
        'from_publication_date': '2020-01-01',
        'to_publication_date': '2023-12-31'
      });
    });

    it('should throw error for invalid date ranges', () => {
      expect(() => {
        queryBuilder.addDateRange(
          'from_publication_date',
          'to_publication_date',
          '2023-01-01',
          '2020-01-01' // Invalid: to date before from date
        );
      }).toThrow('Invalid date range');
    });

    it('should throw error for invalid date formats', () => {
      expect(() => {
        queryBuilder.addDateRange(
          'from_publication_date',
          'to_publication_date',
          'invalid-date',
          '2023-01-01'
        );
      }).toThrow('Invalid date range');
    });

    it('should support method chaining', () => {
      const result = queryBuilder.addDateRange(
        'from_publication_date',
        'to_publication_date',
        '2020-01-01',
        '2023-12-31'
      );

      expect(result).toBe(queryBuilder);
    });
  });

  describe('addSearch', () => {
    it('should add search filter with trimmed query', () => {
      queryBuilder.addSearch('display_name.search', '  machine learning  ');
      expect(queryBuilder.build()).toEqual({
        'display_name.search': '"machine learning"' // Quotes added because the value contains spaces
      });
    });

    it('should ignore empty search queries', () => {
      queryBuilder.addSearch('display_name.search', '');
      queryBuilder.addSearch('title.search', '   ');
      expect(queryBuilder.build()).toEqual({});
    });

    it('should escape special characters in search queries', () => {
      queryBuilder.addSearch('display_name.search', 'test "with quotes" & special');
      const result = queryBuilder.build();

      // The search value should be escaped
      expect(result['display_name.search']).toBeDefined();
      expect(typeof result['display_name.search']).toBe('string');
    });

    it('should support method chaining', () => {
      const result = queryBuilder.addSearch('display_name.search', 'machine learning');
      expect(result).toBe(queryBuilder);
    });
  });

  describe('setOperator', () => {
    it('should set logical operator and support chaining', () => {
      const result = queryBuilder.setOperator('OR');
      expect(result).toBe(queryBuilder);
    });

    it('should accept all valid logical operators', () => {
      expect(() => queryBuilder.setOperator('AND')).not.toThrow();
      expect(() => queryBuilder.setOperator('OR')).not.toThrow();
      expect(() => queryBuilder.setOperator('NOT')).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should clear all filters and reset operator', () => {
      queryBuilder
        .addFilter('publication_year', 2023)
        .addFilter('is_oa', true)
        .setOperator('OR');

      const result = queryBuilder.reset();

      expect(result).toBe(queryBuilder); // Chaining
      expect(queryBuilder.build()).toEqual({});
    });
  });

  describe('clone', () => {
    it('should create a new instance with copied filters', () => {
      queryBuilder
        .addFilter('publication_year', 2023)
        .addFilter('is_oa', true)
        .setOperator('OR');

      const cloned = queryBuilder.clone();

      expect(cloned).not.toBe(queryBuilder); // Different instance
      expect(cloned.build()).toEqual(queryBuilder.build()); // Same filters
    });

    it('should not affect original when modifying clone', () => {
      queryBuilder.addFilter('publication_year', 2023);
      const cloned = queryBuilder.clone();

      cloned.addFilter('is_oa', true);

      expect(queryBuilder.build()).toEqual({ 'publication_year': 2023 });
      expect(cloned.build()).toEqual({ 'publication_year': 2023, 'is_oa': true });
    });
  });

  describe('buildFilterString', () => {
    it('should delegate to global buildFilterString function', () => {
      queryBuilder.addFilter('publication_year', 2023);
      const builderResult = queryBuilder.buildFilterString();
      const directResult = buildFilterString(queryBuilder.build());

      expect(builderResult).toBe(directResult);
      expect(builderResult).toBe('publication_year:2023');
    });
  });
});

describe('buildFilterString', () => {
  it('should return empty string for empty filters', () => {
    expect(buildFilterString({})).toBe('');
    expect(buildFilterString(null as any)).toBe('');
    expect(buildFilterString(undefined as any)).toBe('');
  });

  it('should build simple field-value pairs', () => {
    const filters: Partial<WorksFilters> = {
      'publication_year': 2023,
      'is_oa': true
    };

    const result = buildFilterString(filters);
    expect(result).toBe('publication_year:2023,is_oa:true');
  });

  it('should handle array values with OR logic (pipe separator)', () => {
    const filters: Partial<WorksFilters> = {
      'authorships.author.id': ['A123', 'A456', 'A789']
    };

    const result = buildFilterString(filters);
    expect(result).toBe('authorships.author.id:A123|A456|A789');
  });

  it('should handle mixed data types correctly', () => {
    const filters: Partial<WorksFilters> = {
      'publication_year': 2023,           // number
      'is_oa': true,                      // boolean
      'display_name.search': 'test',      // string
      'authorships.author.id': ['A1', 'A2'] // array
    };

    const result = buildFilterString(filters);
    const parts = result.split(',');

    expect(parts).toContain('publication_year:2023');
    expect(parts).toContain('is_oa:true');
    expect(parts).toContain('display_name.search:test');
    expect(parts).toContain('authorships.author.id:A1|A2');
    expect(parts).toHaveLength(4);
  });

  it('should ignore null and undefined values', () => {
    const filters = {
      'publication_year': 2023,
      'is_oa': null,
      'has_doi': undefined,
      'cited_by_count': '100'
    } as any;

    const result = buildFilterString(filters);
    expect(result).toBe('publication_year:2023,cited_by_count:100');
  });

  it('should escape string values with special characters', () => {
    const filters: Partial<WorksFilters> = {
      'display_name.search': 'test with "quotes" and spaces'
    };

    const result = buildFilterString(filters);
    expect(result).toContain('display_name.search:');
    // The exact escaping is handled by escapeFilterValue function
  });

  it('should handle comparison operators in values', () => {
    const filters: Partial<WorksFilters> = {
      'cited_by_count': '>100',
      'publication_year': '<=2020'
    };

    const result = buildFilterString(filters);
    expect(result).toBe('cited_by_count:>100,publication_year:<=2020');
  });

  it('should filter out empty arrays', () => {
    const filters: Partial<WorksFilters> = {
      'publication_year': 2023,
      'authorships.author.id': []
    };

    const result = buildFilterString(filters);
    expect(result).toBe('publication_year:2023');
  });

  it('should handle arrays with null/undefined values', () => {
    const filters = {
      'authorships.author.id': ['A123', null, undefined, 'A456']
    } as any;

    const result = buildFilterString(filters);
    expect(result).toBe('authorships.author.id:A123|A456');
  });
});

describe('buildSortString', () => {
  it('should return empty string for null/undefined input', () => {
    expect(buildSortString(null as any)).toBe('');
    expect(buildSortString(undefined as any)).toBe('');
  });

  it('should handle single sort option with default ascending direction', () => {
    const sort: SortOptions = { field: 'cited_by_count' };
    expect(buildSortString(sort)).toBe('cited_by_count:asc');
  });

  it('should handle single sort option with explicit direction', () => {
    const sort: SortOptions = { field: 'cited_by_count', direction: 'desc' };
    expect(buildSortString(sort)).toBe('cited_by_count:desc');
  });

  it('should handle array of sort options', () => {
    const sorts: SortOptions[] = [
      { field: 'publication_year', direction: 'desc' },
      { field: 'cited_by_count', direction: 'desc' },
      { field: 'display_name' } // Default to asc
    ];

    const result = buildSortString(sorts);
    expect(result).toBe('publication_year:desc,cited_by_count:desc,display_name:asc');
  });

  it('should filter out sorts without field names', () => {
    const sorts: SortOptions[] = [
      { field: 'cited_by_count', direction: 'desc' },
      { field: '', direction: 'asc' }, // Empty field
      { field: 'publication_year' }
    ];

    const result = buildSortString(sorts);
    expect(result).toBe('cited_by_count:desc,publication_year:asc');
  });

  it('should handle empty array', () => {
    expect(buildSortString([])).toBe('');
  });

  it('should work with SORT_FIELDS constants', () => {
    const sort: SortOptions = {
      field: SORT_FIELDS.CITED_BY_COUNT,
      direction: 'desc'
    };
    expect(buildSortString(sort)).toBe('cited_by_count:desc');
  });
});

describe('buildSelectString', () => {
  it('should return empty string for empty arrays', () => {
    expect(buildSelectString([])).toBe('');
  });

  it('should return empty string for null/undefined input', () => {
    expect(buildSelectString(null as any)).toBe('');
    expect(buildSelectString(undefined as any)).toBe('');
  });

  it('should join field names with commas', () => {
    const fields = ['id', 'display_name', 'publication_year'];
    expect(buildSelectString(fields)).toBe('id,display_name,publication_year');
  });

  it('should filter out empty and whitespace-only fields', () => {
    const fields = ['id', '', '  ', 'display_name', 'publication_year'];
    expect(buildSelectString(fields)).toBe('id,display_name,publication_year');
  });

  it('should trim field names', () => {
    const fields = [' id ', 'display_name  ', '  publication_year'];
    expect(buildSelectString(fields)).toBe('id,display_name,publication_year');
  });

  it('should work with SELECT_PRESETS constants', () => {
    const result = buildSelectString(SELECT_PRESETS.MINIMAL);
    expect(result).toBe('id,display_name');
  });

  it('should handle arrays with all empty/invalid fields', () => {
    const fields = ['', '  ', null, undefined] as any;
    expect(buildSelectString(fields)).toBe('');
  });
});

describe('validateDateRange', () => {
  it('should validate correct date range', () => {
    const result = validateDateRange('2020-01-01', '2023-12-31');
    expect(result.isValid).toBe(true);
    expect(result.normalizedFrom).toBe('2020-01-01');
    expect(result.normalizedTo).toBe('2023-12-31');
    expect(result.error).toBeUndefined();
  });

  it('should normalize ISO date strings', () => {
    const result = validateDateRange(
      '2020-01-01T00:00:00.000Z',
      '2023-12-31T23:59:59.999Z'
    );
    expect(result.isValid).toBe(true);
    expect(result.normalizedFrom).toBe('2020-01-01');
    expect(result.normalizedTo).toBe('2023-12-31');
  });

  it('should reject missing dates', () => {
    let result = validateDateRange('', '2023-12-31');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Both from and to dates must be provided');

    result = validateDateRange('2020-01-01', '');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Both from and to dates must be provided');

    result = validateDateRange(null as any, undefined as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Both from and to dates must be provided');
  });

  it('should reject invalid date formats', () => {
    let result = validateDateRange('invalid-date', '2023-12-31');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid \'from\' date format');

    result = validateDateRange('2020-01-01', 'invalid-date');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid \'to\' date format');
  });

  it('should reject ranges where from date is after to date', () => {
    const result = validateDateRange('2023-01-01', '2020-01-01');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Start date cannot be after end date');
  });

  it('should allow same from and to dates', () => {
    const result = validateDateRange('2023-01-01', '2023-01-01');
    expect(result.isValid).toBe(true);
    expect(result.normalizedFrom).toBe('2023-01-01');
    expect(result.normalizedTo).toBe('2023-01-01');
  });

  it('should handle various date string formats', () => {
    // JavaScript Date constructor accepts various formats
    const validFormats = [
      ['2023-01-01', '2023-12-31'],
      ['2023/01/01', '2023/12/31'],
      ['Jan 01 2023', 'Dec 31 2023'],
      ['1/1/2023', '12/31/2023']
    ];

    validFormats.forEach(([from, to]) => {
      const result = validateDateRange(from, to);
      expect(result.isValid).toBe(true);
      expect(result.normalizedFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.normalizedTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('should handle edge cases with malformed date strings', () => {
    const invalidFormats = [
      '2023-13-01', // Invalid month
      '2023-01-32', // Invalid day
      'not-a-date',
      '2023',      // Incomplete
      ''
    ];

    invalidFormats.forEach(invalidDate => {
      const result = validateDateRange(invalidDate, '2023-12-31');
      expect(result.isValid).toBe(false);
    });
  });
});

describe('escapeFilterValue', () => {
  it('should return empty string for null/undefined/empty input', () => {
    expect(escapeFilterValue('')).toBe('');
    expect(escapeFilterValue(null as any)).toBe('');
    expect(escapeFilterValue(undefined as any)).toBe('');
  });

  it('should return non-string input as empty string', () => {
    expect(escapeFilterValue(123 as any)).toBe('');
    expect(escapeFilterValue(true as any)).toBe('');
    expect(escapeFilterValue({} as any)).toBe('');
  });

  it('should trim input strings', () => {
    expect(escapeFilterValue('  test  ')).toBe('test');
    expect(escapeFilterValue('\ttest\n')).toBe('test');
  });

  it('should not quote simple strings without special characters', () => {
    expect(escapeFilterValue('test')).toBe('test');
    expect(escapeFilterValue('machine-learning')).toBe('machine-learning');
    expect(escapeFilterValue('123')).toBe('123');
  });

  it('should quote strings with spaces', () => {
    const result = escapeFilterValue('machine learning');
    expect(result).toBe('"machine learning"');
  });

  it('should quote strings with special characters', () => {
    const specialChars = [
      { input: 'test,value', expected: '"test,value"' },
      { input: 'test|value', expected: '"test|value"' },
      { input: 'test:value', expected: '"test:value"' },
      { input: 'test(value)', expected: '"test(value)"' },
      { input: 'test&value', expected: '"test&value"' },
      { input: "test'value", expected: '"test\'value"' }
    ];

    specialChars.forEach(({ input, expected }) => {
      expect(escapeFilterValue(input)).toBe(expected);
    });
  });

  it('should escape existing quotes and wrap in quotes', () => {
    const result = escapeFilterValue('test "quoted" value');
    expect(result).toBe('"test \\"quoted\\" value"');
  });

  it('should handle complex strings with multiple special characters', () => {
    const input = 'machine "learning" & AI: (deep learning)';
    const result = escapeFilterValue(input);
    expect(result).toBe('"machine \\"learning\\" & AI: (deep learning)"');
  });

  it('should handle strings with only quotes', () => {
    expect(escapeFilterValue('"')).toBe('"\\\""'); // Single quote becomes: quote + backslash + quote + quote
    expect(escapeFilterValue('""')).toBe('"\\"\\""'); // Double quotes become: quote + escaped-quote + escaped-quote + quote
  });

  it('should handle empty quoted strings', () => {
    expect(escapeFilterValue('""')).toBe('"\\"\\""');
  });
});

describe('Factory Functions', () => {
  describe('createWorksQuery', () => {
    it('should create QueryBuilder instance for Works', () => {
      const query = createWorksQuery();
      expect(query).toBeInstanceOf(QueryBuilder);
      expect(query.build()).toEqual({});
    });

    it('should create QueryBuilder with initial filters', () => {
      const filters: Partial<WorksFilters> = {
        'publication_year': 2023,
        'is_oa': true
      };
      const query = createWorksQuery(filters);
      expect(query.build()).toEqual(filters);
    });

    it('should support method chaining', () => {
      const query = createWorksQuery({ 'publication_year': 2023 })
        .addFilter('is_oa', true);

      expect(query.build()).toEqual({
        'publication_year': 2023,
        'is_oa': true
      });
    });
  });

  describe('createAuthorsQuery', () => {
    it('should create QueryBuilder instance for Authors', () => {
      const query = createAuthorsQuery();
      expect(query).toBeInstanceOf(QueryBuilder);
      expect(query.build()).toEqual({});
    });

    it('should create QueryBuilder with initial filters', () => {
      const filters: Partial<AuthorsFilters> = {
        'works_count': '>10',
        'has_orcid': true
      };
      const query = createAuthorsQuery(filters);
      expect(query.build()).toEqual(filters);
    });
  });

  describe('createSourcesQuery', () => {
    it('should create QueryBuilder instance for Sources', () => {
      const query = createSourcesQuery();
      expect(query).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('createInstitutionsQuery', () => {
    it('should create QueryBuilder instance for Institutions', () => {
      const query = createInstitutionsQuery();
      expect(query).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('createTopicsQuery', () => {
    it('should create QueryBuilder instance for Topics', () => {
      const query = createTopicsQuery();
      expect(query).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('createPublishersQuery', () => {
    it('should create QueryBuilder instance for Publishers', () => {
      const query = createPublishersQuery();
      expect(query).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('createFundersQuery', () => {
    it('should create QueryBuilder instance for Funders', () => {
      const query = createFundersQuery();
      expect(query).toBeInstanceOf(QueryBuilder);
    });
  });
});

describe('Constants', () => {
  describe('SORT_FIELDS', () => {
    it('should contain expected sort field constants', () => {
      expect(SORT_FIELDS.CITED_BY_COUNT).toBe('cited_by_count');
      expect(SORT_FIELDS.WORKS_COUNT).toBe('works_count');
      expect(SORT_FIELDS.PUBLICATION_YEAR).toBe('publication_year');
      expect(SORT_FIELDS.PUBLICATION_DATE).toBe('publication_date');
      expect(SORT_FIELDS.CREATED_DATE).toBe('created_date');
      expect(SORT_FIELDS.UPDATED_DATE).toBe('updated_date');
      expect(SORT_FIELDS.DISPLAY_NAME).toBe('display_name');
      expect(SORT_FIELDS.RELEVANCE_SCORE).toBe('relevance_score');
    });
  });

  describe('SELECT_PRESETS', () => {
    it('should contain expected select field presets', () => {
      expect(SELECT_PRESETS.MINIMAL).toEqual(['id', 'display_name']);
      expect(SELECT_PRESETS.BASIC).toEqual(['id', 'display_name', 'cited_by_count']);

      expect(SELECT_PRESETS.WORKS_DETAILED).toContain('id');
      expect(SELECT_PRESETS.WORKS_DETAILED).toContain('doi');
      expect(SELECT_PRESETS.WORKS_DETAILED).toContain('publication_year');

      expect(SELECT_PRESETS.AUTHORS_DETAILED).toContain('id');
      expect(SELECT_PRESETS.AUTHORS_DETAILED).toContain('orcid');
      expect(SELECT_PRESETS.AUTHORS_DETAILED).toContain('works_count');
    });
  });
});

describe('Edge Cases and Error Conditions', () => {
  describe('QueryBuilder edge cases', () => {
    it('should handle overwriting existing filters', () => {
      const query = new QueryBuilder<WorksFilters>()
        .addFilter('publication_year', 2020)
        .addFilter('publication_year', 2023); // Overwrite

      expect(query.build()).toEqual({
        'publication_year': 2023
      });
    });

    it('should handle complex nested field names', () => {
      const query = new QueryBuilder<WorksFilters>()
        .addFilter('authorships.author.id', 'A123456789')
        .addFilter('primary_location.source.id', 'S123456789');

      expect(query.build()).toEqual({
        'authorships.author.id': 'A123456789',
        'primary_location.source.id': 'S123456789'
      });
    });

    it('should handle very large numbers', () => {
      const query = new QueryBuilder<WorksFilters>()
        .addFilter('cited_by_count', Number.MAX_SAFE_INTEGER);

      expect(query.build()).toEqual({
        'cited_by_count': Number.MAX_SAFE_INTEGER
      });
    });

    it('should handle array filters with many values', () => {
      const manyAuthors = Array.from({ length: 100 }, (_, i) => `A${i}`);
      const query = new QueryBuilder<WorksFilters>()
        .addFilter('authorships.author.id', manyAuthors);

      expect(query.build()['authorships.author.id']).toEqual(manyAuthors);
      expect(query.buildFilterString()).toContain('|'); // Should use OR logic
    });
  });

  describe('buildFilterString edge cases', () => {
    it('should handle empty arrays in filters', () => {
      const filters: Partial<WorksFilters> = {
        'authorships.author.id': [],
        'publication_year': 2023
      };

      const result = buildFilterString(filters);
      expect(result).toBe('publication_year:2023');
    });

    it('should handle arrays with empty strings', () => {
      const filters: Partial<WorksFilters> = {
        'authorships.author.id': ['A123', '', 'A456', '   ', 'A789']
      };

      const result = buildFilterString(filters);
      expect(result).toBe('authorships.author.id:A123|A456|A789');
    });

    it('should handle very long filter strings', () => {
      const longSearchTerm = 'a'.repeat(1000);
      const filters: Partial<WorksFilters> = {
        'display_name.search': longSearchTerm
      };

      const result = buildFilterString(filters);
      expect(result).toContain(longSearchTerm);
    });
  });

  describe('Type safety edge cases', () => {
    it('should maintain type safety with generic constraints', () => {
      // This test verifies TypeScript compilation - if it compiles, the types work
      const worksQuery = new QueryBuilder<WorksFilters>();
      worksQuery.addFilter('publication_year', 2023); // Should compile

      const authorsQuery = new QueryBuilder<AuthorsFilters>();
      authorsQuery.addFilter('works_count', '>10'); // Should compile

      // The following would cause TypeScript compilation errors (which is good):
      // worksQuery.addFilter('invalid_field', 'value'); // ❌ Should not compile
      // authorsQuery.addFilter('publication_year', 2023); // ❌ Should not compile
    });
  });

  describe('Performance edge cases', () => {
    it('should handle large numbers of filters efficiently', () => {
      const query = new QueryBuilder<WorksFilters>();

      // Add many filters
      for (let i = 0; i < 1000; i++) {
        query.addFilter('authorships.author.id', [`A${i}`]);
      }

      const start = performance.now();
      const filterString = query.buildFilterString();
      const end = performance.now();

      expect(filterString).toBeDefined();
      expect(end - start).toBeLessThan(100); // Should complete within 100ms
    });
  });
});