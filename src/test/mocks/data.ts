import type { Work, Author, Source, Institution, ApiResponse } from '@/lib/openalex/types';

export const mockWork: Work = {
  id: 'https://openalex.org/W2741809807',
  doi: 'https://doi.org/10.1038/s41586-021-03819-2',
  title: 'Test Work Title',
  display_name: 'Test Work Title',
  publication_year: 2021,
  publication_date: '2021-09-01',
  ids: {
    openalex: 'https://openalex.org/W2741809807',
    doi: 'https://doi.org/10.1038/s41586-021-03819-2',
    pmid: '34349292',
  },
  language: 'en',
  primary_location: {
    is_oa: false,
    landing_page_url: 'https://doi.org/10.1038/s41586-021-03819-2',
    pdf_url: undefined,
    source: {
      id: 'https://openalex.org/S137773608',
      display_name: 'Nature',
      issn_l: '0028-0836',
      issn: ['0028-0836', '1476-4687'],
      is_oa: false,
      is_in_doaj: false,
      type: 'journal',
      host_organization: 'https://openalex.org/P4310311648',
      host_organization_name: 'Nature Publishing Group',
      host_organization_lineage: ['https://openalex.org/P4310311648'],
      host_organization_lineage_names: ['Nature Publishing Group'],
    },
    license: undefined,
    license_id: undefined,
    version: undefined,
    is_accepted: false,
    is_published: false,
  },
  type: 'article',
  type_crossref: 'journal-article',
  indexed_in: ['crossref', 'pubmed'],
  open_access: {
    is_oa: false,
    oa_status: 'closed',
    oa_url: undefined,
    any_repository_has_fulltext: false,
  },
  authorships: [
    {
      author_position: 'first',
      author: {
        id: 'https://openalex.org/A5000000001',
        display_name: 'John Doe',
        orcid: 'https://orcid.org/0000-0001-0000-0001',
      },
      institutions: [
        {
          id: 'https://openalex.org/I86987016',
          display_name: 'Harvard University',
          ror: 'https://ror.org/03vek6s52',
          country_code: 'US',
          type: 'education',
          lineage: ['https://openalex.org/I86987016'],
        },
      ],
      countries: ['US'],
      is_corresponding: true,
      raw_author_name: 'John Doe',
      raw_affiliation_strings: ['Department of Physics, Harvard University'],
      affiliations: [
        {
          raw_affiliation_string: 'Department of Physics, Harvard University',
          institution_ids: ['https://openalex.org/I86987016'],
        },
      ],
    },
  ],
  countries_distinct_count: 1,
  institutions_distinct_count: 1,
  corresponding_author_ids: ['https://openalex.org/A5000000001'],
  corresponding_institution_ids: ['https://openalex.org/I86987016'],
  apc_list: undefined,
  apc_paid: undefined,
  fwci: 1.5,
  has_fulltext: false,
  cited_by_count: 42,
  cited_by_percentile_year: {
    min: 90,
    max: 91,
  },
  biblio: {
    volume: '597',
    issue: '7875',
    first_page: '230',
    last_page: '234',
  },
  is_retracted: false,
  is_paratext: false,
  primary_topic: {
    id: 'https://openalex.org/T10555',
    display_name: 'Quantum Computing',
    subfield: {
      id: 'https://openalex.org/subfield/1',
      display_name: 'Computer Science',
    },
    field: {
      id: 'https://openalex.org/field/1',
      display_name: 'Physical Sciences',
    },
    domain: {
      id: 'https://openalex.org/domain/1',
      display_name: 'Science',
    },
    keywords: ['quantum', 'computing'],
    siblings: [],
    works_count: 10000,
    cited_by_count: 500000,
    ids: {},
    works_api_url: 'https://api.openalex.org/works?filter=topics.id:T10555',
    updated_date: '2024-01-01',
    created_date: '2024-01-01',
  },
  topics: [],
  keywords: [],
  concepts: [],
  mesh: [],
  locations_count: 1,
  locations: [],
  best_oa_location: undefined,
  sustainable_development_goals: [],
  grants: [],
  datasets: [],
  versions: [],
  referenced_works_count: 30,
  referenced_works: [],
  related_works: [],
  abstract_inverted_index: {
    'This': [0],
    'is': [1],
    'a': [2],
    'test': [3],
    'abstract': [4],
  },
  cited_by_api_url: 'https://api.openalex.org/works?filter=cites:W2741809807',
  counts_by_year: [
    { year: 2024, works_count: 0, cited_by_count: 10 },
    { year: 2023, works_count: 0, cited_by_count: 20 },
    { year: 2022, works_count: 0, cited_by_count: 12 },
  ],
  updated_date: '2024-01-01T00:00:00.000Z',
  created_date: '2021-09-01T00:00:00.000Z',
};

