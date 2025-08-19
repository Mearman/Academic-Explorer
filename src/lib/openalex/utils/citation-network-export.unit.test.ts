/**
 * Unit tests for citation network export functionality
 * Testing JSON, CSV, GraphML, BibTeX, RIS, and visual export formats
 */

import { describe, it, expect, beforeEach } from 'vitest';

import type { CitationNetwork, CitationNode, CitationEdge, CoauthorNetwork, CoauthorNode, CoauthorEdge } from './citation-network';
import { 
  exportCitationNetworkToJSON,
  exportCitationNetworkToCSV,
  exportCitationNetworkToGraphML,
  exportCitationNetworkToBibTeX,
  exportCitationNetworkToRIS,
  exportCitationNetworkToSVG,
  exportCitationNetworkToPNG,
  validateCitationNetwork,
  getExportFilename,
  type ExportFormat,
  type ExportOptions,
  type NetworkExportResult,
} from './citation-network-export';

// Mock data for testing
const mockCitationNodes: CitationNode[] = [
  {
    id: 'W123456789',
    title: 'Deep Learning for Natural Language Processing',
    year: 2020,
    citedByCount: 150,
    depth: 0,
    work: {
      id: 'https://openalex.org/W123456789',
      doi: '10.1234/example.2020.001',
      title: 'Deep Learning for Natural Language Processing',
      display_name: 'Deep Learning for Natural Language Processing',
      publication_year: 2020,
      publication_date: '2020-03-15',
      type: 'journal-article',
      cited_by_count: 150,
      authorships: [
        {
          author_position: 'first',
          author: {
            id: 'https://openalex.org/A987654321',
            display_name: 'Alice Johnson',
            orcid: 'https://orcid.org/0000-0002-1234-5678',
          },
          institutions: [
            {
              id: 'https://openalex.org/I111111111',
              display_name: 'MIT',
              ror: 'https://ror.org/042nb2s44',
              country_code: 'US',
              type: 'education',
            },
          ],
          is_corresponding: true,
          raw_author_name: 'Alice Johnson',
          raw_affiliation_strings: ['MIT'],
          affiliations: [{
            raw_affiliation_string: 'MIT',
            institution_ids: ['https://openalex.org/I111111111']
          }],
        },
        {
          author_position: 'last',
          author: {
            id: 'https://openalex.org/A876543210',
            display_name: 'Bob Smith',
            orcid: undefined,
          },
          institutions: [
            {
              id: 'https://openalex.org/I222222222',
              display_name: 'Stanford University',
              ror: 'https://ror.org/00f54p054',
              country_code: 'US',
              type: 'education',
            },
          ],
          is_corresponding: false,
          raw_author_name: 'Bob Smith',
          raw_affiliation_strings: ['Stanford University'],
          affiliations: [{
            raw_affiliation_string: 'Stanford University',
            institution_ids: ['https://openalex.org/I222222222']
          }],
        },
      ],
      primary_location: {
        source: {
          id: 'https://openalex.org/S333333333',
          display_name: 'Nature Machine Intelligence',
          issn_l: '2522-5839',
          issn: ['2522-5839'],
          type: 'journal',
          is_oa: false,
          is_in_doaj: false,
        },
        landing_page_url: 'https://www.nature.com/articles/s42256-020-0001-1',
        pdf_url: undefined,
        is_oa: false,
        version: 'publishedVersion',
        license: undefined,
        is_accepted: false,
        is_published: true,
      },
      open_access: {
        is_oa: false,
        oa_status: 'closed',
        oa_url: undefined,
        any_repository_has_fulltext: false,
      },
      biblio: {
        volume: '1',
        issue: '3',
        first_page: '123',
        last_page: '135',
      },
      abstract_inverted_index: {
        'Deep': [0],
        'learning': [1, 10],
        'has': [2],
        'revolutionized': [3],
        'natural': [4],
        'language': [5],
        'processing': [6],
        'by': [7],
        'enabling': [8],
        'machine': [9],
        'systems': [11],
        'to': [12],
        'understand': [13],
        'and': [14],
        'generate': [15],
        'human': [16],
        'text.': [17],
      },
      topics: [
        {
          id: 'https://openalex.org/T444444444',
          display_name: 'Machine Learning',
          score: 0.85,
        },
        {
          id: 'https://openalex.org/T555555555',
          display_name: 'Natural Language Processing',
          score: 0.95,
        },
      ],
      concepts: [
        {
          id: 'https://openalex.org/C666666666',
          wikidata: 'https://www.wikidata.org/wiki/Q2539',
          display_name: 'Machine learning',
          level: 1,
          score: 0.85,
        },
      ],
      referenced_works: [
        'https://openalex.org/W234567890',
        'https://openalex.org/W345678901',
      ],
      grants: [
        {
          funder: 'https://openalex.org/F777777777',
          funder_display_name: 'National Science Foundation',
          award_id: 'NSF-2020-001',
        },
      ],
      created_date: '2020-03-16',
      updated_date: '2024-01-15',
      language: 'en',
      // Add required interface properties with default values
      ids: {},
      countries_distinct_count: 2,
      institutions_distinct_count: 2,
      has_fulltext: false,
      is_retracted: false,
      is_paratext: false,
      locations_count: 1,
      referenced_works_count: 2,
      cited_by_api_url: `https://api.openalex.org/works?filter=cites:W123456789`,
      counts_by_year: [],
    },
  },
  {
    id: 'W234567890',
    title: 'Attention Is All You Need',
    year: 2017,
    citedByCount: 5000,
    depth: 1,
    work: {
      id: 'https://openalex.org/W234567890',
      doi: '10.48550/arXiv.1706.03762',
      title: 'Attention Is All You Need',
      display_name: 'Attention Is All You Need',
      publication_year: 2017,
      publication_date: '2017-06-12',
      type: 'preprint',
      cited_by_count: 5000,
      authorships: [
        {
          author_position: 'first',
          author: {
            id: 'https://openalex.org/A765432109',
            display_name: 'Ashish Vaswani',
            orcid: undefined,
          },
          institutions: [
            {
              id: 'https://openalex.org/I888888888',
              display_name: 'Google Research',
              ror: undefined,
              country_code: 'US',
              type: 'company',
            },
          ],
          is_corresponding: false,
          raw_author_name: 'Ashish Vaswani',
          raw_affiliation_strings: ['Google Research'],
          affiliations: [{
            raw_affiliation_string: 'Google Research',
            institution_ids: ['https://openalex.org/I888888888']
          }],
        },
      ],
      primary_location: {
        source: {
          id: 'https://openalex.org/S999999999',
          display_name: 'arXiv',
          issn_l: undefined,
          issn: undefined,
          type: 'repository',
          is_oa: true,
          is_in_doaj: false,
        },
        landing_page_url: 'https://arxiv.org/abs/1706.03762',
        pdf_url: 'https://arxiv.org/pdf/1706.03762.pdf',
        is_oa: true,
        version: 'submittedVersion',
        license: undefined,
        is_accepted: false,
        is_published: true,
      },
      open_access: {
        is_oa: true,
        oa_status: 'green',
        oa_url: 'https://arxiv.org/pdf/1706.03762.pdf',
        any_repository_has_fulltext: true,
      },
      biblio: {
        volume: undefined,
        issue: undefined,
        first_page: undefined,
        last_page: undefined,
      },
      abstract_inverted_index: {
        'The': [0],
        'dominant': [1],
        'sequence': [2],
        'transduction': [3],
        'models': [4],
        'are': [5],
        'based': [6],
        'on': [7],
        'complex': [8],
        'recurrent': [9],
        'or': [10],
        'convolutional': [11],
        'neural': [12],
        'networks.': [13],
      },
      topics: [
        {
          id: 'https://openalex.org/T444444444',
          display_name: 'Machine Learning',
          score: 0.90,
        },
      ],
      concepts: [
        {
          id: 'https://openalex.org/C666666666',
          wikidata: 'https://www.wikidata.org/wiki/Q2539',
          display_name: 'Machine learning',
          level: 1,
          score: 0.90,
        },
      ],
      referenced_works: [],
      grants: [],
      created_date: '2017-06-13',
      updated_date: '2024-01-15',
      language: 'en',
      // Add required interface properties with default values
      ids: {},
      countries_distinct_count: 1,
      institutions_distinct_count: 1,
      has_fulltext: true,
      is_retracted: false,
      is_paratext: false,
      locations_count: 1,
      referenced_works_count: 0,
      cited_by_api_url: `https://api.openalex.org/works?filter=cites:W234567890`,
      counts_by_year: [],
    },
  },
];

