/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach } from 'vitest';

import type { CitationNetwork, CitationNode, CitationEdge, CoauthorNetwork, CoauthorNode, CoauthorEdge } from './citation-network';
import {
  validateCitationNetwork,
  exportCitationNetworkToJSON,
  exportCitationNetworkToCSV,
  exportCitationNetworkToGraphML,
  exportCitationNetworkToBibTeX,
  exportCitationNetworkToRIS,
  getExportFilename,
  NetworkExportResult,
} from './citation-network-export';

// Mock test data
const mockCitationNodes: CitationNode[] = [
  {
    id: 'W2741809807',
    title: 'Machine Learning for Citation Networks',
    year: 2020,
    citedByCount: 250,
    depth: 0,
    work: {
      id: 'W2741809807',
      doi: '10.1038/s41586-020-2052-3',
      title: 'Machine Learning for Citation Networks',
      display_name: 'Machine Learning for Citation Networks',
      publication_year: 2020,
      publication_date: '2020-03-15',
      type: 'article',
      ids: { openalex: 'https://openalex.org/W2741809807', doi: '10.1038/s41586-020-2052-3' },
      countries_distinct_count: 1,
      institutions_distinct_count: 1,
      has_fulltext: true,
      cited_by_count: 250,
      is_retracted: false,
      is_paratext: false,
      locations_count: 1,
      referenced_works_count: 0,
      open_access: {
        is_oa: true,
        oa_status: 'gold' as const,
        oa_url: 'https://www.nature.com/articles/s41586-020-2052-3',
        any_repository_has_fulltext: true,
      },
      authorships: [
        {
          author_position: 'first',
          author: {
            id: 'A2058174099',
            display_name: 'John Smith',
            orcid: '0000-0002-1825-0097',
          },
          institutions: [],
          countries: [],
          is_corresponding: true,
          raw_author_name: 'John Smith',
          raw_affiliation_strings: [],
          affiliations: [],
        },
      ],
      primary_location: {
        source: {
          id: 'S1234567890',
          display_name: 'Nature',
          issn_l: '0028-0836',
          issn: ['0028-0836', '1476-4687'],
          is_oa: false,
          is_in_doaj: false,
          host_organization: undefined,
          host_organization_name: undefined,
          host_organization_lineage: [],
          host_organization_lineage_names: [],
          type: 'journal',
        },
        landing_page_url: 'https://www.nature.com/articles/s41586-020-2052-3',
        pdf_url: undefined,
        is_oa: true,
        version: 'publishedVersion',
        license: 'cc-by',
        is_accepted: true,
        is_published: true,
      },
      locations: [],
      best_oa_location: undefined,
      sustainable_development_goals: [],
      grants: [],
      cited_by_api_url: '',
      counts_by_year: [],
      updated_date: '2023-10-01',
      created_date: '2020-03-15',
    },
  },
  {
    id: 'W3045678901',
    title: 'Deep Neural Networks in Scientific Research',
    year: 2021,
    citedByCount: 89,
    depth: 1,
    work: {
      id: 'W3045678901',
      doi: '10.1016/j.neunet.2021.04.012',
      title: 'Deep Neural Networks in Scientific Research',
      display_name: 'Deep Neural Networks in Scientific Research',
      publication_year: 2021,
      publication_date: '2021-07-22',
      type: 'article',
      ids: { openalex: 'https://openalex.org/W3045678901', doi: '10.1016/j.neunet.2021.04.012' },
      countries_distinct_count: 1,
      institutions_distinct_count: 1,
      has_fulltext: false,
      cited_by_count: 89,
      is_retracted: false,
      is_paratext: false,
      locations_count: 1,
      referenced_works_count: 0,
      open_access: {
        is_oa: false,
        oa_status: 'closed' as const,
        oa_url: undefined,
        any_repository_has_fulltext: false,
      },
      authorships: [
        {
          author_position: 'first',
          author: {
            id: 'A1234567890',
            display_name: 'Jane Doe',
            orcid: '0000-0003-1613-5981',
          },
          institutions: [],
          countries: [],
          is_corresponding: true,
          raw_author_name: 'Jane Doe',
          raw_affiliation_strings: [],
          affiliations: [],
        },
      ],
      primary_location: {
        source: {
          id: 'S9876543210',
          display_name: 'Neural Networks',
          issn_l: '0893-6080',
          issn: ['0893-6080'],
          is_oa: false,
          is_in_doaj: false,
          host_organization: undefined,
          host_organization_name: undefined,
          host_organization_lineage: [],
          host_organization_lineage_names: [],
          type: 'journal',
        },
        landing_page_url: 'https://www.sciencedirect.com/science/article/pii/S0893608021001234',
        pdf_url: undefined,
        is_oa: false,
        version: undefined,
        license: undefined,
        is_accepted: false,
        is_published: true,
      },
      locations: [],
      best_oa_location: undefined,
      sustainable_development_goals: [],
      grants: [],
      cited_by_api_url: '',
      counts_by_year: [],
      updated_date: '2023-10-01',
      created_date: '2021-07-22',
    },
  },
];

