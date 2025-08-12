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
});