const mockCitationEdges: CitationEdge[] = [
  {
    source: 'W123456789',
    target: 'W234567890',
    type: 'cites',
  },
];

const mockCitationNetwork: CitationNetwork = {
  nodes: mockCitationNodes,
  edges: mockCitationEdges,
};

const mockCoauthorNodes: CoauthorNode[] = [
  {
    id: 'A987654321',
    name: 'Alice Johnson',
    worksCount: 45,
    citedByCount: 2500,
    author: {
      id: 'https://openalex.org/A987654321',
      display_name: 'Alice Johnson',
      orcid: 'https://orcid.org/0000-0002-1234-5678',
      works_count: 45,
      cited_by_count: 2500,
      affiliations: [
        {
          institution: {
            id: 'https://openalex.org/I111111111',
            display_name: 'MIT',
            ror: 'https://ror.org/042nb2s44',
            country_code: 'US',
            type: 'education',
          },
          years: [2018, 2019, 2020, 2021, 2022, 2023, 2024],
        },
      ],
      last_known_institutions: [
        {
          id: 'https://openalex.org/I111111111',
          display_name: 'MIT',
          ror: 'https://ror.org/042nb2s44',
          country_code: 'US',
          type: 'education',
          type_id: 'https://openalex.org/institution-types/education',
          ids: {},
          works_count: 10000,
          cited_by_count: 50000,
          summary_stats: {
            '2yr_mean_citedness': 5.2,
            h_index: 150,
            i10_index: 500,
          },
          counts_by_year: [],
          works_api_url: 'https://api.openalex.org/works?filter=institutions.id:I111111111',
          updated_date: '2024-01-15',
          created_date: '2018-01-01',
        },
      ],
      topics: [
        {
          id: 'https://openalex.org/T444444444',
          display_name: 'Machine Learning',
          works_count: 5000,
          cited_by_count: 100000,
          ids: {},
          works_api_url: 'https://api.openalex.org/works?filter=topics.id:T444444444',
          updated_date: '2024-01-15',
          created_date: '2018-01-01',
        },
      ],
      summary_stats: {
        '2yr_mean_citedness': 12.5,
        h_index: 18,
        i10_index: 25,
      },
      ids: {},
      counts_by_year: [],
      works_api_url: 'https://api.openalex.org/works?filter=author.id:A987654321',
      created_date: '2018-01-01',
      updated_date: '2024-01-15',
    },
  },
  {
    id: 'A876543210',
    name: 'Bob Smith',
    worksCount: 32,
    citedByCount: 1800,
    author: {
      id: 'https://openalex.org/A876543210',
      display_name: 'Bob Smith',
      orcid: undefined,
      works_count: 32,
      cited_by_count: 1800,
      affiliations: [
        {
          institution: {
            id: 'https://openalex.org/I222222222',
            display_name: 'Stanford University',
            ror: 'https://ror.org/00f54p054',
            country_code: 'US',
            type: 'education',
          },
          years: [2019, 2020, 2021, 2022, 2023, 2024],
        },
      ],
      last_known_institutions: [
        {
          id: 'https://openalex.org/I222222222',
          display_name: 'Stanford University',
          ror: 'https://ror.org/00f54p054',
          country_code: 'US',
          type: 'education',
          type_id: 'https://openalex.org/institution-types/education',
          ids: {},
          works_count: 15000,
          cited_by_count: 75000,
          summary_stats: {
            '2yr_mean_citedness': 6.1,
            h_index: 200,
            i10_index: 600,
          },
          counts_by_year: [],
          works_api_url: 'https://api.openalex.org/works?filter=institutions.id:I222222222',
          updated_date: '2024-01-15',
          created_date: '2018-01-01',
        },
      ],
      topics: [
        {
          id: 'https://openalex.org/T444444444',
          display_name: 'Machine Learning',
          works_count: 5000,
          cited_by_count: 100000,
          ids: {},
          works_api_url: 'https://api.openalex.org/works?filter=topics.id:T444444444',
          updated_date: '2024-01-15',
          created_date: '2018-01-01',
        },
      ],
      summary_stats: {
        '2yr_mean_citedness': 8.2,
        h_index: 14,
        i10_index: 20,
      },
      ids: {},
      counts_by_year: [],
      works_api_url: 'https://api.openalex.org/works?filter=author.id:A876543210',
      created_date: '2019-01-01',
      updated_date: '2024-01-15',
    },
  },
];

