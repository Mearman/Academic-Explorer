import { describe, it, expect } from 'vitest';
import {
  parseSearchQuery,
  isFieldQuery,
  getQueryFields,
  getFieldQueries,
  hasWildcards,
  type ParsedQuery,
  type QueryTerm,
  type FieldQuery
} from './query-parser';

describe('parseSearchQuery', () => {
  describe('basic functionality', () => {
    it('parses simple terms', () => {
      const result = parseSearchQuery('machine learning AI');

      expect(result.fieldQueries).toEqual([]);
      expect(result.generalTerms).toEqual([
        { value: 'machine', isWildcard: false, isQuoted: false },
        { value: 'learning', isWildcard: false, isQuoted: false },
        { value: 'AI', isWildcard: false, isQuoted: false }
      ]);
    });

    it('parses quoted phrases', () => {
      const result = parseSearchQuery('"machine learning" AI "deep neural networks"');

      expect(result.generalTerms).toEqual([
        { value: 'machine learning', isWildcard: false, isQuoted: true },
        { value: 'AI', isWildcard: false, isQuoted: false },
        { value: 'deep neural networks', isWildcard: false, isQuoted: true }
      ]);
    });

    it('parses wildcards in various positions', () => {
      const result = parseSearchQuery('*machine* learn* *ing suffix*');

      expect(result.generalTerms).toEqual([
        { value: '*machine*', isWildcard: true, isQuoted: false },
        { value: 'learn*', isWildcard: true, isQuoted: false },
        { value: '*ing', isWildcard: true, isQuoted: false },
        { value: 'suffix*', isWildcard: true, isQuoted: false }
      ]);
    });

    it('handles quoted wildcards', () => {
      const result = parseSearchQuery('"*machine learning*" "*AI*"');

      expect(result.generalTerms).toEqual([
        { value: '*machine learning*', isWildcard: true, isQuoted: true },
        { value: '*AI*', isWildcard: true, isQuoted: true }
      ]);
    });
  });

  describe('field queries', () => {
    it('parses field queries without spaces', () => {
      const result = parseSearchQuery('title:machine author:smith journal:nature');

      expect(result.fieldQueries).toEqual([
        { field: 'title', value: 'machine', isWildcard: false, isQuoted: false },
        { field: 'author', value: 'smith', isWildcard: false, isQuoted: false },
        { field: 'journal', value: 'nature', isWildcard: false, isQuoted: false }
      ]);
      expect(result.generalTerms).toEqual([]);
    });

    it('parses field queries with quoted values', () => {
      const result = parseSearchQuery('title:"machine learning" author:"John Smith"');

      expect(result.fieldQueries).toEqual([
        { field: 'title', value: 'machine learning', isWildcard: false, isQuoted: true },
        { field: 'author', value: 'John Smith', isWildcard: false, isQuoted: true }
      ]);
    });

    it('parses field queries with space after colon', () => {
      const result = parseSearchQuery('title: "machine learning" author: smith journal: "Nature Reviews"');

      expect(result.fieldQueries).toEqual([
        { field: 'title', value: 'machine learning', isWildcard: false, isQuoted: true },
        { field: 'author', value: 'smith', isWildcard: false, isQuoted: false },
        { field: 'journal', value: 'Nature Reviews', isWildcard: false, isQuoted: true }
      ]);
    });

    it('parses field queries with wildcards', () => {
      const result = parseSearchQuery('title:*machine* author:smith* journal:*nature');

      expect(result.fieldQueries).toEqual([
        { field: 'title', value: '*machine*', isWildcard: true, isQuoted: false },
        { field: 'author', value: 'smith*', isWildcard: true, isQuoted: false },
        { field: 'journal', value: '*nature', isWildcard: true, isQuoted: false }
      ]);
    });

    it('parses field queries with quoted wildcards', () => {
      const result = parseSearchQuery('title:"*machine learning*" author:"*smith"');

      expect(result.fieldQueries).toEqual([
        { field: 'title', value: '*machine learning*', isWildcard: true, isQuoted: true },
        { field: 'author', value: '*smith', isWildcard: true, isQuoted: true }
      ]);
    });

    it('handles multiple field queries for the same field', () => {
      const result = parseSearchQuery('author:smith author:"John Doe" author:*johnson');

      expect(result.fieldQueries).toEqual([
        { field: 'author', value: 'smith', isWildcard: false, isQuoted: false },
        { field: 'author', value: 'John Doe', isWildcard: false, isQuoted: true },
        { field: 'author', value: '*johnson', isWildcard: true, isQuoted: false }
      ]);
    });

    it('validates field names and treats invalid ones as general terms', () => {
      const result = parseSearchQuery('123invalid:value -field:value valid_field:value');

      expect(result.fieldQueries).toEqual([
        { field: 'valid_field', value: 'value', isWildcard: false, isQuoted: false }
      ]);
      expect(result.generalTerms).toEqual([
        { value: '123invalid:value', isWildcard: false, isQuoted: false },
        { value: '-field:value', isWildcard: false, isQuoted: false }
      ]);
    });
  });

  describe('mixed queries', () => {
    it('parses complex mixed query', () => {
      const result = parseSearchQuery('title:"neural networks" author:smith *AI* "deep learning" year:2023');

      expect(result.fieldQueries).toEqual([
        { field: 'title', value: 'neural networks', isWildcard: false, isQuoted: true },
        { field: 'author', value: 'smith', isWildcard: false, isQuoted: false },
        { field: 'year', value: '2023', isWildcard: false, isQuoted: false }
      ]);
      expect(result.generalTerms).toEqual([
        { value: '*AI*', isWildcard: true, isQuoted: false },
        { value: 'deep learning', isWildcard: false, isQuoted: true }
      ]);
    });

    it('handles field queries mixed with general terms', () => {
      const result = parseSearchQuery('machine learning title:AI author:"John Smith" neural networks');

      expect(result.fieldQueries).toEqual([
        { field: 'title', value: 'AI', isWildcard: false, isQuoted: false },
        { field: 'author', value: 'John Smith', isWildcard: false, isQuoted: true }
      ]);
      expect(result.generalTerms).toEqual([
        { value: 'machine', isWildcard: false, isQuoted: false },
        { value: 'learning', isWildcard: false, isQuoted: false },
        { value: 'neural', isWildcard: false, isQuoted: false },
        { value: 'networks', isWildcard: false, isQuoted: false }
      ]);
    });
  });

  describe('edge cases', () => {
    it('handles empty query', () => {
      const result = parseSearchQuery('');

      expect(result.fieldQueries).toEqual([]);
      expect(result.generalTerms).toEqual([]);
    });

    it('handles whitespace-only query', () => {
      const result = parseSearchQuery('   \t\n  ');

      expect(result.fieldQueries).toEqual([]);
      expect(result.generalTerms).toEqual([]);
    });

    it('handles single colon without field name', () => {
      const result = parseSearchQuery(':value');

      expect(result.fieldQueries).toEqual([]);
      expect(result.generalTerms).toEqual([
        { value: ':value', isWildcard: false, isQuoted: false }
      ]);
    });

    it('handles trailing colon without value', () => {
      const result = parseSearchQuery('title: author');

      expect(result.fieldQueries).toEqual([
        { field: 'title', value: 'author', isWildcard: false, isQuoted: false }
      ]);
      expect(result.generalTerms).toEqual([]);
    });

    it('handles empty quoted strings', () => {
      const result = parseSearchQuery('title:"" ""');

      expect(result.fieldQueries).toEqual([
        { field: 'title', value: '', isWildcard: false, isQuoted: true }
      ]);
      expect(result.generalTerms).toEqual([
        { value: '', isWildcard: false, isQuoted: true }
      ]);
    });

    it('handles unmatched quotes', () => {
      const result = parseSearchQuery('title:"unclosed quote machine learning');

      // Parser handles malformed input by treating unclosed quotes as partial field queries
      expect(result.fieldQueries).toEqual([
        { field: 'title', value: '"unclosed', isWildcard: false, isQuoted: false }
      ]);
      expect(result.generalTerms).toEqual([
        { value: 'quote', isWildcard: false, isQuoted: false },
        { value: 'machine', isWildcard: false, isQuoted: false },
        { value: 'learning', isWildcard: false, isQuoted: false }
      ]);
    });

    it('handles field names with underscores and numbers', () => {
      const result = parseSearchQuery('field_1:value field_name_123:value _field:value field123:value');

      expect(result.fieldQueries).toEqual([
        { field: 'field_1', value: 'value', isWildcard: false, isQuoted: false },
        { field: 'field_name_123', value: 'value', isWildcard: false, isQuoted: false },
        { field: '_field', value: 'value', isWildcard: false, isQuoted: false },
        { field: 'field123', value: 'value', isWildcard: false, isQuoted: false }
      ]);
    });

    it('preserves multiple spaces in quoted strings', () => {
      const result = parseSearchQuery('"machine    learning"');

      expect(result.generalTerms).toEqual([
        { value: 'machine    learning', isWildcard: false, isQuoted: true }
      ]);
    });
  });
});

