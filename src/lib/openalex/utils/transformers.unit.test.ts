import { describe, it, expect } from 'vitest';
import {
  reconstructAbstract,
  formatCitation,
  extractAuthorNames,
  extractInstitutionNames,
  getBestAccessUrl,
  calculateCollaborationMetrics,
  extractAllKeywords,
  groupWorksBy,
  calculateTemporalDistribution,
  buildCoAuthorshipNetwork,
  entitiesToCSV,
  deduplicateEntities,
} from './transformers';
import type { Work } from '../../types';

describe('Transformers', () => {
  describe('reconstructAbstract', () => {
    it('should reconstruct abstract from inverted index', () => {
      const invertedIndex = {
        'This': [0],
        'is': [1, 5],
        'a': [2],
        'test': [3],
        'abstract': [4],
        'valid': [6],
      };

      const result = reconstructAbstract(invertedIndex);
      expect(result).toBe('This is a test abstract is valid');
    });

    it('should handle empty inverted index', () => {
      const result = reconstructAbstract({});
      expect(result).toBeNull();
    });

    it('should handle null inverted index', () => {
      const result = reconstructAbstract(undefined);
      expect(result).toBeNull();
    });

    it('should handle complex abstract with punctuation', () => {
      const invertedIndex = {
        'Climate': [0],
        'change': [1],
        'is': [2],
        'real.': [3],
        'We': [4],
        'must': [5],
        'act': [6],
        'now!': [7],
      };

      const result = reconstructAbstract(invertedIndex);
      expect(result).toBe('Climate change is real. We must act now!');
    });

    it('should handle repeated words', () => {
      const invertedIndex = {
        'The': [0, 4],
        'quick': [1],
        'brown': [2],
        'fox': [3],
        'outfoxed': [5],
        'the': [6],
        'slow': [7],
        'fox.': [8],
      };

      const result = reconstructAbstract(invertedIndex);
      expect(result).toBe('The quick brown fox The outfoxed the slow fox.');
    });
  });

  describe('formatCitation', () => {
    const mockWork: Work = {
      id: 'W123',
      display_name: 'Test Article Title',
      publication_year: 2023,
      authorships: [
        {
          author: { display_name: 'Smith, John' },
          author_position: 'first',
        } as any,
        {
          author: { display_name: 'Doe, Jane' },
          author_position: 'middle',
        } as any,
      ],
      primary_location: {
        source: {
          display_name: 'Nature',
        },
      } as any,
      biblio: {
        volume: '500',
        issue: '7461',
        first_page: '100',
        last_page: '105',
      },
      doi: 'https://doi.org/10.1038/nature12345',
    } as Work;

    it('should format APA citation', () => {
      const result = formatCitation(mockWork, { style: 'apa' });
      expect(result).toContain('(2023)');
      expect(result).toContain('Test Article Title');
      expect(result).toContain('Nature');
    });

    it('should format MLA citation', () => {
      const result = formatCitation(mockWork, { style: 'mla' });
      expect(result).toContain('Test Article Title');
      expect(result).toContain('Nature');
      expect(result).toContain('2023');
    });

    it('should handle missing publication year', () => {
      const workWithoutYear = {
        ...mockWork,
        publication_year: undefined,
      };

      const result = formatCitation(workWithoutYear, { style: 'apa' });
      expect(result).toContain('(n.d.)');
    });

    it('should handle missing authors', () => {
      const workWithoutAuthors = {
        ...mockWork,
        authorships: [],
      };

      const result = formatCitation(workWithoutAuthors, { style: 'apa' });
      expect(result).not.toContain('undefined');
    });

    it('should include DOI when requested', () => {
      const result = formatCitation(mockWork, { 
        style: 'apa',
        includeDoi: true 
      });
      
      expect(result).toContain('10.1038/nature12345');
    });
  });

  describe('extractAuthorNames', () => {
    it('should extract author names from work', () => {
      const work: Work = {
        id: 'W123',
        display_name: 'Test Work',
        authorships: [
          { author: { display_name: 'John Smith' } },
          { author: { display_name: 'Jane Doe' } },
        ] as any[],
      } as Work;

      const names = extractAuthorNames(work);
      expect(names).toEqual(['John Smith', 'Jane Doe']);
    });

    it('should handle missing authorships', () => {
      const work = { id: 'W123' } as Work;
      const names = extractAuthorNames(work);
      expect(names).toEqual([]);
    });
  });

  describe('extractInstitutionNames', () => {
    it('should extract institution names from work', () => {
      const work: Work = {
        id: 'W123',
        display_name: 'Test Work',
        authorships: [
          {
            institutions: [
              { display_name: 'MIT' },
              { display_name: 'Harvard' },
            ],
          },
          {
            institutions: [
              { display_name: 'Stanford' },
            ],
          },
        ] as any[],
      } as Work;

      const names = extractInstitutionNames(work);
      expect(names).toContain('MIT');
      expect(names).toContain('Harvard');
      expect(names).toContain('Stanford');
    });
  });

  describe('getBestAccessUrl', () => {
    it('should return best OA location URL', () => {
      const work: Work = {
        id: 'W123',
        best_oa_location: {
          pdf_url: 'https://example.com/pdf',
          landing_page_url: 'https://example.com/article',
        },
      } as Work;

      const url = getBestAccessUrl(work);
      expect(url).toBe('https://example.com/pdf');
    });

    it('should fallback to landing page URL', () => {
      const work: Work = {
        id: 'W123',
        best_oa_location: {
          landing_page_url: 'https://example.com/article',
        },
      } as Work;

      const url = getBestAccessUrl(work);
      expect(url).toBe('https://example.com/article');
    });

    it('should fallback to primary location', () => {
      const work: Work = {
        id: 'W123',
        primary_location: {
          pdf_url: 'https://example.com/primary.pdf',
        },
      } as Work;

      const url = getBestAccessUrl(work);
      expect(url).toBe('https://example.com/primary.pdf');
    });

    it('should return null if no URL available', () => {
      const work = { id: 'W123' } as Work;
      const url = getBestAccessUrl(work);
      expect(url).toBeNull();
    });
  });

  describe('calculateCollaborationMetrics', () => {
    it('should calculate collaboration metrics', () => {
      const work: Work = {
        id: 'W123',
        authorships: [
          { author: { id: 'A1' }, institutions: [{ id: 'I1' }] },
          { author: { id: 'A2' }, institutions: [{ id: 'I1' }, { id: 'I2' }] },
          { author: { id: 'A3' }, institutions: [{ id: 'I3' }] },
        ] as any[],
        countries_distinct_count: 2,
        institutions_distinct_count: 3,
      } as Work;

      const metrics = calculateCollaborationMetrics(work);
      expect(metrics.authorCount).toBe(3);
      expect(metrics.institutionCount).toBe(3);
      expect(metrics.countryCount).toBe(2);
      expect(metrics.isInternational).toBe(true);
      expect(metrics.isInterInstitutional).toBe(true);
    });

    it('should handle single author work', () => {
      const work: Work = {
        id: 'W123',
        authorships: [
          { author: { id: 'A1' }, institutions: [{ id: 'I1' }] },
        ] as any[],
        countries_distinct_count: 1,
        institutions_distinct_count: 1,
      } as Work;

      const metrics = calculateCollaborationMetrics(work);
      expect(metrics.authorCount).toBe(1);
      expect(metrics.isSingleAuthor).toBe(true);
      expect(metrics.isInternational).toBe(false);
    });
  });

  describe('extractAllKeywords', () => {
    it('should extract keywords from work', () => {
      const work: Work = {
        id: 'W123',
        keywords: ['machine learning', 'AI'],
        topics: [
          { keywords: ['neural networks', 'deep learning'] },
        ] as any[],
        concepts: [
          { display_name: 'Computer Science' },
        ] as any[],
      } as Work;

      const keywords = extractAllKeywords(work);
      expect(keywords).toContain('machine learning');
      expect(keywords).toContain('AI');
      expect(keywords).toContain('neural networks');
      expect(keywords).toContain('Computer Science');
    });

    it('should handle missing fields', () => {
      const work = { id: 'W123' } as Work;
      const keywords = extractAllKeywords(work);
      expect(keywords).toEqual([]);
    });
  });

  describe('groupWorksBy', () => {
    it('should group works by property', () => {
      const works: Work[] = [
        { id: 'W1', publication_year: 2023, type: 'article' },
        { id: 'W2', publication_year: 2023, type: 'preprint' },
        { id: 'W3', publication_year: 2022, type: 'article' },
      ] as Work[];

      const grouped = groupWorksBy(works, 'publication_year');
      expect(grouped[2023]).toHaveLength(2);
      expect(grouped[2022]).toHaveLength(1);
    });

    it('should handle custom grouping function', () => {
      const works: Work[] = [
        { id: 'W1', cited_by_count: 10 },
        { id: 'W2', cited_by_count: 50 },
        { id: 'W3', cited_by_count: 100 },
      ] as Work[];

      const grouped = groupWorksBy(works, 'cited_by_count', (count) => 
        count > 50 ? 'high' : 'low'
      );
      
      expect(grouped['low']).toHaveLength(2);
      expect(grouped['high']).toHaveLength(1);
    });
  });

  describe('calculateTemporalDistribution', () => {
    it('should calculate temporal distribution', () => {
      const works: Work[] = [
        { id: 'W1', publication_year: 2023, cited_by_count: 10 },
        { id: 'W2', publication_year: 2023, cited_by_count: 20 },
        { id: 'W3', publication_year: 2022, cited_by_count: 30 },
      ] as Work[];

      const distribution = calculateTemporalDistribution(works);
      
      expect(distribution.years).toContain(2023);
      expect(distribution.years).toContain(2022);
      expect(distribution.counts[2023]).toBe(2);
      expect(distribution.counts[2022]).toBe(1);
      expect(distribution.totalWorks).toBe(3);
    });

    it('should handle empty array', () => {
      const distribution = calculateTemporalDistribution([]);
      
      expect(distribution.years).toEqual([]);
      expect(distribution.totalWorks).toBe(0);
    });
  });

  describe('buildCoAuthorshipNetwork', () => {
    it('should build co-authorship network', () => {
      const works: Work[] = [
        {
          id: 'W1',
          authorships: [
            { author: { id: 'A1', display_name: 'Author 1' } },
            { author: { id: 'A2', display_name: 'Author 2' } },
          ],
        },
        {
          id: 'W2',
          authorships: [
            { author: { id: 'A1', display_name: 'Author 1' } },
            { author: { id: 'A3', display_name: 'Author 3' } },
          ],
        },
      ] as Work[];

      const network = buildCoAuthorshipNetwork(works);
      
      expect(network.nodes).toHaveLength(3);
      expect(network.edges).toHaveLength(2);
      
      const author1Node = network.nodes.find(n => n.id === 'A1');
      expect(author1Node?.works).toBe(2);
    });

    it('should track edge weights', () => {
      const works: Work[] = [
        {
          id: 'W1',
          authorships: [
            { author: { id: 'A1', display_name: 'Author 1' } },
            { author: { id: 'A2', display_name: 'Author 2' } },
          ],
        },
        {
          id: 'W2',
          authorships: [
            { author: { id: 'A1', display_name: 'Author 1' } },
            { author: { id: 'A2', display_name: 'Author 2' } },
          ],
        },
      ] as Work[];

      const network = buildCoAuthorshipNetwork(works);
      
      const edge = network.edges.find(e => 
        (e.source === 'A1' && e.target === 'A2') ||
        (e.source === 'A2' && e.target === 'A1')
      );
      
      expect(edge?.weight).toBe(2);
    });
  });

  describe('entitiesToCSV', () => {
    it('should convert entities to CSV', () => {
      const entities = [
        { id: '1', name: 'Test 1', count: 10 },
        { id: '2', name: 'Test 2', count: 20 },
      ];

      const csv = entitiesToCSV(entities);
      
      expect(csv).toContain('id,name,count');
      expect(csv).toContain('1,Test 1,10');
      expect(csv).toContain('2,Test 2,20');
    });

    it('should use selected fields', () => {
      const entities = [
        { id: '1', name: 'Test', count: 10, extra: 'ignore' },
      ];

      const csv = entitiesToCSV(entities, ['id', 'name']);
      
      expect(csv).toContain('id,name');
      expect(csv).not.toContain('count');
      expect(csv).not.toContain('extra');
    });

    it('should handle empty array', () => {
      const csv = entitiesToCSV([]);
      expect(csv).toBe('');
    });
  });

  describe('deduplicateEntities', () => {
    it('should deduplicate by id', () => {
      const entities = [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
        { id: '1', name: 'Duplicate' },
      ];

      const deduplicated = deduplicateEntities(entities);
      
      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].name).toBe('First');
    });

    it('should handle empty array', () => {
      const deduplicated = deduplicateEntities([]);
      expect(deduplicated).toEqual([]);
    });
  });
});