const mockCoauthorEdges: CoauthorEdge[] = [
  {
    source: 'A987654321',
    target: 'A876543210',
    weight: 3,
    works: ['W123456789', 'W345678901', 'W456789012'],
  },
];

const mockCoauthorNetwork: CoauthorNetwork = {
  nodes: mockCoauthorNodes,
  edges: mockCoauthorEdges,
};

describe('Citation Network Export - JSON Format', () => {
  it('should export empty citation network to JSON', () => {
    const emptyNetwork: CitationNetwork = { nodes: [], edges: [] };
    const result = exportCitationNetworkToJSON(emptyNetwork);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.format).toBe('json');
    expect(result.filename).toMatch(/^citation-network-\d{8}-\d{6}-\d{3}\.json$/);
    
    const parsedData = JSON.parse(typeof result.data === 'string' ? result.data : '{}');
    expect(parsedData).toEqual({
      metadata: {
        exportedAt: expect.any(String),
        version: '1.0.0',
        type: 'citation-network',
        nodeCount: 0,
        edgeCount: 0,
      },
      network: {
        nodes: [],
        edges: [],
      },
    });
  });

  it('should export basic citation network to JSON', () => {
    const result = exportCitationNetworkToJSON(mockCitationNetwork);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.format).toBe('json');
    expect(result.filename).toMatch(/^citation-network-\d{8}-\d{6}-\d{3}\.json$/);
    
    const parsedData = JSON.parse(typeof result.data === 'string' ? result.data : '{}');
    expect(parsedData.metadata.nodeCount).toBe(2);
    expect(parsedData.metadata.edgeCount).toBe(1);
    expect(parsedData.network.nodes).toHaveLength(2);
    expect(parsedData.network.edges).toHaveLength(1);
    
    // Verify node structure
    const firstNode = parsedData.network.nodes[0];
    expect(firstNode).toEqual({
      id: 'W123456789',
      title: 'Deep Learning for Natural Language Processing',
      year: 2020,
      citedByCount: 150,
      depth: 0,
      type: 'work',
      doi: '10.1234/example.2020.001',
      authors: ['Alice Johnson', 'Bob Smith'],
      journal: 'Nature Machine Intelligence',
      openAccess: false,
    });
    
    // Verify edge structure
    const firstEdge = parsedData.network.edges[0];
    expect(firstEdge).toEqual({
      source: 'W123456789',
      target: 'W234567890',
      type: 'cites',
      weight: 1,
    });
  });

  it('should export coauthor network to JSON', () => {
    const result = exportCitationNetworkToJSON(mockCoauthorNetwork);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    const parsedData = JSON.parse(typeof result.data === 'string' ? result.data : '{}');
    expect(parsedData.metadata.type).toBe('coauthor-network');
    expect(parsedData.metadata.nodeCount).toBe(2);
    expect(parsedData.metadata.edgeCount).toBe(1);
    
    // Verify coauthor node structure
    const firstNode = parsedData.network.nodes[0];
    expect(firstNode).toEqual({
      id: 'A987654321',
      name: 'Alice Johnson',
      type: 'author',
      worksCount: 45,
      citedByCount: 2500,
      orcid: 'https://orcid.org/0000-0002-1234-5678',
      hIndex: 18,
      institutions: ['MIT'],
    });
    
    // Verify coauthor edge structure
    const firstEdge = parsedData.network.edges[0];
    expect(firstEdge).toEqual({
      source: 'A987654321',
      target: 'A876543210',
      type: 'collaboration',
      weight: 3,
      sharedWorks: ['W123456789', 'W345678901', 'W456789012'],
    });
  });

  it('should include custom export options in JSON metadata', () => {
    const options: ExportOptions = {
      includeMetadata: true,
      includeAbstracts: true,
      maxNodes: 1000,
      format: 'json',
      compress: false,
    };
    
    const result = exportCitationNetworkToJSON(mockCitationNetwork, options);
    
    expect(result.success).toBe(true);
    const parsedData = JSON.parse(typeof result.data === 'string' ? result.data : '{}');
    expect(parsedData.metadata.exportOptions).toEqual(options);
  });

  it('should handle nodes with missing optional data gracefully', () => {
    const nodeWithMissingData: CitationNode = {
      id: 'W999999999',
      title: 'Test Paper',
      citedByCount: 0,
      depth: 0,
      // Missing year and work
    };
    
    const networkWithMissingData: CitationNetwork = {
      nodes: [nodeWithMissingData],
      edges: [],
    };
    
    const result = exportCitationNetworkToJSON(networkWithMissingData);
    
    expect(result.success).toBe(true);
    const parsedData = JSON.parse(typeof result.data === 'string' ? result.data : '{}');
    const node = parsedData.network.nodes[0];
    
    expect(node.id).toBe('W999999999');
    expect(node.title).toBe('Test Paper');
    expect(node.year).toBeNull();
    expect(node.doi).toBeNull();
    expect(node.authors).toEqual([]);
    expect(node.journal).toBeNull();
  });

  it('should fail validation for invalid citation network', () => {
    const invalidNetwork = {
      nodes: [{ id: '', title: 'Invalid', citedByCount: -1 }], // Invalid: empty ID, negative citation count
      edges: [{ source: 'nonexistent', target: 'W123', type: 'cites' }], // Invalid: source doesn't exist
    } as CitationNetwork;
    
    const result = exportCitationNetworkToJSON(invalidNetwork);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('validation');
  });

  it('should generate unique filenames for concurrent exports', async () => {
    const result1 = exportCitationNetworkToJSON(mockCitationNetwork);
    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
    const result2 = exportCitationNetworkToJSON(mockCitationNetwork);
    
    expect(result1.filename).not.toBe(result2.filename);
  });

  it('should respect maxNodes limit', () => {
    const options: ExportOptions = {
      maxNodes: 1,
      format: 'json',
    };
    
    const result = exportCitationNetworkToJSON(mockCitationNetwork, options);
    
    expect(result.success).toBe(true);
    const parsedData = JSON.parse(typeof result.data === 'string' ? result.data : '{}');
    expect(parsedData.network.nodes).toHaveLength(1);
    expect(parsedData.metadata.truncated).toBe(true);
    expect(parsedData.metadata.originalNodeCount).toBe(2);
  });
});