describe('helper functions', () => {
  describe('isFieldQuery', () => {
    it('identifies field queries correctly', () => {
      const fieldQuery: FieldQuery = {
        field: 'title',
        value: 'test',
        isWildcard: false,
        isQuoted: false
      };
      const generalTerm: QueryTerm = {
        value: 'test',
        isWildcard: false,
        isQuoted: false
      };

      expect(isFieldQuery(fieldQuery)).toBe(true);
      expect(isFieldQuery(generalTerm)).toBe(false);
    });
  });

  describe('getQueryFields', () => {
    it('extracts unique field names', () => {
      const parsedQuery: ParsedQuery = {
        fieldQueries: [
          { field: 'title', value: 'test1', isWildcard: false, isQuoted: false },
          { field: 'author', value: 'test2', isWildcard: false, isQuoted: false },
          { field: 'title', value: 'test3', isWildcard: false, isQuoted: false },
          { field: 'journal', value: 'test4', isWildcard: false, isQuoted: false }
        ],
        generalTerms: []
      };

      const fields = getQueryFields(parsedQuery);
      expect(fields).toEqual(['title', 'author', 'journal']);
    });

    it('returns empty array for query without field queries', () => {
      const parsedQuery: ParsedQuery = {
        fieldQueries: [],
        generalTerms: [
          { value: 'test', isWildcard: false, isQuoted: false }
        ]
      };

      const fields = getQueryFields(parsedQuery);
      expect(fields).toEqual([]);
    });
  });

  describe('getFieldQueries', () => {
    it('filters field queries by field name', () => {
      const parsedQuery: ParsedQuery = {
        fieldQueries: [
          { field: 'title', value: 'test1', isWildcard: false, isQuoted: false },
          { field: 'author', value: 'test2', isWildcard: false, isQuoted: false },
          { field: 'title', value: 'test3', isWildcard: true, isQuoted: false }
        ],
        generalTerms: []
      };

      const titleQueries = getFieldQueries(parsedQuery, 'title');
      expect(titleQueries).toEqual([
        { field: 'title', value: 'test1', isWildcard: false, isQuoted: false },
        { field: 'title', value: 'test3', isWildcard: true, isQuoted: false }
      ]);

      const authorQueries = getFieldQueries(parsedQuery, 'author');
      expect(authorQueries).toEqual([
        { field: 'author', value: 'test2', isWildcard: false, isQuoted: false }
      ]);

      const nonExistentQueries = getFieldQueries(parsedQuery, 'nonexistent');
      expect(nonExistentQueries).toEqual([]);
    });
  });

  describe('hasWildcards', () => {
    it('detects wildcards in field queries', () => {
      const parsedQuery: ParsedQuery = {
        fieldQueries: [
          { field: 'title', value: '*test*', isWildcard: true, isQuoted: false }
        ],
        generalTerms: []
      };

      expect(hasWildcards(parsedQuery)).toBe(true);
    });

    it('detects wildcards in general terms', () => {
      const parsedQuery: ParsedQuery = {
        fieldQueries: [],
        generalTerms: [
          { value: 'test*', isWildcard: true, isQuoted: false }
        ]
      };

      expect(hasWildcards(parsedQuery)).toBe(true);
    });

    it('returns false when no wildcards present', () => {
      const parsedQuery: ParsedQuery = {
        fieldQueries: [
          { field: 'title', value: 'test', isWildcard: false, isQuoted: false }
        ],
        generalTerms: [
          { value: 'term', isWildcard: false, isQuoted: false }
        ]
      };

      expect(hasWildcards(parsedQuery)).toBe(false);
    });

    it('returns false for empty query', () => {
      const parsedQuery: ParsedQuery = {
        fieldQueries: [],
        generalTerms: []
      };

      expect(hasWildcards(parsedQuery)).toBe(false);
    });
  });
});