const mockCitationEdges: CitationEdge[] = [
  {
    source: 'W2741809807',
    target: 'W3045678901',
    type: 'cites',
  },
];

const mockCitationNetwork: CitationNetwork = {
  nodes: mockCitationNodes,
  edges: mockCitationEdges,
};

const mockCoauthorNodes: CoauthorNode[] = [
  {
    id: 'A2058174099',
    name: 'John Smith',
    worksCount: 45,
    citedByCount: 1500,
    author: {
      id: 'A2058174099',
      orcid: '0000-0002-1825-0097',
      display_name: 'John Smith',
      display_name_alternatives: [],
      works_count: 45,
      cited_by_count: 1500,
      summary_stats: {
        '2yr_mean_citedness': 12.5,
        h_index: 18,
        i10_index: 25,
      },
      ids: {
        openalex: 'https://openalex.org/A2058174099',
        orcid: 'https://orcid.org/0000-0002-1825-0097',
      },
      last_known_institutions: [
        {
          id: 'I1234567890',
          display_name: 'Stanford University',
          ror: 'https://ror.org/00f54p054',
          country_code: 'US',
          type: 'education' as const,
          type_id: 'education',
          lineage: ['I1234567890'],
          ids: { openalex: 'https://openalex.org/I1234567890', ror: 'https://ror.org/00f54p054' },
          works_count: 50000,
          cited_by_count: 500000,
          summary_stats: {
            '2yr_mean_citedness': 15.2,
            h_index: 250,
            i10_index: 1200,
          },
          counts_by_year: [],
          works_api_url: 'https://api.openalex.org/works?filter=institutions.id:I1234567890',
          updated_date: '2023-10-01',
          created_date: '2010-01-01',
        },
      ],
      affiliations: [],
      counts_by_year: [],
      works_api_url: '',
      updated_date: '2023-10-01',
      created_date: '2020-01-01',
    },
  },
  {
    id: 'A1234567890',
    name: 'Jane Doe',
    worksCount: 32,
    citedByCount: 890,
    author: {
      id: 'A1234567890',
      orcid: '0000-0003-1613-5981',
      display_name: 'Jane Doe',
      display_name_alternatives: [],
      works_count: 32,
      cited_by_count: 890,
      summary_stats: {
        '2yr_mean_citedness': 8.3,
        h_index: 15,
        i10_index: 20,
      },
      ids: {
        openalex: 'https://openalex.org/A1234567890',
        orcid: 'https://orcid.org/0000-0003-1613-5981',
      },
      last_known_institutions: [
        {
          id: 'I9876543210',
          display_name: 'MIT',
          ror: 'https://ror.org/042nb2s44',
          country_code: 'US',
          type: 'education' as const,
          type_id: 'education',
          lineage: ['I9876543210'],
          ids: { openalex: 'https://openalex.org/I9876543210', ror: 'https://ror.org/042nb2s44' },
          works_count: 40000,
          cited_by_count: 400000,
          summary_stats: {
            '2yr_mean_citedness': 18.5,
            h_index: 280,
            i10_index: 1400,
          },
          counts_by_year: [],
          works_api_url: 'https://api.openalex.org/works?filter=institutions.id:I9876543210',
          updated_date: '2023-10-01',
          created_date: '2008-01-01',
        },
      ],
      affiliations: [],
      counts_by_year: [],
      works_api_url: '',
      updated_date: '2023-10-01',
      created_date: '2019-01-01',
    },
  },
];