describe('Citation Network Export - Validation', () => {
  it('should validate valid citation network', () => {
    const validation = validateCitationNetwork(mockCitationNetwork);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect missing node IDs', () => {
    const invalidNetwork: CitationNetwork = {
      nodes: [{ id: '', title: 'Invalid', citedByCount: 0, depth: 0 }],
      edges: [],
    };
    
    const validation = validateCitationNetwork(invalidNetwork);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Node has empty or invalid ID');
  });

  it('should detect duplicate node IDs', () => {
    const invalidNetwork: CitationNetwork = {
      nodes: [
        { id: 'W123', title: 'Paper 1', citedByCount: 0, depth: 0 },
        { id: 'W123', title: 'Paper 2', citedByCount: 0, depth: 0 },
      ],
      edges: [],
    };
    
    const validation = validateCitationNetwork(invalidNetwork);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Duplicate node ID: W123');
  });

  it('should detect orphaned edges', () => {
    const invalidNetwork: CitationNetwork = {
      nodes: [{ id: 'W123', title: 'Paper 1', citedByCount: 0, depth: 0 }],
      edges: [{ source: 'W123', target: 'W999', type: 'cites' }],
    };
    
    const validation = validateCitationNetwork(invalidNetwork);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Edge references non-existent target node: W999');
  });

  it('should detect invalid citation counts', () => {
    const invalidNetwork: CitationNetwork = {
      nodes: [{ id: 'W123', title: 'Paper 1', citedByCount: -5, depth: 0 }],
      edges: [],
    };
    
    const validation = validateCitationNetwork(invalidNetwork);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Node W123 has invalid cited_by_count: -5');
  });

  it('should detect invalid depth values', () => {
    const invalidNetwork: CitationNetwork = {
      nodes: [{ id: 'W123', title: 'Paper 1', citedByCount: 0, depth: -1 }],
      edges: [],
    };
    
    const validation = validateCitationNetwork(invalidNetwork);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Node W123 has invalid depth: -1');
  });
});

