/**
 * Unit tests for data processing utilities
 * 
 * Tests data transformation, aggregation, and statistical functions
 * used across visualization components.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Work, Author, Institution } from '@/lib/openalex/types';
import {
  transformWorksToTimeline,
  aggregateByYear,
  calculateCollaborationNetwork,
  generateHeatmapData,
  prepareSankeyData,
  calculateStatistics,
  normalizeData,
  detectOutliers,
  groupByCategory,
  calculateTrends,
  type TimelineDataPoint,
  type NetworkNode,
  type NetworkEdge,
  type HeatmapDataPoint,
  type SankeyNode,
  type SankeyLink,
  type StatisticalSummary
} from './data-processing';

// ============================================================================
// Test Data Factory
// ============================================================================

function createMockWork(overrides: Partial<Work> = {}): Work {
  return {
    id: 'W123456789',
    display_name: 'Test Work',
    publication_year: 2023,
    cited_by_count: 10,
    authorships: [
      {
        author_position: 'first',
        author: {
          id: 'A123456789',
          display_name: 'Test Author',
          orcid: undefined
        },
        institutions: [
          {
            id: 'I123456789',
            display_name: 'Test Institution',
            ror: null,
            country_code: 'US',
            type: 'education'
          }
        ],
        countries: ['US'],
        is_corresponding: true,
        raw_author_name: 'Test Author',
        raw_affiliation_strings: ['Test Institution'],
        affiliations: [
          {
            raw_affiliation_string: 'Test Institution',
            institution_ids: ['I123456789']
          }
        ]
      }
    ],
    concepts: [
      {
        id: 'C123456789',
        wikidata: 'Q123456',
        display_name: 'Test Concept',
        level: 1,
        score: 0.8
      }
    ],
    primary_location: {
      source: {
        id: 'S123456789',
        display_name: 'Test Journal',
        issn_l: '1234-5678',
        issn: ['1234-5678'],
        is_oa: true,
        is_in_doaj: true,
        host_organization: 'https://openalex.org/P123456789',
        host_organization_name: 'Test Publisher',
        host_organization_lineage: ['https://openalex.org/P123456789'],
        type: 'journal'
      },
      landing_page_url: 'https://example.com/work',
      pdf_url: null,
      is_oa: true,
      version: 'publishedVersion',
      license: 'cc-by'
    },
    type: 'article',
    open_access: {
      is_oa: true,
      oa_date: '2023-01-01',
      oa_url: 'https://example.com/work.pdf',
      any_repository_has_fulltext: true
    },
    created_date: '2023-01-01',
    updated_date: '2023-01-01',
    ...overrides
  } as Work;
}

function createMockAuthor(overrides: Partial<Author> = {}): Author {
  return {
    id: 'A123456789',
    display_name: 'Test Author',
    display_name_alternatives: [],
    works_count: 10,
    cited_by_count: 100,
    last_known_institutions: [
      {
        id: 'I123456789',
        display_name: 'Test Institution',
        ror: null,
        country_code: 'US',
        type: 'education'
      }
    ],
    affiliations: [
      {
        institution: {
          id: 'I123456789',
          display_name: 'Test Institution',
          ror: null,
          country_code: 'US',
          type: 'education'
        },
        years: [2020, 2021, 2022, 2023]
      }
    ],
    created_date: '2020-01-01',
    updated_date: '2023-01-01',
    ...overrides
  } as Author;
}

function createMockInstitution(overrides: Partial<Institution> = {}): Institution {
  return {
    id: 'I123456789',
    display_name: 'Test Institution',
    display_name_alternatives: [],
    display_name_acronyms: [],
    ror: 'https://ror.org/123456789',
    country_code: 'US',
    type: 'education',
    homepage_url: 'https://example.edu',
    image_url: null,
    image_thumbnail_url: null,
    works_count: 1000,
    cited_by_count: 10000,
    geo: {
      city: 'Test City',
      geonames_city_id: '123456',
      region: 'Test State',
      country_code: 'US',
      country: 'United States',
      latitude: 40.7128,
      longitude: -74.0060
    },
    lineage: ['I123456789'],
    created_date: '2020-01-01',
    updated_date: '2023-01-01',
    ...overrides
  } as Institution;
}

// ============================================================================
// Timeline Data Processing Tests
// ============================================================================

describe('Timeline Data Processing', () => {
  let mockWorks: Work[];

  beforeEach(() => {
    mockWorks = [
      createMockWork({ 
        id: 'W1', 
        publication_year: 2020, 
        cited_by_count: 5,
        display_name: 'Work 2020' 
      }),
      createMockWork({ 
        id: 'W2', 
        publication_year: 2021, 
        cited_by_count: 10,
        display_name: 'Work 2021' 
      }),
      createMockWork({ 
        id: 'W3', 
        publication_year: 2021, 
        cited_by_count: 15,
        display_name: 'Work 2021-2' 
      }),
      createMockWork({ 
        id: 'W4', 
        publication_year: 2022, 
        cited_by_count: 20,
        display_name: 'Work 2022' 
      }),
      createMockWork({ 
        id: 'W5', 
        publication_year: undefined, 
        cited_by_count: 8,
        display_name: 'Work No Year' 
      })
    ];
  });

  describe('transformWorksToTimeline', () => {
    it('should transform works to timeline data points', () => {
      const result = transformWorksToTimeline(mockWorks, 'publication_count');
      
      expect(result).toHaveLength(3); // 2020, 2021, 2022 (excluding null year)
      
      const point2020 = result.find(p => p.date.getFullYear() === 2020);
      expect(point2020).toBeDefined();
      expect(point2020!.value).toBe(1);
      expect(point2020!.label).toBe('2020');
      
      const point2021 = result.find(p => p.date.getFullYear() === 2021);
      expect(point2021).toBeDefined();
      expect(point2021!.value).toBe(2);
      expect(point2021!.label).toBe('2021');
    });

    it('should transform works to citation timeline', () => {
      const result = transformWorksToTimeline(mockWorks, 'citation_count');
      
      const point2021 = result.find(p => p.date.getFullYear() === 2021);
      expect(point2021).toBeDefined();
      expect(point2021!.value).toBe(25); // 10 + 15
    });

    it('should handle empty works array', () => {
      const result = transformWorksToTimeline([], 'publication_count');
      expect(result).toHaveLength(0);
    });

    it('should include metadata in timeline points', () => {
      const result = transformWorksToTimeline(mockWorks, 'publication_count');
      
      const point2020 = result.find(p => p.date.getFullYear() === 2020);
      expect(point2020!.metadata).toEqual({
        works: [mockWorks[0]],
        year: 2020
      });
    });
  });

  describe('aggregateByYear', () => {
    it('should aggregate data by year', () => {
      const data: TimelineDataPoint[] = [
        { date: new Date('2020-01-01'), value: 5, label: '2020' },
        { date: new Date('2021-01-01'), value: 10, label: '2021' },
        { date: new Date('2021-06-01'), value: 15, label: '2021-mid' },
        { date: new Date('2022-01-01'), value: 20, label: '2022' }
      ];

      const result = aggregateByYear(data, 'sum');
      
      expect(result).toHaveLength(3);
      expect(result[1].value).toBe(25); // 10 + 15 for 2021
    });

    it('should aggregate with average function', () => {
      const data: TimelineDataPoint[] = [
        { date: new Date('2021-01-01'), value: 10, label: '2021' },
        { date: new Date('2021-06-01'), value: 20, label: '2021-mid' }
      ];

      const result = aggregateByYear(data, 'average');
      
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(15); // (10 + 20) / 2
    });

    it('should aggregate with max function', () => {
      const data: TimelineDataPoint[] = [
        { date: new Date('2021-01-01'), value: 10, label: '2021' },
        { date: new Date('2021-06-01'), value: 20, label: '2021-mid' }
      ];

      const result = aggregateByYear(data, 'max');
      
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(20);
    });
  });
});

// ============================================================================
// Network Data Processing Tests
// ============================================================================

describe('Network Data Processing', () => {
  let mockAuthors: Author[];
  let mockWorks: Work[];

  beforeEach(() => {
    mockAuthors = [
      createMockAuthor({ 
        id: 'A1', 
        display_name: 'Author 1',
        works_count: 10,
        cited_by_count: 100
      }),
      createMockAuthor({ 
        id: 'A2', 
        display_name: 'Author 2',
        works_count: 15,
        cited_by_count: 150
      }),
      createMockAuthor({ 
        id: 'A3', 
        display_name: 'Author 3',
        works_count: 8,
        cited_by_count: 80
      })
    ];

    mockWorks = [
      createMockWork({
        id: 'W1',
        authorships: [
          {
            author_position: 'first',
            author: { id: 'A1', display_name: 'Author 1', orcid: undefined },
            institutions: [],
            countries: [],
            is_corresponding: true,
            raw_author_name: 'Author 1',
            raw_affiliation_strings: [],
            affiliations: []
          },
          {
            author_position: 'middle',
            author: { id: 'A2', display_name: 'Author 2', orcid: undefined },
            institutions: [],
            countries: [],
            is_corresponding: false,
            raw_author_name: 'Author 2',
            raw_affiliation_strings: [],
            affiliations: []
          }
        ]
      }),
      createMockWork({
        id: 'W2',
        authorships: [
          {
            author_position: 'first',
            author: { id: 'A2', display_name: 'Author 2', orcid: undefined },
            institutions: [],
            countries: [],
            is_corresponding: true,
            raw_author_name: 'Author 2',
            raw_affiliation_strings: [],
            affiliations: []
          },
          {
            author_position: 'last',
            author: { id: 'A3', display_name: 'Author 3', orcid: undefined },
            institutions: [],
            countries: [],
            is_corresponding: false,
            raw_author_name: 'Author 3',
            raw_affiliation_strings: [],
            affiliations: []
          }
        ]
      })
    ];
  });

  describe('calculateCollaborationNetwork', () => {
    it('should create nodes for all authors', () => {
      const result = calculateCollaborationNetwork(mockWorks);
      
      expect(result.nodes).toHaveLength(3);
      expect(result.nodes.map(n => n.id)).toEqual(['A1', 'A2', 'A3']);
    });

    it('should create edges for collaborations', () => {
      const result = calculateCollaborationNetwork(mockWorks);
      
      expect(result.edges).toHaveLength(2);
      
      const edge1 = result.edges.find(e => 
        (e.source === 'A1' && e.target === 'A2') ||
        (e.source === 'A2' && e.target === 'A1')
      );
      expect(edge1).toBeDefined();
      expect(edge1!.weight).toBe(1);

      const edge2 = result.edges.find(e => 
        (e.source === 'A2' && e.target === 'A3') ||
        (e.source === 'A3' && e.target === 'A2')
      );
      expect(edge2).toBeDefined();
      expect(edge2!.weight).toBe(1);
    });

    it('should calculate node sizes based on works count', () => {
      const result = calculateCollaborationNetwork(mockWorks);
      
      const nodeA1 = result.nodes.find(n => n.id === 'A1');
      const nodeA2 = result.nodes.find(n => n.id === 'A2');
      
      expect(nodeA2?.size ?? 0).toBeGreaterThan(nodeA1?.size ?? 0);
    });

    it('should handle empty works array', () => {
      const result = calculateCollaborationNetwork([]);
      
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });
  });
});

// ============================================================================
// Heatmap Data Processing Tests
// ============================================================================

describe('Heatmap Data Processing', () => {
  describe('generateHeatmapData', () => {
    it('should generate publication heatmap by institution and year', () => {
      const mockWorks = [
        createMockWork({
          publication_year: 2020,
          authorships: [{
            author_position: 'first',
            author: { id: 'A1', display_name: 'Author 1', orcid: undefined },
            institutions: [createMockInstitution({ id: 'I1', display_name: 'Institution 1' })],
            countries: [],
            is_corresponding: true,
            raw_author_name: 'Author 1',
            raw_affiliation_strings: [],
            affiliations: [
              {
                raw_affiliation_string: 'Institution 1',
                institution_ids: ['I1']
              }
            ]
          }]
        }),
        createMockWork({
          publication_year: 2021,
          authorships: [{
            author_position: 'first',
            author: { id: 'A2', display_name: 'Author 2', orcid: undefined },
            institutions: [createMockInstitution({ id: 'I1', display_name: 'Institution 1' })],
            countries: [],
            is_corresponding: true,
            raw_author_name: 'Author 2',
            raw_affiliation_strings: [],
            affiliations: [
              {
                raw_affiliation_string: 'Institution 1',
                institution_ids: ['I1']
              }
            ]
          }]
        })
      ];

      const result = generateHeatmapData(mockWorks, 'institution', 'year', 'publication_count');
      
      expect(result.length).toBeGreaterThan(0);
      
      const i1_2020 = result.find(d => d.x === 'Institution 1' && d.y === 2020);
      expect(i1_2020).toBeDefined();
      expect(i1_2020!.value).toBe(1);
      
      const i1_2021 = result.find(d => d.x === 'Institution 1' && d.y === 2021);
      expect(i1_2021).toBeDefined();
      expect(i1_2021!.value).toBe(1);
    });

    it('should generate citation heatmap', () => {
      const mockWorks = [
        createMockWork({
          publication_year: 2020,
          cited_by_count: 10,
          authorships: [{
            author_position: 'first',
            author: { id: 'A1', display_name: 'Author 1', orcid: undefined },
            institutions: [createMockInstitution({ id: 'I1', display_name: 'Institution 1' })],
            countries: [],
            is_corresponding: true,
            raw_author_name: 'Author 1',
            raw_affiliation_strings: [],
            affiliations: [
              {
                raw_affiliation_string: 'Institution 1',
                institution_ids: ['I1']
              }
            ]
          }]
        })
      ];

      const result = generateHeatmapData(mockWorks, 'institution', 'year', 'citation_count');
      
      const dataPoint = result.find(d => d.x === 'Institution 1' && d.y === 2020);
      expect(dataPoint).toBeDefined();
      expect(dataPoint!.value).toBe(10);
    });

    it('should handle empty data gracefully', () => {
      const result = generateHeatmapData([], 'institution', 'year', 'publication_count');
      expect(result).toHaveLength(0);
    });
  });
});

// ============================================================================
// Sankey Data Processing Tests
// ============================================================================

describe('Sankey Data Processing', () => {
  describe('prepareSankeyData', () => {
    it('should create Sankey data for institution to topic flow', () => {
      const mockWorks = [
        createMockWork({
          authorships: [{
            author_position: 'first',
            author: { id: 'A1', display_name: 'Author 1', orcid: undefined },
            institutions: [createMockInstitution({ id: 'I1', display_name: 'Institution 1' })],
            countries: [],
            is_corresponding: true,
            raw_author_name: 'Author 1',
            raw_affiliation_strings: [],
            affiliations: [
              {
                raw_affiliation_string: 'Institution 1',
                institution_ids: ['I1']
              }
            ]
          }],
          concepts: [{
            id: 'C1',
            wikidata: 'Q1',
            display_name: 'Concept 1',
            level: 1,
            score: 0.8
          }]
        })
      ];

      const result = prepareSankeyData(mockWorks, 'institution', 'concept');
      
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.links.length).toBeGreaterThan(0);
      
      const institutionNode = result.nodes.find(n => n.label === 'Institution 1');
      const conceptNode = result.nodes.find(n => n.label === 'Concept 1');
      
      expect(institutionNode).toBeDefined();
      expect(conceptNode).toBeDefined();
      
      const link = result.links.find(l => 
        l.source === institutionNode!.id && l.target === conceptNode!.id
      );
      expect(link).toBeDefined();
      expect(link!.value).toBe(1);
    });

    it('should handle multiple works with same flow', () => {
      const mockWorks = [
        createMockWork({
          authorships: [{
            author_position: 'first',
            author: { id: 'A1', display_name: 'Author 1', orcid: undefined },
            institutions: [createMockInstitution({ id: 'I1', display_name: 'Institution 1' })],
            countries: [],
            is_corresponding: true,
            raw_author_name: 'Author 1',
            raw_affiliation_strings: [],
            affiliations: [
              {
                raw_affiliation_string: 'Institution 1',
                institution_ids: ['I1']
              }
            ]
          }],
          concepts: [{
            id: 'C1',
            wikidata: 'Q1',
            display_name: 'Concept 1',
            level: 1,
            score: 0.8
          }]
        }),
        createMockWork({
          authorships: [{
            author_position: 'first',
            author: { id: 'A2', display_name: 'Author 2', orcid: undefined },
            institutions: [createMockInstitution({ id: 'I1', display_name: 'Institution 1' })],
            countries: [],
            is_corresponding: true,
            raw_author_name: 'Author 2',
            raw_affiliation_strings: [],
            affiliations: [
              {
                raw_affiliation_string: 'Institution 1',
                institution_ids: ['I1']
              }
            ]
          }],
          concepts: [{
            id: 'C1',
            wikidata: 'Q1',
            display_name: 'Concept 1',
            level: 1,
            score: 0.8
          }]
        })
      ];

      const result = prepareSankeyData(mockWorks, 'institution', 'concept');
      
      const link = result.links[0];
      expect(link.value).toBe(2);
    });
  });
});

// ============================================================================
// Statistical Processing Tests
// ============================================================================

describe('Statistical Processing', () => {
  describe('calculateStatistics', () => {
    it('should calculate basic statistics', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = calculateStatistics(data);
      
      expect(result.count).toBe(10);
      expect(result.sum).toBe(55);
      expect(result.mean).toBe(5.5);
      expect(result.median).toBe(5.5);
      expect(result.min).toBe(1);
      expect(result.max).toBe(10);
      expect(result.range).toBe(9);
    });

    it('should calculate standard deviation', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      const result = calculateStatistics(data);
      
      expect(result.stdDev).toBeCloseTo(2, 1);
      expect(result.variance).toBeCloseTo(4, 1);
    });

    it('should handle empty array', () => {
      const result = calculateStatistics([]);
      
      expect(result.count).toBe(0);
      expect(result.sum).toBe(0);
      expect(result.mean).toBeNaN();
    });

    it('should calculate quartiles correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const result = calculateStatistics(data);
      
      expect(result.q1).toBe(3);
      expect(result.q3).toBe(7);
      expect(result.iqr).toBe(4);
    });
  });

  describe('normalizeData', () => {
    it('should normalize data to 0-1 range', () => {
      const data = [10, 20, 30, 40, 50];
      const result = normalizeData(data);
      
      expect(result[0]).toBe(0);
      expect(result[4]).toBe(1);
      expect(result[2]).toBe(0.5);
    });

    it('should handle single value array', () => {
      const data = [42];
      const result = normalizeData(data);
      
      expect(result[0]).toBe(0);
    });

    it('should handle empty array', () => {
      const result = normalizeData([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('detectOutliers', () => {
    it('should detect outliers using IQR method', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100]; // 100 is an outlier
      const result = detectOutliers(data, 'iqr');
      
      expect(result.outliers).toContain(100);
      expect(result.outliers).toHaveLength(1);
    });

    it('should detect outliers using z-score method', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
      const result = detectOutliers(data, 'zscore', 2);
      
      expect(result.outliers).toContain(100);
    });

    it('should return clean data without outliers', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
      const result = detectOutliers(data, 'iqr');
      
      expect(result.cleanData).not.toContain(100);
      expect(result.cleanData).toHaveLength(9);
    });
  });

  describe('groupByCategory', () => {
    it('should group data by category', () => {
      const data = [
        { category: 'A', value: 10 },
        { category: 'B', value: 20 },
        { category: 'A', value: 30 },
        { category: 'C', value: 40 }
      ];

      const result = groupByCategory(data, item => item.category);
      
      expect(result['A']).toHaveLength(2);
      expect(result['B']).toHaveLength(1);
      expect(result['C']).toHaveLength(1);
    });
  });

  describe('calculateTrends', () => {
    it('should calculate trend for increasing data', () => {
      const data = [
        { date: new Date('2020-01-01'), value: 10 },
        { date: new Date('2021-01-01'), value: 20 },
        { date: new Date('2022-01-01'), value: 30 }
      ];

      const result = calculateTrends(data);
      
      expect(result.direction).toBe('increasing');
      expect(result.slope).toBeGreaterThan(0);
      expect(result.correlation).toBeCloseTo(1, 1);
    });

    it('should calculate trend for decreasing data', () => {
      const data = [
        { date: new Date('2020-01-01'), value: 30 },
        { date: new Date('2021-01-01'), value: 20 },
        { date: new Date('2022-01-01'), value: 10 }
      ];

      const result = calculateTrends(data);
      
      expect(result.direction).toBe('decreasing');
      expect(result.slope).toBeLessThan(0);
    });

    it('should calculate trend for stable data', () => {
      const data = [
        { date: new Date('2020-01-01'), value: 20 },
        { date: new Date('2021-01-01'), value: 20 },
        { date: new Date('2022-01-01'), value: 20 }
      ];

      const result = calculateTrends(data);
      
      expect(result.direction).toBe('stable');
      expect(Math.abs(result.slope)).toBeLessThan(0.01);
    });
  });
});