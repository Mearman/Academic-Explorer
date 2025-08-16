import { describe, it, expect } from 'vitest';
import { QueryBuilder, query, filters, combineFilters } from './query-builder';

describe('QueryBuilder', () => {
  describe('Basic operations', () => {
    it('should create simple equality filter', () => {
      const qb = new QueryBuilder();
      qb.equals('type', 'article');
      
      expect(qb.build()).toBe('type:article');
    });

    it('should create not equals filter', () => {
      const qb = query().notEquals('type', 'preprint');
      
      expect(qb.build()).toBe('type:!preprint');
    });

    it('should create greater than filter', () => {
      const qb = query().greaterThan('cited_by_count', 10);
      
      expect(qb.build()).toBe('cited_by_count:>10');
    });

    it('should create less than filter', () => {
      const qb = query().lessThan('publication_year', 2020);
      
      expect(qb.build()).toBe('publication_year:<2020');
    });

    it('should create between filter', () => {
      const qb = query().between('publication_year', 2018, 2023);
      
      expect(qb.build()).toBe('publication_year:2018-2023');
    });

    it('should create in filter', () => {
      const qb = query().in('type', ['article', 'review']);
      
      expect(qb.build()).toBe('type:article|review');
    });

    it('should create contains filter', () => {
      const qb = query().contains('title', 'machine learning');
      
      expect(qb.build()).toBe('title.search:machine learning');
    });

    it('should create starts with filter', () => {
      const qb = query().startsWith('display_name', 'The');
      
      expect(qb.build()).toBe('display_name:The*');
    });
  });

  describe('Logical operators', () => {
    it('should combine filters with AND', () => {
      const qb = query()
        .equals('type', 'article')
        .and('is_oa:true');
      
      expect(qb.build()).toBe('type:article,is_oa:true');
    });

    it('should combine filters with OR', () => {
      const qb = query()
        .equals('type', 'article')
        .or('type:review');
      
      expect(qb.build()).toBe('(type:article)||(type:review)');
    });

    it('should create NOT filter', () => {
      const qb = query().not('is_retracted:true');
      
      expect(qb.build()).toBe('!(is_retracted:true)');
    });

    it('should handle complex nested logic', () => {
      const qb = query()
        .equals('type', 'article')
        .and(query().greaterThan('cited_by_count', 10))
        .not('is_retracted:true');
      
      expect(qb.build()).toBe('type:article,cited_by_count:>10,!(is_retracted:true)');
    });
  });

  describe('Grouping', () => {
    it('should group filters', () => {
      const qb = query()
        .equals('type', 'article')
        .group(g => {
          g.contains('title', 'climate')
            .or(query().contains('abstract', 'climate'));
        });
      
      const result = qb.build();
      expect(result).toContain('type:article');
      expect(result).toContain('title.search:climate');
      expect(result).toContain('abstract.search:climate');
    });
  });

  describe('Date filters', () => {
    it('should create date equals filter', () => {
      const qb = query().dateEquals('publication_date', '2023-01-01');
      
      expect(qb.build()).toBe('publication_date:2023-01-01');
    });

    it('should create date range filter', () => {
      const qb = query().dateRange('publication_date', '2023-01-01', '2023-12-31');
      
      expect(qb.build()).toBe('publication_date:2023-01-01-2023-12-31');
    });

    it('should handle Date objects', () => {
      const from = new Date('2023-01-01');
      const to = new Date('2023-12-31');
      const qb = query().dateRange('publication_date', from, to);
      
      expect(qb.build()).toBe('publication_date:2023-01-01-2023-12-31');
    });

    it('should create date after filter', () => {
      const qb = query().dateAfter('publication_date', '2023-01-01');
      
      expect(qb.build()).toBe('publication_date:>2023-01-01');
    });

    it('should create date before filter', () => {
      const qb = query().dateBefore('publication_date', '2023-12-31');
      
      expect(qb.build()).toBe('publication_date:<2023-12-31');
    });
  });

  describe('Null checks', () => {
    it('should create is null filter', () => {
      const qb = query().isNull('doi');
      
      expect(qb.build()).toBe('doi:null');
    });

    it('should create is not null filter', () => {
      const qb = query().isNotNull('doi');
      
      expect(qb.build()).toBe('doi:!null');
    });
  });

  describe('Boolean fields', () => {
    it('should create is true filter', () => {
      const qb = query().isTrue('is_oa');
      
      expect(qb.build()).toBe('is_oa:true');
    });

    it('should create is false filter', () => {
      const qb = query().isFalse('is_retracted');
      
      expect(qb.build()).toBe('is_retracted:false');
    });
  });

  describe('Utility methods', () => {
    it('should clear filters', () => {
      const qb = query()
        .equals('type', 'article')
        .equals('is_oa', true);
      
      qb.clear();
      
      expect(qb.build()).toBe('');
    });

    it('should check if empty', () => {
      const qb = query();
      
      expect(qb.isEmpty()).toBe(true);
      
      qb.equals('type', 'article');
      
      expect(qb.isEmpty()).toBe(false);
    });
  });

  describe('Predefined filters', () => {
    it('should create open access filter', () => {
      const filter = filters.works.openAccess();
      
      expect(filter.build()).toBe('is_oa:true');
    });

    it('should create year range filter', () => {
      const filter = filters.works.byYearRange(2020, 2023);
      
      expect(filter.build()).toBe('publication_year:2020-2023');
    });

    it('should create author filter', () => {
      const filter = filters.works.byAuthor('A1234567890');
      
      expect(filter.build()).toBe('authorships.author.id:A1234567890');
    });

    it('should create citation count filter', () => {
      const filter = filters.works.byCitationCount(100, 500);
      
      expect(filter.build()).toBe('cited_by_count:100-500');
    });

    it('should create institution filter', () => {
      const filter = filters.institutions.byCountry('US');
      
      expect(filter.build()).toBe('country_code:US');
    });

    it('should create source filter', () => {
      const filter = filters.sources.isOpenAccess();
      
      expect(filter.build()).toBe('is_oa:true');
    });
  });

  describe('Combine filters', () => {
    it('should combine multiple filters', () => {
      const combined = combineFilters(
        filters.works.openAccess(),
        filters.works.byYear(2023),
        'type:article'
      );
      
      expect(combined).toContain('is_oa:true');
      expect(combined).toContain('publication_year:2023');
      expect(combined).toContain('type:article');
    });

    it('should handle empty filters', () => {
      const combined = combineFilters(
        query(),
        '',
        filters.works.openAccess()
      );
      
      expect(combined).toBe('is_oa:true');
    });
  });

  describe('Complex queries', () => {
    it('should build complex research query', () => {
      const qb = query()
        .equals('type', 'article')
        .isTrue('is_oa')
        .dateRange('publication_date', '2020-01-01', '2023-12-31')
        .greaterThan('cited_by_count', 10)
        .group(g => {
          g.contains('title', 'machine learning')
            .or(query().contains('abstract', 'deep learning'));
        })
        .not('is_retracted:true');
      
      const result = qb.build();
      
      expect(result).toContain('type:article');
      expect(result).toContain('is_oa:true');
      expect(result).toContain('publication_date:2020-01-01-2023-12-31');
      expect(result).toContain('cited_by_count:>10');
      expect(result).toContain('!(is_retracted:true)');
    });

    it('should build author search query', () => {
      const qb = filters.authors
        .hasOrcid()
        .and(filters.authors.byInstitution('I86987016'))
        .and(filters.authors.byCitationCount(100));
      
      const result = qb.build();
      
      expect(result).toContain('orcid:!null');
      expect(result).toContain('last_known_institutions.id:I86987016');
      expect(result).toContain('cited_by_count:>100');
    });
  });

  describe('Advanced Operators', () => {
    describe('containsNoStem', () => {
      it('should create no-stem search filter', () => {
        const qb = query().containsNoStem('title', 'machine learning');
        expect(qb.build()).toBe('title.search.no_stem:machine learning');
      });
    });

    describe('defaultSearch', () => {
      it('should create default search filter', () => {
        const qb = query().defaultSearch('artificial intelligence');
        expect(qb.build()).toBe('default.search:artificial intelligence');
      });
    });

    describe('booleanSearch', () => {
      it('should create boolean search filter', () => {
        const qb = query().booleanSearch('title', '(machine AND learning) OR AI');
        expect(qb.build()).toBe('title.search:(machine AND learning) OR AI');
      });
    });

    describe('exactPhrase', () => {
      it('should create exact phrase search filter', () => {
        const qb = query().exactPhrase('title', 'machine learning');
        expect(qb.build()).toBe('title.search:"machine learning"');
      });
    });

    describe('includeUnknown', () => {
      it('should add include_unknown for group_by operations', () => {
        const qb = query().includeUnknown('group_by', ['value1', 'value2']);
        expect(qb.build()).toBe('group_by:value1|value2:include_unknown');
      });

      it('should fall back to regular in() for non-group_by fields', () => {
        const qb = query().includeUnknown('regular_field', ['value1', 'value2']);
        expect(qb.build()).toBe('regular_field:value1|value2');
      });
    });

    describe('betweenExclusive', () => {
      it('should create exclusive range filter', () => {
        const qb = query().betweenExclusive('citation_count', 10, 100);
        expect(qb.build()).toBe('citation_count:>10,citation_count:<100');
      });
    });

    describe('inWithLimit', () => {
      it('should handle values within limit', () => {
        const values = ['A', 'B', 'C'];
        const qb = query().inWithLimit('field', values, 5);
        expect(qb.build()).toBe('field:A|B|C');
      });

      it('should chunk values exceeding limit', () => {
        const values = Array(250).fill(null).map((_, i) => `value${i}`);
        const qb = query().inWithLimit('field', values, 100);
        const result = qb.build();
        
        // Should create OR groups for chunks
        expect(result).toContain('field:');
        expect(result.length).toBeGreaterThan(0);
      });

      it('should handle empty values array', () => {
        const qb = query().inWithLimit('field', [], 100);
        expect(qb.build()).toBe('field:');
      });

      it('should use default limit of 100', () => {
        const values = Array(150).fill(null).map((_, i) => `value${i}`);
        const qb = query().inWithLimit('field', values);
        const result = qb.build();
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    describe('Empty and null values', () => {
      it('should handle empty string values', () => {
        const qb = query().equals('field', '');
        expect(qb.build()).toBe('field:');
      });

      it('should handle null values as string', () => {
        const qb = query().equals('field', null as any);
        expect(qb.build()).toBe('field:null');
      });

      it('should handle undefined values as string', () => {
        const qb = query().equals('field', undefined as any);
        expect(qb.build()).toBe('field:undefined');
      });

      it('should handle zero values', () => {
        const qb = query().equals('field', 0);
        expect(qb.build()).toBe('field:0');
      });

      it('should handle false values', () => {
        const qb = query().equals('field', false);
        expect(qb.build()).toBe('field:false');
      });
    });

    describe('Special characters in values', () => {
      it('should handle values with commas', () => {
        const qb = query().equals('field', 'value,with,commas');
        expect(qb.build()).toBe('field:value,with,commas');
      });

      it('should handle values with colons', () => {
        const qb = query().equals('field', 'value:with:colons');
        expect(qb.build()).toBe('field:value:with:colons');
      });

      it('should handle values with pipes', () => {
        const qb = query().equals('field', 'value|with|pipes');
        expect(qb.build()).toBe('field:value|with|pipes');
      });

      it('should handle values with quotes', () => {
        const qb = query().exactPhrase('field', 'value "with" quotes');
        expect(qb.build()).toBe('field.search:"value "with" quotes"');
      });

      it('should handle values with parentheses', () => {
        const qb = query().booleanSearch('field', 'value (with) parentheses');
        expect(qb.build()).toBe('field.search:value (with) parentheses');
      });

      it('should handle unicode characters', () => {
        const qb = query().equals('field', 'université été naïve');
        expect(qb.build()).toBe('field:université été naïve');
      });
    });

    describe('Extreme values', () => {
      it('should handle very large numbers', () => {
        const qb = query().greaterThan('field', Number.MAX_SAFE_INTEGER);
        expect(qb.build()).toBe(`field:>${Number.MAX_SAFE_INTEGER}`);
      });

      it('should handle negative numbers', () => {
        const qb = query().between('field', -100, -10);
        expect(qb.build()).toBe('field:-100--10');
      });

      it('should handle floating point numbers', () => {
        const qb = query().equals('field', 3.14159);
        expect(qb.build()).toBe('field:3.14159');
      });

      it('should handle very long strings', () => {
        const longString = 'a'.repeat(1000);
        const qb = query().contains('field', longString);
        expect(qb.build()).toBe(`field.search:${longString}`);
      });

      it('should handle arrays with many values', () => {
        const manyValues = Array(500).fill(null).map((_, i) => `value${i}`);
        const qb = query().in('field', manyValues);
        const result = qb.build();
        expect(result).toContain('field:');
        expect(result.split('|').length).toBe(500);
      });
    });

    describe('Complex nested grouping', () => {
      it('should handle deeply nested groups', () => {
        const qb = query()
          .equals('outer', 'value')
          .group(g1 => {
            g1.equals('level1', 'a')
              .group(g2 => {
                g2.equals('level2', 'b')
                  .or(query().equals('level2', 'c'));
              });
          });

        const result = qb.build();
        expect(result).toContain('outer:value');
        expect(result).toContain('level1:a');
        expect(result).toContain('level2:b');
        expect(result).toContain('level2:c');
      });

      it('should handle empty groups', () => {
        const qb = query()
          .equals('field', 'value')
          .group(g => {
            // Empty group
          });

        const result = qb.build();
        expect(result).toContain('field:value');
        expect(result).toContain('()'); // Empty group
      });

      it('should handle multiple groups', () => {
        const qb = query()
          .group(g1 => {
            g1.equals('group1', 'value1');
          })
          .group(g2 => {
            g2.equals('group2', 'value2');
          });

        const result = qb.build();
        expect(result).toContain('group1:value1');
        expect(result).toContain('group2:value2');
      });
    });

    describe('OR operations edge cases', () => {
      it('should handle OR with empty filter', () => {
        const qb = query()
          .equals('field', 'value1')
          .or(''); // Empty OR

        const result = qb.build();
        expect(result).toContain('field:value1');
      });

      it('should handle multiple consecutive ORs', () => {
        const qb = query()
          .equals('field', 'value1')
          .or('field:value2')
          .or('field:value3');

        const result = qb.build();
        expect(result).toContain('||');
      });

      it('should handle OR with QueryBuilder instances', () => {
        const qb1 = query().equals('field1', 'value1');
        const qb2 = query().equals('field2', 'value2');
        
        const result = qb1.or(qb2).build();
        expect(result).toContain('field1:value1');
        expect(result).toContain('field2:value2');
        expect(result).toContain('||');
      });

      it('should handle OR when no previous filter exists', () => {
        const qb = query().or('field:value');
        // Should not create OR without a previous filter
        expect(qb.build()).toBe('');
      });
    });

    describe('NOT operations edge cases', () => {
      it('should handle NOT with QueryBuilder instance', () => {
        const notQb = query().equals('field', 'value');
        const qb = query().not(notQb);
        
        expect(qb.build()).toBe('!(field:value)');
      });

      it('should handle NOT with complex expressions', () => {
        const qb = query().not('(field1:value1,field2:value2)');
        expect(qb.build()).toBe('!(field1:value1,field2:value2)');
      });
    });
  });

  describe('Date Handling Edge Cases', () => {
    describe('Date edge cases', () => {
      it('should handle leap year dates', () => {
        const qb = query().dateEquals('date', '2024-02-29');
        expect(qb.build()).toBe('date:2024-02-29');
      });

      it('should handle year boundaries', () => {
        const qb = query().dateRange('date', '1999-12-31', '2000-01-01');
        expect(qb.build()).toBe('date:1999-12-31-2000-01-01');
      });

      it('should handle far future dates', () => {
        const futureDate = new Date('2099-12-31');
        const qb = query().dateAfter('date', futureDate);
        expect(qb.build()).toBe('date:>2099-12-31');
      });

      it('should handle far past dates', () => {
        const pastDate = new Date('1900-01-01');
        const qb = query().dateBefore('date', pastDate);
        expect(qb.build()).toBe('date:<1900-01-01');
      });

      it('should handle invalid date strings gracefully', () => {
        const qb = query().dateEquals('date', 'invalid-date');
        expect(qb.build()).toBe('date:invalid-date');
      });

      it('should handle Date objects with time components', () => {
        const dateWithTime = new Date('2023-06-15T14:30:45.123Z');
        const qb = query().dateEquals('date', dateWithTime);
        expect(qb.build()).toBe('date:2023-06-15');
      });
    });
  });

  describe('Predefined Filters Edge Cases', () => {
    describe('Works filters edge cases', () => {
      it('should handle works filters with extreme citation counts', () => {
        const filter = filters.works.byCitationCount(0, Number.MAX_SAFE_INTEGER);
        expect(filter.build()).toBe(`cited_by_count:0-${Number.MAX_SAFE_INTEGER}`);
      });

      it('should handle works filters with only minimum citation count', () => {
        const filter = filters.works.byCitationCount(100);
        expect(filter.build()).toBe('cited_by_count:>100');
      });

      it('should handle year filters with extreme values', () => {
        const filter = filters.works.byYearRange(1000, 3000);
        expect(filter.build()).toBe('publication_year:1000-3000');
      });

      it('should handle empty arrays in filters', () => {
        const filter = filters.works.byTypes([]);
        expect(filter.build()).toBe('type:');
      });

      it('should handle single-item arrays in filters', () => {
        const filter = filters.works.byTypes(['article']);
        expect(filter.build()).toBe('type:article');
      });

      it('should handle very long author ID lists', () => {
        const manyAuthors = Array(100).fill(null).map((_, i) => `A${i.toString().padStart(10, '0')}`);
        const filter = filters.works.byAuthors(manyAuthors);
        const result = filter.build();
        expect(result).toContain('authorships.author.id:');
        expect(result.split('|').length).toBe(100);
      });
    });

    describe('Advanced search filters', () => {
      it('should handle boolean search with complex expressions', () => {
        const filter = filters.works.titleBooleanSearch('(machine AND learning) OR (artificial AND intelligence)');
        expect(filter.build()).toBe('title.search:((machine AND learning) OR (artificial AND intelligence))');
      });

      it('should handle exact phrase with special characters', () => {
        const filter = filters.works.titleExactPhrase('machine "learning" & AI');
        expect(filter.build()).toBe('title.search:"machine "learning" & AI"');
      });

      it('should handle no-stem search', () => {
        const filter = filters.works.titleNoStem('machine learning');
        expect(filter.build()).toBe('title.search.no_stem:machine learning');
      });
    });

    describe('Date range filters', () => {
      it('should handle publication date range filters', () => {
        const filter = filters.works.publicationDateRange('2020-01-01', '2023-12-31');
        expect(filter.build()).toBe('from_publication_date:2020-01-01,to_publication_date:2023-12-31');
      });

      it('should handle Date objects in publication date range', () => {
        const from = new Date('2020-01-01');
        const to = new Date('2023-12-31');
        const filter = filters.works.publicationDateRange(from, to);
        expect(filter.build()).toBe('from_publication_date:2020-01-01,to_publication_date:2023-12-31');
      });
    });

    describe('Authors filters edge cases', () => {
      it('should handle author filters with extreme values', () => {
        const filter = filters.authors.byWorksCount(0, 50000);
        expect(filter.build()).toBe('works_count:0-50000');
      });

      it('should handle authors with very high h-index', () => {
        const filter = filters.authors.byHIndex(200);
        expect(filter.build()).toBe('summary_stats.h_index:>200');
      });

      it('should handle authors by country with empty code', () => {
        const filter = filters.authors.byCountry('');
        expect(filter.build()).toBe('last_known_institutions.country_code:');
      });
    });

    describe('Sources filters edge cases', () => {
      it('should handle APC range with extreme values', () => {
        const filter = filters.sources.apcRange(0, 50000);
        expect(filter.build()).toBe('apc_usd:0-50000');
      });

      it('should handle sources by publisher with special characters', () => {
        const filter = filters.sources.byPublisher('Springer & Nature');
        expect(filter.build()).toBe('publisher:Springer & Nature');
      });
    });

    describe('Institutions filters edge cases', () => {
      it('should handle institutions with extreme works count', () => {
        const filter = filters.institutions.byWorksCount(1000000);
        expect(filter.build()).toBe('works_count:>1000000');
      });

      it('should handle institutions by type with special characters', () => {
        const filter = filters.institutions.byType('Hospital & Medical Center');
        expect(filter.build()).toBe('type:Hospital & Medical Center');
      });
    });
  });

  describe('combineFilters Edge Cases', () => {
    it('should handle empty filter array', () => {
      const combined = combineFilters();
      expect(combined).toBe('');
    });

    it('should handle array with only empty filters', () => {
      const combined = combineFilters(query(), '', query());
      expect(combined).toBe('');
    });

    it('should handle mix of QueryBuilder and string filters', () => {
      const qb1 = query().equals('field1', 'value1');
      const qb2 = query().equals('field2', 'value2');
      const combined = combineFilters(qb1, 'field3:value3', qb2);
      
      expect(combined).toContain('field1:value1');
      expect(combined).toContain('field2:value2');
      expect(combined).toContain('field3:value3');
    });

    it('should handle null and undefined filters', () => {
      const qb = query().equals('field', 'value');
      const combined = combineFilters(qb, null as any, undefined as any);
      expect(combined).toBe('field:value');
    });

    it('should handle very long filter combinations', () => {
      const manyFilters = Array(100).fill(null).map((_, i) => 
        query().equals(`field${i}`, `value${i}`)
      );
      const combined = combineFilters(...manyFilters);
      expect(combined.split(',').length).toBe(100);
    });
  });

  describe('QueryBuilder State Management', () => {
    it('should handle clearing after building', () => {
      const qb = query().equals('field', 'value');
      expect(qb.build()).toBe('field:value');
      
      qb.clear();
      expect(qb.build()).toBe('');
      expect(qb.isEmpty()).toBe(true);
    });

    it('should handle multiple builds without changing state', () => {
      const qb = query().equals('field', 'value');
      const result1 = qb.build();
      const result2 = qb.build();
      expect(result1).toBe(result2);
      expect(result1).toBe('field:value');
    });

    it('should handle chaining after build', () => {
      const qb = query().equals('field1', 'value1');
      qb.build(); // Build once
      qb.and('field2:value2'); // Add more after build
      
      const result = qb.build();
      expect(result).toContain('field1:value1');
      expect(result).toContain('field2:value2');
    });

    it('should handle isEmpty correctly in various states', () => {
      const qb = query();
      expect(qb.isEmpty()).toBe(true);
      
      qb.equals('field', 'value');
      expect(qb.isEmpty()).toBe(false);
      
      qb.clear();
      expect(qb.isEmpty()).toBe(true);
    });
  });
});