describe('Citation Network Export - Filename Generation', () => {
  it('should generate filename with default format', () => {
    const filename = getExportFilename('json');
    expect(filename).toMatch(/^citation-network-\d{8}-\d{6}-\d{3}\.json$/);
  });

  it('should generate filename with custom prefix', () => {
    const filename = getExportFilename('csv', 'my-network');
    expect(filename).toMatch(/^my-network-\d{8}-\d{6}-\d{3}\.csv$/);
  });

  it('should generate filename with custom timestamp', () => {
    const customDate = new Date('2024-01-15T10:30:45.123Z');
    const filename = getExportFilename('graphml', 'test', customDate);
    expect(filename).toBe('test-20240115-103045-123.graphml');
  });

  it('should sanitise invalid filename characters', () => {
    const filename = getExportFilename('json', 'my/network:with*invalid<chars>');
    expect(filename).toMatch(/^my-network-with-invalid-chars-\d{8}-\d{6}-\d{3}\.json$/);
  });
});

// TODO: These test cases will be implemented as we add more export formats
describe('Citation Network Export - CSV Format', () => {
  it('should export citation network to CSV format', () => {
    const result = exportCitationNetworkToCSV(mockCitationNetwork);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.format).toBe('csv');
    expect(result.filename).toMatch(/^citation-network-\d{8}-\d{6}-\d{3}\.csv$/);
    
    const csvLines = typeof result.data === 'string' ? result.data.split('\n') : [];
    expect(csvLines[0]).toBe('id,title,year,citedByCount,depth,type,doi,authors,journal,openAccess');
    expect(csvLines).toHaveLength(3); // Header + 2 data rows
    
    // Verify first data row
    const firstRow = csvLines[1].split(',');
    expect(firstRow[0]).toBe('W123456789');
    expect(firstRow[1]).toBe('Deep Learning for Natural Language Processing');
    expect(firstRow[2]).toBe('2020');
    expect(firstRow[3]).toBe('150');
  });

  it('should export coauthor network to CSV format', () => {
    const result = exportCitationNetworkToCSV(mockCoauthorNetwork);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    const csvLines = typeof result.data === 'string' ? result.data.split('\n') : [];
    expect(csvLines[0]).toBe('id,name,type,worksCount,citedByCount,orcid,hIndex,institutions');
    expect(csvLines).toHaveLength(3); // Header + 2 data rows
    
    // Verify first data row
    const firstRow = csvLines[1].split(',');
    expect(firstRow[0]).toBe('A987654321');
    expect(firstRow[1]).toBe('Alice Johnson');
    expect(firstRow[2]).toBe('author');
    expect(firstRow[3]).toBe('45');
  });

  it('should handle missing data in CSV export', () => {
    const nodeWithMissingData: CitationNode = {
      id: 'W999999999',
      title: 'Test Paper',
      citedByCount: 0,
      depth: 0,
      // Missing year and work
    };
    
    const networkWithMissingData: CitationNetwork = {
      nodes: [nodeWithMissingData],
      edges: [],
    };
    
    const result = exportCitationNetworkToCSV(networkWithMissingData);
    
    expect(result.success).toBe(true);
    const csvLines = typeof result.data === 'string' ? result.data.split('\n') : [];
    const dataRow = csvLines[1].split(',');
    
    expect(dataRow[0]).toBe('W999999999');
    expect(dataRow[1]).toBe('Test Paper');
    expect(dataRow[2]).toBe(''); // Missing year should be empty
    expect(dataRow[6]).toBe(''); // Missing DOI should be empty
  });

  it('should escape CSV special characters', () => {
    const nodeWithSpecialChars: CitationNode = {
      id: 'W123',
      title: 'Paper with "quotes", commas, and\nnewlines',
      citedByCount: 10,
      depth: 0,
      work: {
        id: 'https://openalex.org/W123',
        title: 'Paper with "quotes", commas, and\nnewlines',
        display_name: 'Paper with "quotes", commas, and\nnewlines',
        doi: '10.1234/test,comma',
        authorships: [],
        // Minimal required fields for Work interface
        ids: {},
        open_access: {
          is_oa: false,
          oa_status: 'closed',
          any_repository_has_fulltext: false,
        },
        countries_distinct_count: 0,
        institutions_distinct_count: 0,
        cited_by_count: 10,
        has_fulltext: false,
        is_retracted: false,
        is_paratext: false,
        locations_count: 0,
        referenced_works_count: 0,
        cited_by_api_url: 'https://api.openalex.org/works?filter=cites:W123',
        counts_by_year: [],
        updated_date: '2024-01-15',
        created_date: '2024-01-15',
      } as any, // Type assertion for brevity in test
    };
    
    const network: CitationNetwork = {
      nodes: [nodeWithSpecialChars],
      edges: [],
    };
    
    const result = exportCitationNetworkToCSV(network);
    
    expect(result.success).toBe(true);
    const csvLines = typeof result.data === 'string' ? result.data.split('\n') : [];
    const dataRow = csvLines[1];
    
    // Should properly escape quotes and handle special characters
    expect(dataRow).toContain('Paper with ""quotes"", commas, and');
    // The DOI with comma should be properly escaped in quotes
    expect(typeof result.data === 'string' ? result.data : '').toContain('"10.1234/test,comma"');
  });

  it('should export with custom field selection', () => {
    const options: ExportOptions = {
      format: 'csv',
      includeMetadata: false,
    };
    
    const result = exportCitationNetworkToCSV(mockCitationNetwork, options);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    // Should still include all default fields but potentially in different order
    const csvLines = typeof result.data === 'string' ? result.data.split('\n') : [];
    expect(csvLines[0]).toContain('id');
    expect(csvLines[0]).toContain('title');
    expect(csvLines[0]).toContain('citedByCount');
  });

  it('should export edges to CSV format', () => {
    const result = exportCitationNetworkToCSV(mockCitationNetwork, { format: 'csv', includeEdges: true });
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    // Should contain both nodes and edges sections
    const csvData = typeof result.data === 'string' ? result.data : '';
    expect(csvData).toContain('# Nodes');
    expect(csvData).toContain('# Edges');
    expect(csvData).toContain('source,target,type,weight');
  });
});