const mockCoauthorEdges: CoauthorEdge[] = [
  {
    source: 'A2058174099',
    target: 'A1234567890',
    weight: 3,
    works: ['W2741809807', 'W1111111111', 'W2222222222'],
  },
];

const mockCoauthorNetwork: CoauthorNetwork = {
  nodes: mockCoauthorNodes,
  edges: mockCoauthorEdges,
};

describe('Citation Network Export - Enhanced Formats', () => {
  describe('GraphML Export', () => {
    it('should export citation network to GraphML format', () => {
      const result = exportCitationNetworkToGraphML(mockCitationNetwork, {
        includeMetadata: true,
        filenamePrefix: 'test-citation',
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe('graphml');
      expect(result.filename).toMatch(/test-citation-.*\.graphml/);
      expect(result.data).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.data).toContain('<graphml');
      expect(result.data).toContain('<graph');
      expect(result.data).toContain('<node');
      expect(result.data).toContain('<edge');
      expect(result.metadata?.nodeCount).toBe(2);
      expect(result.metadata?.edgeCount).toBe(1);
    });

    it('should export coauthor network to GraphML format', () => {
      const result = exportCitationNetworkToGraphML(mockCoauthorNetwork, {
        includeMetadata: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain('<data key="name">');
      expect(result.data).toContain('<data key="worksCount">');
      expect(result.data).toContain('<data key="weight">');
    });

    it('should handle GraphML export with custom attributes', () => {
      const result = exportCitationNetworkToGraphML(mockCitationNetwork, {
        includeMetadata: true,
        includeAbstracts: false,
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain('<key id="citedByCount"');
      expect(result.data).toContain('<key id="year"');
      expect(result.data).toContain('<key id="doi"');
    });

    it('should validate GraphML output structure', () => {
      const result = exportCitationNetworkToGraphML(mockCitationNetwork);

      expect(result.success).toBe(true);
      const graphmlContent = result.data as string;

      // Check for proper XML structure
      expect(graphmlContent).toMatch(/<graphml[^>]*>/);
      expect(graphmlContent).toMatch(/<\/graphml>$/);
      expect(graphmlContent).toContain('<graph id="CitationNetwork" edgedefault="directed">');

      // Check for proper key definitions
      expect(graphmlContent).toContain('<key id="title" for="node" attr.name="title" attr.type="string"/>');
      expect(graphmlContent).toContain('<key id="citedByCount" for="node" attr.name="citedByCount" attr.type="int"/>');
    });
  });

  describe('BibTeX Export', () => {
    it('should export citation network to BibTeX format', () => {
      const result = exportCitationNetworkToBibTeX(mockCitationNetwork, {
        includeMetadata: true,
        filenamePrefix: 'test-citations',
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe('bibtex');
      expect(result.filename).toMatch(/test-citations-.*\.bib/);
      expect(result.data).toContain('@article{');
      expect(result.data).toContain('title={Machine Learning for Citation Networks}');
      expect(result.data).toContain('author={John Smith}');
      expect(result.data).toContain('year={2020}');
      expect(result.data).toContain('doi={10.1038/s41586-020-2052-3}');
    });

    it('should handle multiple authors in BibTeX format', () => {
      const result = exportCitationNetworkToBibTeX(mockCitationNetwork);

      expect(result.success).toBe(true);
      const bibContent = result.data as string;
      expect(bibContent).toContain('author={John Smith}');
    });

    it('should generate valid BibTeX keys', () => {
      const result = exportCitationNetworkToBibTeX(mockCitationNetwork);

      expect(result.success).toBe(true);
      const bibContent = result.data as string;

      // Check for valid BibTeX keys (author surname + year)
      expect(bibContent).toContain('@article{Smith2020,');
      expect(bibContent).toContain('@article{Doe2021,');
    });

    it('should only export works with publication data', () => {
      const result = exportCitationNetworkToBibTeX(mockCoauthorNetwork);

      expect(result.success).toBe(true);
      expect(result.metadata?.nodeCount).toBe(0); // No works in coauthor network
    });

    it('should handle special characters in BibTeX', () => {
      const networkWithSpecialChars: CitationNetwork = {
        nodes: [
          {
            ...mockCitationNodes[0],
            title: 'Machine Learning & Neural Networks: A Survey',
            work: {
              ...mockCitationNodes[0].work!,
              title: 'Machine Learning & Neural Networks: A Survey',
              authorships: [
                {
                  ...mockCitationNodes[0].work!.authorships[0],
                  author: {
                    ...mockCitationNodes[0].work!.authorships[0].author,
                    display_name: 'José García-López',
                  },
                },
              ],
            },
          },
        ],
        edges: [],
      };

      const result = exportCitationNetworkToBibTeX(networkWithSpecialChars);

      expect(result.success).toBe(true);
      expect(result.data).toContain('title={Machine Learning \\& Neural Networks: A Survey}');
      expect(result.data).toContain('author={Jos\\\'{e} Garc\\\'{i}a-L\\\'{o}pez}');
    });
  });

  describe('RIS Export', () => {
    it('should export citation network to RIS format', () => {
      const result = exportCitationNetworkToRIS(mockCitationNetwork, {
        includeMetadata: true,
        filenamePrefix: 'test-ris',
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe('ris');
      expect(result.filename).toMatch(/test-ris-.*\.ris/);
      expect(result.data).toContain('TY  - JOUR');
      expect(result.data).toContain('TI  - Machine Learning for Citation Networks');
      expect(result.data).toContain('AU  - Smith, John');
      expect(result.data).toContain('PY  - 2020');
      expect(result.data).toContain('DO  - 10.1038/s41586-020-2052-3');
      expect(result.data).toContain('ER  -');
    });

    it('should handle different publication types in RIS', () => {
      const result = exportCitationNetworkToRIS(mockCitationNetwork);

      expect(result.success).toBe(true);
      const risContent = result.data as string;

      // All test publications are journal articles
      expect(risContent).toContain('TY  - JOUR');
    });

    it('should format RIS author names correctly', () => {
      const result = exportCitationNetworkToRIS(mockCitationNetwork);

      expect(result.success).toBe(true);
      const risContent = result.data as string;

      // RIS format uses "Last, First" format
      expect(risContent).toContain('AU  - Smith, John');
      expect(risContent).toContain('AU  - Doe, Jane');
    });

    it('should include journal information in RIS', () => {
      const result = exportCitationNetworkToRIS(mockCitationNetwork);

      expect(result.success).toBe(true);
      const risContent = result.data as string;

      expect(risContent).toContain('JO  - Nature');
      expect(risContent).toContain('JO  - Neural Networks');
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalNetwork: CitationNetwork = {
        nodes: [
          {
            id: 'W1234567890',
            title: 'Minimal Work',
            year: 2022,
            citedByCount: 5,
            depth: 0,
            work: {
              id: 'W1234567890',
              title: 'Minimal Work',
              display_name: 'Minimal Work',
              publication_year: 2022,
              type: 'article',
              ids: { openalex: 'https://openalex.org/W1234567890' },
              countries_distinct_count: 0,
              institutions_distinct_count: 0,
              has_fulltext: false,
              cited_by_count: 5,
              is_retracted: false,
              is_paratext: false,
              locations_count: 0,
              referenced_works_count: 0,
              authorships: [],
              primary_location: undefined,
              locations: [],
              best_oa_location: undefined,
              open_access: { 
                is_oa: false, 
                oa_status: 'closed' as const, 
                oa_url: undefined, 
                any_repository_has_fulltext: false 
              },
              sustainable_development_goals: [],
              grants: [],
              cited_by_api_url: '',
              counts_by_year: [],
              updated_date: '2023-10-01',
              created_date: '2022-01-01',
            },
          },
        ],
        edges: [],
      };

      const result = exportCitationNetworkToRIS(minimalNetwork);

      expect(result.success).toBe(true);
      expect(result.data).toContain('TI  - Minimal Work');
      expect(result.data).toContain('PY  - 2022');
    });
  });

  describe('Export Validation and Error Handling', () => {
    it('should validate network before exporting', () => {
      const invalidNetwork = {
        nodes: [{ id: '', title: 'Invalid', year: 2020, citedByCount: 0, depth: 0 }],
        edges: [],
      };

      const result = exportCitationNetworkToGraphML(invalidNetwork as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });

    it('should handle large networks efficiently', () => {
      const largeNetwork: CitationNetwork = {
        nodes: Array.from({ length: 1000 }, (_, i) => ({
          ...mockCitationNodes[0],
          id: `W${i}`,
          title: `Work ${i}`,
        })),
        edges: Array.from({ length: 500 }, (_, i) => ({
          source: `W${i}`,
          target: `W${i + 500}`,
          type: 'cites' as const,
        })),
      };

      const start = performance.now();
      const result = exportCitationNetworkToGraphML(largeNetwork);
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.metadata?.nodeCount).toBe(1000);
      expect(result.metadata?.edgeCount).toBe(500);
    });

    it('should handle truncation for large networks', () => {
      const largeNetwork: CitationNetwork = {
        nodes: Array.from({ length: 100 }, (_, i) => ({
          ...mockCitationNodes[0],
          id: `W${i}`,
          title: `Work ${i}`,
          citedByCount: Math.floor(Math.random() * 1000),
        })),
        edges: [],
      };

      const result = exportCitationNetworkToGraphML(largeNetwork, {
        maxNodes: 50,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.nodeCount).toBe(50);
      expect(result.metadata?.truncated).toBe(true);
      expect(result.metadata?.originalNodeCount).toBe(100);
    });
  });

  describe('Filename Generation', () => {
    it('should generate timestamped filenames', () => {
      const filename1 = getExportFilename('graphml', 'test');
      const filename2 = getExportFilename('graphml', 'test');

      expect(filename1).toMatch(/test-\d{8}-\d{6}-\d{3}\.graphml/);
      expect(filename2).toMatch(/test-\d{8}-\d{6}-\d{3}\.graphml/);
      expect(filename1).not.toBe(filename2); // Should be unique
    });

    it('should sanitise filename prefixes', () => {
      const filename = getExportFilename('bibtex', 'test/file<name>');

      expect(filename).toMatch(/test-file-name-\d{8}-\d{6}-\d{3}\.bib/);
      expect(filename).not.toContain('/');
      expect(filename).not.toContain('<');
      expect(filename).not.toContain('>');
    });

    it('should handle custom dates', () => {
      const customDate = new Date('2023-06-15T10:30:45.123Z');
      const filename = getExportFilename('ris', 'custom', customDate);

      expect(filename).toBe('custom-20230615-103045-123.ris');
    });
  });

  describe('Export Options and Configuration', () => {
    it('should respect includeMetadata option', () => {
      const withMetadata = exportCitationNetworkToGraphML(mockCitationNetwork, {
        includeMetadata: true,
      });

      const withoutMetadata = exportCitationNetworkToGraphML(mockCitationNetwork, {
        includeMetadata: false,
      });

      expect(withMetadata.success).toBe(true);
      expect(withoutMetadata.success).toBe(true);

      const withMetaContent = withMetadata.data as string;
      const withoutMetaContent = withoutMetadata.data as string;

      expect(withMetaContent).toContain('<key id="citedByCount"');
      expect(withoutMetaContent).not.toContain('<key id="citedByCount"');
    });

    it('should handle different export formats with same options', () => {
      const options = {
        includeMetadata: true,
        maxNodes: 10,
        filenamePrefix: 'test-export',
      };

      const graphmlResult = exportCitationNetworkToGraphML(mockCitationNetwork, options);
      const bibtexResult = exportCitationNetworkToBibTeX(mockCitationNetwork, options);
      const risResult = exportCitationNetworkToRIS(mockCitationNetwork, options);

      expect(graphmlResult.success).toBe(true);
      expect(bibtexResult.success).toBe(true);
      expect(risResult.success).toBe(true);

      expect(graphmlResult.filename).toContain('test-export');
      expect(bibtexResult.filename).toContain('test-export');
      expect(risResult.filename).toContain('test-export');
    });
  });
});