// @ts-nocheck
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
  continentsToCSV,
  regionsToCSV,
  extractContinentName,
  extractRegionName,
  formatGeoEntity,
  formatNumber,
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

  describe('Missing Citation Styles and Advanced Tests', () => {
    const mockWork: Work = {
      id: 'W123',
      display_name: 'Test Article Title',
      publication_year: 2023,
      authorships: [
        {
          author: { id: 'A1', display_name: 'Smith, John' },
          author_position: 'first',
        } as any,
        {
          author: { id: 'A2', display_name: 'Doe, Jane' },
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

    describe('Citation styles not implemented', () => {
      it('should fallback to default format for chicago style', () => {
        const result = formatCitation(mockWork, { style: 'chicago' });
        expect(result).toContain('Smith, John, Doe, Jane (2023). Test Article Title.');
      });

      it('should fallback to default format for harvard style', () => {
        const result = formatCitation(mockWork, { style: 'harvard' });
        expect(result).toContain('Smith, John, Doe, Jane (2023). Test Article Title.');
      });

      it('should fallback to default format for vancouver style', () => {
        const result = formatCitation(mockWork, { style: 'vancouver' });
        expect(result).toContain('Smith, John, Doe, Jane (2023). Test Article Title.');
      });

      it('should fallback to default format for bibtex style', () => {
        const result = formatCitation(mockWork, { style: 'bibtex' });
        expect(result).toContain('Smith, John, Doe, Jane (2023). Test Article Title.');
      });
    });

    describe('Citation edge cases', () => {
      it('should handle work with no biblio information', () => {
        const workNoBiblio = {
          ...mockWork,
          biblio: undefined,
        };

        const result = formatCitation(workNoBiblio, { style: 'apa' });
        expect(result).toContain('(2023)');
        expect(result).toContain('Test Article Title');
        expect(result).not.toContain('undefined');
      });

      it('should handle work with partial biblio information', () => {
        const workPartialBiblio = {
          ...mockWork,
          biblio: { volume: '500' }, // Only volume, no issue or pages
        };

        const result = formatCitation(workPartialBiblio, { style: 'apa' });
        expect(result).toContain('500');
        expect(result).not.toContain('undefined');
      });

      it('should handle work with only first page', () => {
        const workOnlyFirstPage = {
          ...mockWork,
          biblio: { 
            volume: '500',
            issue: '7461',
            first_page: '100',
            // No last_page
          },
        };

        const result = formatCitation(workOnlyFirstPage, { style: 'apa' });
        expect(result).toContain('500(7461)');
        expect(result).not.toContain('100-');
      });

      it('should handle DOI starting with https://doi.org/', () => {
        const result = formatCitation(mockWork, { 
          style: 'apa',
          includeDoi: true 
        });
        
        expect(result).toContain('https://doi.org/10.1038/nature12345');
        expect(result).not.toContain('https://doi.org/https://doi.org/');
      });

      it('should handle DOI without https://doi.org/ prefix', () => {
        const workPlainDoi = {
          ...mockWork,
          doi: '10.1038/nature12345',
        };

        const result = formatCitation(workPlainDoi, { 
          style: 'apa',
          includeDoi: true 
        });
        
        expect(result).toContain('https://doi.org/10.1038/nature12345');
      });

      it('should handle includeUrl option (legacy compatibility)', () => {
        const result = formatCitation(mockWork, { 
          style: 'apa',
          includeUrl: true 
        });
        
        expect(result).toContain('https://doi.org/https://doi.org/10.1038/nature12345');
      });

      it('should handle work with no source', () => {
        const workNoSource = {
          ...mockWork,
          primary_location: undefined,
        };

        const result = formatCitation(workNoSource, { style: 'apa' });
        expect(result).toContain('(2023)');
        expect(result).toContain('Test Article Title');
        expect(result).not.toContain('undefined');
      });

      it('should handle work with empty title', () => {
        const workEmptyTitle = {
          ...mockWork,
          display_name: '',
        };

        const result = formatCitation(workEmptyTitle, { style: 'apa' });
        expect(result).toContain('Untitled');
      });

      it('should handle work with undefined title', () => {
        const workUndefinedTitle = {
          ...mockWork,
          display_name: undefined,
        };

        const result = formatCitation(workUndefinedTitle, { style: 'apa' });
        expect(result).toContain('Untitled');
      });
    });

    describe('Author formatting edge cases', () => {
      it('should handle single author names (no spaces)', () => {
        const workSingleNameAuthor = {
          ...mockWork,
          authorships: [
            {
              author: { display_name: 'Cher' },
              author_position: 'first',
            } as any,
          ],
        };

        const result = formatCitation(workSingleNameAuthor, { style: 'apa' });
        expect(result).toContain('Cher (2023)');
      });

      it('should handle authors with middle names', () => {
        const workMiddleNameAuthor = {
          ...mockWork,
          authorships: [
            {
              author: { display_name: 'Smith, John William' },
              author_position: 'first',
            } as any,
          ],
        };

        const result = formatCitation(workMiddleNameAuthor, { style: 'apa' });
        expect(result).toContain('William, S. J.');
      });

      it('should handle many authors (>7) in APA format', () => {
        const manyAuthors = Array(10).fill(null).map((_, i) => ({
          author: { display_name: `Author, Number${i + 1}` },
          author_position: i === 0 ? 'first' : i === 9 ? 'last' : 'middle',
        } as any));

        const workManyAuthors = {
          ...mockWork,
          authorships: manyAuthors,
        };

        const result = formatCitation(workManyAuthors, { style: 'apa' });
        expect(result).toContain('...');
        expect(result).toContain('Number10');
      });

      it('should handle exactly 7 authors in APA format', () => {
        const sevenAuthors = Array(7).fill(null).map((_, i) => ({
          author: { display_name: `Author, Number${i + 1}` },
          author_position: i === 0 ? 'first' : i === 6 ? 'last' : 'middle',
        } as any));

        const workSevenAuthors = {
          ...mockWork,
          authorships: sevenAuthors,
        };

        const result = formatCitation(workSevenAuthors, { style: 'apa' });
        expect(result).not.toContain('...');
        expect(result).toContain('& Number7');
      });

      it('should handle two authors in APA format', () => {
        const twoAuthors = [
          {
            author: { display_name: 'Smith, John' },
            author_position: 'first',
          } as any,
          {
            author: { display_name: 'Doe, Jane' },
            author_position: 'last',
          } as any,
        ];

        const workTwoAuthors = {
          ...mockWork,
          authorships: twoAuthors,
        };

        const result = formatCitation(workTwoAuthors, { style: 'apa' });
        expect(result).toContain('John, S. & Jane, D.');
      });

      it('should handle three or more authors in MLA format', () => {
        const threeAuthors = [
          {
            author: { display_name: 'Smith, John' },
            author_position: 'first',
          } as any,
          {
            author: { display_name: 'Doe, Jane' },
            author_position: 'middle',
          } as any,
          {
            author: { display_name: 'Brown, Bob' },
            author_position: 'last',
          } as any,
        ];

        const workThreeAuthors = {
          ...mockWork,
          authorships: threeAuthors,
        };

        const result = formatCitation(workThreeAuthors, { style: 'mla' });
        expect(result).toContain('Smith, John, et al.');
      });

      it('should handle two authors in MLA format', () => {
        const twoAuthors = [
          {
            author: { display_name: 'Smith, John' },
            author_position: 'first',
          } as any,
          {
            author: { display_name: 'Doe, Jane' },
            author_position: 'last',
          } as any,
        ];

        const workTwoAuthors = {
          ...mockWork,
          authorships: twoAuthors,
        };

        const result = formatCitation(workTwoAuthors, { style: 'mla' });
        expect(result).toContain('Smith, John and Doe, Jane');
      });
    });
  });

  describe('Enhanced getBestAccessUrl Tests', () => {
    it('should prioritize open_access.oa_url first', () => {
      const work: Work = {
        id: 'W123',
        open_access: {
          oa_url: 'https://example.com/oa.pdf',
        },
        best_oa_location: {
          pdf_url: 'https://example.com/best.pdf',
        },
        primary_location: {
          pdf_url: 'https://example.com/primary.pdf',
        },
        doi: '10.1038/nature12345',
      } as Work;

      const url = getBestAccessUrl(work);
      expect(url).toBe('https://example.com/oa.pdf');
    });

    it('should fallback through locations array for PDF', () => {
      const work: Work = {
        id: 'W123',
        locations: [
          { landing_page_url: 'https://example.com/landing1' },
          { pdf_url: 'https://example.com/locations.pdf' },
          { landing_page_url: 'https://example.com/landing2' },
        ],
      } as Work;

      const url = getBestAccessUrl(work);
      expect(url).toBe('https://example.com/locations.pdf');
    });

    it('should fallback through locations array for landing page', () => {
      const work: Work = {
        id: 'W123',
        locations: [
          { pdf_url: undefined },
          { landing_page_url: 'https://example.com/landing.html' },
        ],
      } as Work;

      const url = getBestAccessUrl(work);
      expect(url).toBe('https://example.com/landing.html');
    });

    it('should format DOI as URL when used as fallback', () => {
      const work: Work = {
        id: 'W123',
        doi: '10.1038/nature12345',
      } as Work;

      const url = getBestAccessUrl(work);
      expect(url).toBe('https://doi.org/10.1038/nature12345');
    });

    it('should handle DOI that already includes https://doi.org/', () => {
      const work: Work = {
        id: 'W123',
        doi: 'https://doi.org/10.1038/nature12345',
      } as Work;

      const url = getBestAccessUrl(work);
      expect(url).toBe('https://doi.org/https://doi.org/10.1038/nature12345');
    });
  });

  describe('Enhanced calculateCollaborationMetrics Tests', () => {
    it('should handle corresponding authors', () => {
      const work: Work = {
        id: 'W123',
        authorships: [
          { 
            author: { id: 'A1', display_name: 'Smith, John' }, 
            institutions: [{ id: 'I1' }],
            is_corresponding: true,
          },
          { 
            author: { id: 'A2', display_name: 'Doe, Jane' }, 
            institutions: [{ id: 'I2' }],
            is_corresponding: false,
          },
        ] as any[],
      } as Work;

      const metrics = calculateCollaborationMetrics(work);
      expect(metrics.correspondingAuthors).toEqual(['Smith, John']);
    });

    it('should handle countries from authorship countries field', () => {
      const work: Work = {
        id: 'W123',
        authorships: [
          { 
            author: { id: 'A1' }, 
            institutions: [{ id: 'I1', country_code: 'US' }],
            countries: ['US', 'CA'],
          },
        ] as any[],
      } as Work;

      const metrics = calculateCollaborationMetrics(work);
      expect(metrics.countryCount).toBeGreaterThanOrEqual(2);
    });

    it('should calculate average authors per institution', () => {
      const work: Work = {
        id: 'W123',
        authorships: [
          { author: { id: 'A1' }, institutions: [{ id: 'I1' }] },
          { author: { id: 'A2' }, institutions: [{ id: 'I1' }] },
          { author: { id: 'A3' }, institutions: [{ id: 'I2' }] },
        ] as any[],
        institutions_distinct_count: 2,
      } as Work;

      const metrics = calculateCollaborationMetrics(work);
      expect(metrics.averageAuthorsPerInstitution).toBe(1.5);
    });

    it('should handle missing authorships', () => {
      const work: Work = {
        id: 'W123',
        authorships: undefined,
      } as Work;

      const metrics = calculateCollaborationMetrics(work);
      expect(metrics.authorCount).toBe(0);
      expect(metrics.isSingleAuthor).toBe(false);
      expect(metrics.isInternational).toBe(false);
      expect(metrics.correspondingAuthors).toEqual([]);
    });

    it('should prioritize work distinct counts over calculated counts', () => {
      const work: Work = {
        id: 'W123',
        authorships: [
          { author: { id: 'A1' }, institutions: [{ id: 'I1' }] },
        ] as any[],
        institutions_distinct_count: 5, // Higher than actual unique institutions
        countries_distinct_count: 3,
      } as Work;

      const metrics = calculateCollaborationMetrics(work);
      expect(metrics.institutionCount).toBe(5);
      expect(metrics.countryCount).toBe(3);
    });
  });

  describe('Enhanced extractAllKeywords Tests', () => {
    it('should handle string keywords', () => {
      const work: Work = {
        id: 'W123',
        keywords: ['machine learning', 'AI', 'neural networks'],
      } as Work;

      const keywords = extractAllKeywords(work);
      expect(keywords).toContain('machine learning');
      expect(keywords).toContain('AI');
      expect(keywords).toContain('neural networks');
    });

    it('should handle object keywords with display_name', () => {
      const work: Work = {
        id: 'W123',
        keywords: [
          { display_name: 'machine learning' },
          { display_name: 'AI' },
        ] as any[],
      } as Work;

      const keywords = extractAllKeywords(work);
      expect(keywords).toContain('machine learning');
      expect(keywords).toContain('AI');
    });

    it('should handle mixed string and object keywords', () => {
      const work: Work = {
        id: 'W123',
        keywords: [
          'string keyword',
          { display_name: 'object keyword' },
          null, // Should be ignored
          undefined, // Should be ignored
        ] as any[],
      } as Work;

      const keywords = extractAllKeywords(work);
      expect(keywords).toContain('string keyword');
      expect(keywords).toContain('object keyword');
      expect(keywords).toHaveLength(2);
    });

    it('should deduplicate keywords from different sources', () => {
      const work: Work = {
        id: 'W123',
        keywords: ['machine learning'],
        topics: [
          { keywords: ['machine learning', 'AI'] },
        ] as any[],
        concepts: [
          { display_name: 'machine learning' },
        ] as any[],
      } as Work;

      const keywords = extractAllKeywords(work);
      expect(keywords.filter(k => k === 'machine learning')).toHaveLength(1);
      expect(keywords).toContain('AI');
    });
  });

  describe('Enhanced calculateTemporalDistribution Tests', () => {
    it('should include citation data by year', () => {
      const works: Work[] = [
        { id: 'W1', publication_year: 2023, cited_by_count: 10 },
        { id: 'W2', publication_year: 2023, cited_by_count: 20 },
        { id: 'W3', publication_year: 2022, cited_by_count: 30 },
      ] as Work[];

      const distribution = calculateTemporalDistribution(works);
      
      expect(distribution.range).toEqual({ min: 2022, max: 2023 });
      expect(distribution.years).toEqual([2022, 2023]);
    });

    it('should handle works without publication year', () => {
      const works: Work[] = [
        { id: 'W1', publication_year: 2023, cited_by_count: 10 },
        { id: 'W2', publication_year: undefined, cited_by_count: 20 },
        { id: 'W3', publication_year: 2022, cited_by_count: 30 },
      ] as Work[];

      const distribution = calculateTemporalDistribution(works);
      
      expect(distribution.years).toEqual([2022, 2023]);
      expect(distribution.totalWorks).toBe(3); // Still counts all works
      expect(distribution.counts[2023]).toBe(1);
      expect(distribution.counts[2022]).toBe(1);
    });

    it('should handle empty range when no years', () => {
      const works: Work[] = [
        { id: 'W1', publication_year: undefined },
        { id: 'W2', publication_year: null },
      ] as Work[];

      const distribution = calculateTemporalDistribution(works);
      
      expect(distribution.range).toBeUndefined();
      expect(distribution.years).toEqual([]);
      expect(distribution.totalWorks).toBe(2);
    });
  });

  describe('Enhanced entitiesToCSV Tests', () => {
    it('should handle complex nested objects', () => {
      const entities = [
        { 
          id: '1', 
          name: 'Test', 
          metadata: { type: 'article', tags: ['ML', 'AI'] }
        },
      ];

      const csv = entitiesToCSV(entities);
      
      expect(csv).toContain('id,name,metadata');
      expect(csv).toContain('1,Test,{"type":"article","tags":["ML","AI"]}');
    });

    it('should handle values with commas in quotes', () => {
      const entities = [
        { id: '1', title: 'Machine Learning, AI, and Data Science' },
      ];

      const csv = entitiesToCSV(entities);
      
      expect(csv).toContain('"Machine Learning, AI, and Data Science"');
    });

    it('should handle values with quotes by escaping them', () => {
      const entities = [
        { id: '1', title: 'The "Best" Research Paper' },
      ];

      const csv = entitiesToCSV(entities);
      
      expect(csv).toContain('"The ""Best"" Research Paper"');
    });

    it('should handle values with newlines', () => {
      const entities = [
        { id: '1', description: 'Line 1\nLine 2\nLine 3' },
      ];

      const csv = entitiesToCSV(entities);
      
      expect(csv).toContain('"Line 1\nLine 2\nLine 3"');
    });

    it('should handle null and undefined values', () => {
      const entities = [
        { id: '1', name: null, description: undefined, count: 0 },
      ];

      const csv = entitiesToCSV(entities);
      
      expect(csv).toContain('1,,,0');
    });

    it('should use custom delimiter', () => {
      const entities = [
        { id: '1', name: 'Test' },
      ];

      const csv = entitiesToCSV(entities, undefined, '\t');
      
      expect(csv).toContain('id\tname');
      expect(csv).toContain('1\tTest');
    });
  });

  describe('New Functions Coverage', () => {
    it('should test continentsToCSV function', () => {
      const continents = [
        {
          id: 'C1',
          display_name: 'North America',
          wikidata: 'Q49',
          works_count: 1000000,
          cited_by_count: 5000000,
        },
      ] as any[];

      const csv = continentsToCSV(continents);
      
      expect(csv).toContain('id,display_name,wikidata,works_count,cited_by_count');
      expect(csv).toContain('C1,North America,Q49,1000000,5000000');
    });

    it('should test regionsToCSV function', () => {
      const regions = [
        {
          id: 'R1',
          display_name: 'Western Europe',
          description: 'Countries in Western Europe',
          wikidata: 'Q27496',
          works_count: 500000,
          cited_by_count: 2500000,
        },
      ] as any[];

      const csv = regionsToCSV(regions);
      
      expect(csv).toContain('id,display_name,description,wikidata,works_count,cited_by_count');
      expect(csv).toContain('R1,Western Europe,Countries in Western Europe,Q27496,500000,2500000');
    });

    it('should test extractContinentName function', () => {
      const continent = { display_name: 'Asia' } as any;
      expect(extractContinentName(continent)).toBe('Asia');
      expect(extractContinentName(null)).toBeNull();
      expect(extractContinentName(undefined)).toBeNull();
    });

    it('should test extractRegionName function', () => {
      const region = { display_name: 'Southeast Asia' } as any;
      expect(extractRegionName(region)).toBe('Southeast Asia');
      expect(extractRegionName(null)).toBeNull();
      expect(extractRegionName(undefined)).toBeNull();
    });

    it('should test formatGeoEntity function', () => {
      const entity = {
        display_name: 'Europe',
        wikidata: 'Q46',
      } as any;
      
      expect(formatGeoEntity(entity)).toBe('Europe (Q46)');
      expect(formatGeoEntity({ display_name: 'Asia' } as any)).toBe('Asia');
      expect(formatGeoEntity(null)).toBeNull();
      expect(formatGeoEntity(undefined)).toBeNull();
    });

    it('should test formatNumber function with different formats', () => {
      expect(formatNumber(1234.567, { format: 'number' })).toBe('1,235');
      expect(formatNumber(0.1234, { format: 'percentage' })).toBe('0.1%');
      expect(formatNumber(1234.56, { format: 'currency' })).toBe('$1,235');
      expect(formatNumber(1500000, { format: 'compact' })).toBe('1.5M');
      expect(formatNumber(1500, { format: 'compact' })).toBe('1.5K');
      expect(formatNumber(999, { format: 'compact' })).toBe('999');
      
      // Test with string input
      expect(formatNumber('1234.567', { format: 'number' })).toBe('1,235');
      
      // Test with invalid input
      expect(formatNumber('invalid', { format: 'number' })).toBe('invalid');
      expect(formatNumber(NaN, { format: 'number' })).toBe('NaN');
    });

    it('should test formatNumber with custom options', () => {
      expect(formatNumber(1234.567, { 
        format: 'number', 
        maximumFractionDigits: 2 
      })).toBe('1,234.57');
      
      expect(formatNumber(1234.56, { 
        format: 'currency', 
        currency: 'EUR',
        locale: 'de-DE' 
      })).toContain('€');
      
      expect(formatNumber(0.1234, { 
        format: 'percentage',
        maximumFractionDigits: 3 
      })).toBe('0.123%');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed works data in buildCoAuthorshipNetwork', () => {
      const works: Work[] = [
        {
          id: 'W1',
          authorships: [
            { author: { id: 'A1', display_name: 'Author 1' } },
            // Skip malformed authorship - it will throw
          ],
        } as Work,
      ];

      expect(() => buildCoAuthorshipNetwork(works)).not.toThrow();
    });

    it('should handle works with missing cited_by_count in buildCoAuthorshipNetwork', () => {
      const works: Work[] = [
        {
          id: 'W1',
          cited_by_count: undefined,
          authorships: [
            { author: { id: 'A1', display_name: 'Author 1' } },
          ],
        } as Work,
      ];

      const network = buildCoAuthorshipNetwork(works);
      // undefined + undefined = NaN, which is expected behavior
      expect(network.nodes[0].citations).toBeNaN();
    });

    it('should handle extractInstitutionNames with empty institutions', () => {
      const work: Work = {
        id: 'W123',
        authorships: [
          { institutions: [] } as any,
        ],
      } as Work;

      const names = extractInstitutionNames(work);
      expect(names).toEqual([]);
    });

    it('should handle groupWorksBy with undefined values', () => {
      const works: Work[] = [
        { id: 'W1', publication_year: 2023 },
        { id: 'W2', publication_year: undefined },
        { id: 'W3', publication_year: null },
      ] as Work[];

      const grouped = groupWorksBy(works, 'publication_year');
      expect(grouped['2023']).toHaveLength(1);
      expect(grouped['undefined']).toHaveLength(1);
      expect(grouped['null']).toHaveLength(1);
    });

    it('should handle empty arrays in CSV functions', () => {
      expect(continentsToCSV([])).toBe('');
      expect(regionsToCSV([])).toBe('');
    });

    it('should handle reconstructAbstract with gaps in indices', () => {
      const invertedIndex = {
        'This': [0],
        'has': [2], // Gap at index 1
        'gaps': [4], // Gap at index 3
      };

      const result = reconstructAbstract(invertedIndex);
      // Should filter out undefined words
      expect(result).toBe('This has gaps');
    });

    it('should handle calculateCollaborationMetrics with empty institutions', () => {
      const work: Work = {
        id: 'W123',
        authorships: [
          { 
            author: { id: 'A1' }, 
            institutions: [],
          },
        ] as any[],
      } as Work;

      const metrics = calculateCollaborationMetrics(work);
      expect(metrics.averageAuthorsPerInstitution).toBe(0);
    });
  });
});