describe('Citation Network Export - GraphML Format', () => {
  it.todo('should export citation network to GraphML format');
  it.todo('should include node and edge attributes in GraphML');
  it.todo('should handle network with no edges in GraphML');
  it.todo('should validate GraphML output against schema');
});

describe('Citation Network Export - BibTeX Format', () => {
  it.todo('should export citation network nodes to BibTeX');
  it.todo('should handle missing bibliography data');
  it.todo('should escape BibTeX special characters');
  it.todo('should include custom BibTeX fields');
});

describe('Citation Network Export - RIS Format', () => {
  it.todo('should export citation network nodes to RIS');
  it.todo('should map work types to RIS types correctly');
  it.todo('should handle multiple authors in RIS format');
  it.todo('should include abstracts in RIS export');
});

describe('Citation Network Export - Visual Formats', () => {
  it.todo('should export network visualisation to SVG');
  it.todo('should export network visualisation to PNG');
  it.todo('should handle large networks in visual export');
  it.todo('should include legend in visual exports');
  it.todo('should support custom styling in visual exports');
});

describe('Citation Network Export - Performance & Memory', () => {
  it.todo('should handle large networks efficiently');
  it.todo('should stream large CSV exports');
  it.todo('should show progress for long-running exports');
  it.todo('should limit memory usage for very large networks');
});

describe('Citation Network Export - Error Handling', () => {
  it.todo('should handle malformed network data gracefully');
  it.todo('should recover from partial export failures');
  it.todo('should provide meaningful error messages');
  it.todo('should clean up resources on export failure');
});