export const mockAuthor: Author = {
  id: 'https://openalex.org/A5000000001',
  orcid: 'https://orcid.org/0000-0001-0000-0001',
  display_name: 'John Doe',
  display_name_alternatives: ['J. Doe', 'Doe, John'],
  works_count: 150,
  cited_by_count: 3500,
  summary_stats: {
    '2yr_mean_citedness': 2.5,
    h_index: 25,
    i10_index: 40,
  },
  ids: {
    openalex: 'https://openalex.org/A5000000001',
    orcid: 'https://orcid.org/0000-0001-0000-0001',
  },
  affiliations: [
    {
      institution: {
        id: 'https://openalex.org/I86987016',
        ror: 'https://ror.org/03vek6s52',
        display_name: 'Harvard University',
        country_code: 'US',
        type: 'education',
        lineage: ['https://openalex.org/I86987016'],
      },
      years: [2020, 2021, 2022, 2023, 2024],
    },
  ],
  last_known_institutions: [],
  topics: [],
  counts_by_year: [
    { year: 2024, works_count: 10, cited_by_count: 200 },
    { year: 2023, works_count: 15, cited_by_count: 350 },
  ],
  works_api_url: 'https://api.openalex.org/works?filter=author.id:A5000000001',
  updated_date: '2024-01-01T00:00:00.000Z',
  created_date: '2015-01-01T00:00:00.000Z',
};

export const mockSource: Source = {
  id: 'https://openalex.org/S137773608',
  issn_l: '0028-0836',
  issn: ['0028-0836', '1476-4687'],
  display_name: 'Nature',
  host_organization: 'https://openalex.org/P4310311648',
  host_organization_name: 'Nature Publishing Group',
  host_organization_lineage: ['https://openalex.org/P4310311648'],
  works_count: 200000,
  cited_by_count: 10000000,
  summary_stats: {
    '2yr_mean_citedness': 8.5,
    h_index: 450,
    i10_index: 150000,
  },
  is_oa: false,
  is_in_doaj: false,
  is_core: true,
  ids: {
    openalex: 'https://openalex.org/S137773608',
    issn_l: '0028-0836',
    issn: ['0028-0836', '1476-4687'],
  },
  homepage_url: 'https://www.nature.com',
  apc_prices: [
    {
      price: 11690,
      currency: 'USD',
    },
  ],
  apc_usd: 11690,
  country_code: 'GB',
  societies: [],
  alternate_titles: [],
  abbreviated_title: 'Nature',
  type: 'journal',
  topics: [],
  counts_by_year: [
    { year: 2024, works_count: 1000, cited_by_count: 500000 },
  ],
  works_api_url: 'https://api.openalex.org/works?filter=primary_location.source.id:S137773608',
  updated_date: '2024-01-01T00:00:00.000Z',
  created_date: '2000-01-01T00:00:00.000Z',
};

export const mockInstitution: Institution = {
  id: 'https://openalex.org/I86987016',
  ror: 'https://ror.org/03vek6s52',
  display_name: 'Harvard University',
  display_name_alternatives: ['Harvard'],
  display_name_acronyms: ['HU'],
  country_code: 'US',
  type: 'education',
  type_id: 'https://openalex.org/institution-types/education',
  lineage: ['https://openalex.org/I86987016'],
  homepage_url: 'https://www.harvard.edu',
  image_url: 'https://example.com/harvard.png',
  image_thumbnail_url: 'https://example.com/harvard-thumb.png',
  associated_institutions: [],
  geo: {
    city: 'Cambridge',
    geonames_city_id: '4931972',
    region: 'Massachusetts',
    country_code: 'US',
    country: 'United States',
    latitude: 42.3736,
    longitude: -71.1097,
  },
  international: {
    display_name: {
      en: 'Harvard University',
      es: 'Universidad de Harvard',
    },
  },
  repositories: [],
  relationship: undefined,
  ids: {
    openalex: 'https://openalex.org/I86987016',
    ror: 'https://ror.org/03vek6s52',
    grid: 'grid.38142.3c',
    wikipedia: 'https://en.wikipedia.org/wiki/Harvard_University',
    wikidata: 'https://www.wikidata.org/wiki/Q13371',
  },
  works_count: 500000,
  cited_by_count: 25000000,
  summary_stats: {
    '2yr_mean_citedness': 4.2,
    h_index: 850,
    i10_index: 400000,
  },
  topics: [],
  counts_by_year: [
    { year: 2024, works_count: 10000, cited_by_count: 1000000 },
  ],
  roles: [],
  works_api_url: 'https://api.openalex.org/works?filter=institutions.id:I86987016',
  updated_date: '2024-01-01T00:00:00.000Z',
  created_date: '2000-01-01T00:00:00.000Z',
};

export const mockWorksResponse: ApiResponse<Work> = {
  meta: {
    count: 100,
    db_response_time_ms: 50,
    page: 1,
    per_page: 25,
  },
  results: [mockWork],
};

export const mockAuthorsResponse: ApiResponse<Author> = {
  meta: {
    count: 50,
    db_response_time_ms: 30,
    page: 1,
    per_page: 25,
  },
  results: [mockAuthor],
};

// Mock data for Geo endpoints
export const mockContinent = {
  id: 'https://openalex.org/continents/europe',
  display_name: 'Europe',
  wikidata: 'https://www.wikidata.org/wiki/Q46',
  works_count: 15000000,
  cited_by_count: 500000000,
  countries_count: 44,
  updated_date: '2024-01-01T00:00:00.000Z',
  created_date: '2020-01-01T00:00:00.000Z',
};

export const mockRegion = {
  id: 'https://openalex.org/regions/western-europe',
  display_name: 'Western Europe',
  wikidata: 'https://www.wikidata.org/wiki/Q27496',
  works_count: 8000000,
  cited_by_count: 300000000,
  countries_count: 20,
  updated_date: '2024-01-01T00:00:00.000Z',
  created_date: '2020-01-01T00:00:00.000Z',
};

export const mockContinentsResponse = {
  meta: {
    count: 7,
    db_response_time_ms: 15,
    page: 1,
    per_page: 25,
  },
  results: [
    mockContinent,
    {
      id: 'https://openalex.org/continents/asia',
      display_name: 'Asia',
      wikidata: 'https://www.wikidata.org/wiki/Q48',
      works_count: 20000000,
      cited_by_count: 600000000,
      countries_count: 48,
      updated_date: '2024-01-01T00:00:00.000Z',
      created_date: '2020-01-01T00:00:00.000Z',
    },
    {
      id: 'https://openalex.org/continents/north-america',
      display_name: 'North America',
      wikidata: 'https://www.wikidata.org/wiki/Q49',
      works_count: 25000000,
      cited_by_count: 800000000,
      countries_count: 23,
      updated_date: '2024-01-01T00:00:00.000Z',
      created_date: '2020-01-01T00:00:00.000Z',
    },
  ],
};

export const mockRegionsResponse = {
  meta: {
    count: 22,
    db_response_time_ms: 18,
    page: 1,
    per_page: 25,
  },
  results: [
    mockRegion,
    {
      id: 'https://openalex.org/regions/eastern-europe',
      display_name: 'Eastern Europe',
      wikidata: 'https://www.wikidata.org/wiki/Q27468',
      works_count: 5000000,
      cited_by_count: 150000000,
      countries_count: 10,
      updated_date: '2024-01-01T00:00:00.000Z',
      created_date: '2020-01-01T00:00:00.000Z',
    },
    {
      id: 'https://openalex.org/regions/southeast-asia',
      display_name: 'Southeast Asia',
      wikidata: 'https://www.wikidata.org/wiki/Q11708',
      works_count: 3000000,
      cited_by_count: 100000000,
      countries_count: 11,
      updated_date: '2024-01-01T00:00:00.000Z',
      created_date: '2020-01-01T00:00:00.000Z',
    },
  ],
};

// Mock data for Aboutness endpoint
export const mockAboutnessResponse = {
  concepts: [
    {
      score: 0.95,
      concept: {
        id: 'https://openalex.org/C41008148',
        wikidata: 'https://www.wikidata.org/wiki/Q11862829',
        display_name: 'Computer science',
        level: 0,
        score: 0.95,
      },
    },
    {
      score: 0.87,
      concept: {
        id: 'https://openalex.org/C154945302',
        wikidata: 'https://www.wikidata.org/wiki/Q11660',
        display_name: 'Artificial intelligence',
        level: 1,
        score: 0.87,
      },
    },
    {
      score: 0.76,
      concept: {
        id: 'https://openalex.org/C119857082',
        wikidata: 'https://www.wikidata.org/wiki/Q2539',
        display_name: 'Machine learning',
        level: 2,
        score: 0.76,
      },
    },
    {
      score: 0.65,
      concept: {
        id: 'https://openalex.org/C31972630',
        wikidata: 'https://www.wikidata.org/wiki/Q189436',
        display_name: 'Deep learning',
        level: 3,
        score: 0.65,
      },
    },
  ],
  topics: [
    {
      id: 'https://openalex.org/T10555',
      display_name: 'Machine Learning and AI Applications',
      score: 0.9,
      subfield: {
        id: 'https://openalex.org/subfield/1702',
        display_name: 'Artificial Intelligence',
      },
      field: {
        id: 'https://openalex.org/field/17',
        display_name: 'Computer Science',
      },
      domain: {
        id: 'https://openalex.org/domain/3',
        display_name: 'Physical Sciences',
      },
    },
    {
      id: 'https://openalex.org/T11333',
      display_name: 'Neural Networks and Deep Learning',
      score: 0.82,
      subfield: {
        id: 'https://openalex.org/subfield/1702',
        display_name: 'Artificial Intelligence',
      },
      field: {
        id: 'https://openalex.org/field/17',
        display_name: 'Computer Science',
      },
      domain: {
        id: 'https://openalex.org/domain/3',
        display_name: 'Physical Sciences',
      },
    },
  ],
};