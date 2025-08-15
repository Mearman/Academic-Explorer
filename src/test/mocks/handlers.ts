import { http, HttpResponse } from 'msw';
import { 
  mockWork, 
  mockAuthor, 
  mockSource, 
  mockInstitution, 
  mockWorksResponse, 
  mockAuthorsResponse,
  mockContinent,
  mockRegion,
  mockContinentsResponse,
  mockRegionsResponse,
  mockAboutnessResponse
} from './data';

const API_BASE = 'https://api.openalex.org';

export const handlers = [
  // Works endpoints
  http.get(`${API_BASE}/works`, () => {
    return HttpResponse.json(mockWorksResponse);
  }),

  http.get(`${API_BASE}/works/:id`, ({ params }) => {
    const { id } = params;
    
    // Return 404 for nonexistent works (only specific nonexistent test)
    if (String(id) === 'nonexistent') {
      return HttpResponse.json(
        {
          error: 'NOT FOUND',
          message: 'The requested work was not found',
        },
        { status: 404 }
      );
    }
    
    // Return success for all valid-looking work IDs
    return HttpResponse.json({ ...mockWork, id: `https://openalex.org/${id}` });
  }),

  http.get(`${API_BASE}/works/random`, () => {
    return HttpResponse.json(mockWork);
  }),

  // Authors endpoints
  http.get(`${API_BASE}/authors`, () => {
    return HttpResponse.json(mockAuthorsResponse);
  }),

  http.get(`${API_BASE}/authors/:id`, ({ params }) => {
    const { id } = params;
    
    // Handle test IDs specifically - return mock author for test IDs
    if (String(id) === 'A123' || String(id) === 'A456') {
      return HttpResponse.json({ ...mockAuthor, id: `https://openalex.org/${id}` });
    }
    
    return HttpResponse.json({ ...mockAuthor, id: `https://openalex.org/${id}` });
  }),

  // Sources endpoints
  http.get(`${API_BASE}/sources`, () => {
    return HttpResponse.json({
      meta: {
        count: 1,
        db_response_time_ms: 23,
        page: 1,
        per_page: 25,
      },
      results: [mockSource],
    });
  }),

  http.get(`${API_BASE}/sources/:id`, () => {
    return HttpResponse.json(mockSource);
  }),

  // Institutions endpoints
  http.get(`${API_BASE}/institutions`, () => {
    return HttpResponse.json({
      meta: {
        count: 1,
        db_response_time_ms: 15,
        page: 1,
        per_page: 25,
      },
      results: [mockInstitution],
    });
  }),

  http.get(`${API_BASE}/institutions/:id`, () => {
    return HttpResponse.json(mockInstitution);
  }),

  // Publishers endpoints
  http.get(`${API_BASE}/publishers`, () => {
    return HttpResponse.json({
      meta: {
        count: 1,
        db_response_time_ms: 15,
        page: 1,
        per_page: 25,
      },
      results: [{
        id: 'https://openalex.org/P4320311981',
        display_name: 'Test Publisher',
        alternate_titles: [],
        country_codes: ['US'],
        hierarchy_level: 0,
        parent_publisher: null,
        works_count: 1000,
        cited_by_count: 5000,
        is_oa: false,
        is_in_doaj: false,
        updated_date: '2023-01-01',
      }],
    });
  }),

  http.get(`${API_BASE}/publishers/:id`, () => {
    return HttpResponse.json({
      id: 'https://openalex.org/P4320311981',
      display_name: 'Test Publisher',
      alternate_titles: [],
      country_codes: ['US'],
      hierarchy_level: 0,
      parent_publisher: null,
      works_count: 1000,
      cited_by_count: 5000,
      is_oa: false,
      is_in_doaj: false,
      updated_date: '2023-01-01',
    });
  }),

  // Funders endpoints
  http.get(`${API_BASE}/funders`, () => {
    return HttpResponse.json({
      meta: {
        count: 1,
        db_response_time_ms: 15,
        page: 1,
        per_page: 25,
      },
      results: [{
        id: 'https://openalex.org/F4320332183',
        display_name: 'National Science Foundation',
        alternate_titles: ['NSF'],
        country_code: 'US',
        description: 'US government agency',
        homepage_url: 'https://www.nsf.gov',
        image_url: null,
        image_thumbnail_url: null,
        grants_count: 50000,
        works_count: 100000,
        cited_by_count: 500000,
        updated_date: '2023-01-01',
      }],
    });
  }),

  http.get(`${API_BASE}/funders/:id`, () => {
    return HttpResponse.json({
      id: 'https://openalex.org/F4320332183',
      display_name: 'National Science Foundation',
      alternate_titles: ['NSF'],
      country_code: 'US',
      description: 'US government agency',
      homepage_url: 'https://www.nsf.gov',
      image_url: null,
      image_thumbnail_url: null,
      grants_count: 50000,
      works_count: 100000,
      cited_by_count: 500000,
      updated_date: '2023-01-01',
    });
  }),

  // Topics endpoints
  http.get(`${API_BASE}/topics`, () => {
    return HttpResponse.json({
      meta: {
        count: 1,
        db_response_time_ms: 15,
        page: 1,
        per_page: 25,
      },
      results: [{
        id: 'https://openalex.org/T10555',
        display_name: 'Computer Science',
        description: 'Research in computer science',
        keywords: ['computer science', 'algorithms'],
        works_count: 50000,
        cited_by_count: 200000,
        updated_date: '2023-01-01',
        subfield: {
          id: 'https://openalex.org/subfield/1701',
          display_name: 'Computer Science Applications',
        },
        field: {
          id: 'https://openalex.org/field/17',
          display_name: 'Computer Science',
        },
        domain: {
          id: 'https://openalex.org/domain/3',
          display_name: 'Physical Sciences',
        },
      }],
    });
  }),

  http.get(`${API_BASE}/topics/:id`, () => {
    return HttpResponse.json({
      id: 'https://openalex.org/T10555',
      display_name: 'Computer Science',
      description: 'Research in computer science',
      keywords: ['computer science', 'algorithms'],
      works_count: 50000,
      cited_by_count: 200000,
      updated_date: '2023-01-01',
      subfield: {
        id: 'https://openalex.org/subfield/1701',
        display_name: 'Computer Science Applications',
      },
      field: {
        id: 'https://openalex.org/field/17',
        display_name: 'Computer Science',
      },
      domain: {
        id: 'https://openalex.org/domain/3',
        display_name: 'Physical Sciences',
      },
    });
  }),

  // Continents endpoints
  http.get(`${API_BASE}/continents`, () => {
    return HttpResponse.json(mockContinentsResponse);
  }),

  http.get(`${API_BASE}/continents/:id`, ({ params }) => {
    const { id } = params;
    // Handle cases where id might already contain the continents prefix
    const continentId = String(id).includes('/') ? String(id).split('/').pop() : String(id);
    
    // Return 404 for nonexistent continents
    if (continentId === 'nonexistent-continent') {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'The requested continent was not found',
        },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({ ...mockContinent, id: `https://openalex.org/continents/${continentId}` });
  }),

  http.get(`${API_BASE}/continents/random`, () => {
    return HttpResponse.json(mockContinent);
  }),

  // Regions endpoints
  http.get(`${API_BASE}/regions`, () => {
    return HttpResponse.json(mockRegionsResponse);
  }),

  http.get(`${API_BASE}/regions/:id`, ({ params }) => {
    const { id } = params;
    // Handle cases where id might already contain the regions prefix
    const regionId = String(id).includes('/') ? String(id).split('/').pop() : String(id);
    
    // Return 404 for nonexistent regions
    if (regionId === 'nonexistent-region') {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'The requested region was not found',
        },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({ ...mockRegion, id: `https://openalex.org/regions/${regionId}` });
  }),

  http.get(`${API_BASE}/regions/random`, () => {
    return HttpResponse.json(mockRegion);
  }),

  // Aboutness endpoint
  http.post(`${API_BASE}/text`, async ({ request }) => {
    const body = await request.json();
    const text = (body as { text?: string })?.text;
    
    // Validate that text is provided and not undefined
    if (!body || typeof text !== 'string' || text === undefined) {
      return HttpResponse.json(
        {
          error: 'Bad Request',
          message: 'Text parameter is required',
        },
        { status: 400 }
      );
    }
    
    // Return concepts and topics based on input text
    if (text && text.toLowerCase().includes('machine learning')) {
      return HttpResponse.json(mockAboutnessResponse);
    }
    
    // Default response for other text
    return HttpResponse.json({
      concepts: [
        {
          score: 0.8,
          concept: {
            id: 'https://openalex.org/C41008148',
            wikidata: 'https://www.wikidata.org/wiki/Q11862829',
            display_name: 'Computer science',
            level: 0,
            score: 0.8,
          },
        },
      ],
      topics: [
        {
          id: 'https://openalex.org/T10555',
          display_name: 'General Computer Science',
          score: 0.75,
          subfield: {
            id: 'https://openalex.org/subfield/1701',
            display_name: 'Computer Science Applications',
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
    });
  }),

  // Autocomplete endpoints
  http.get(`${API_BASE}/autocomplete/works`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    return HttpResponse.json({
      meta: {
        count: 1,
        db_response_time_ms: 10,
      },
      results: [
        {
          id: 'https://openalex.org/W2741809807',
          display_name: query || 'Test Work',
          hint: 'Journal Article',
          cited_by_count: 100,
          works_count: null,
          entity_type: 'work',
        },
      ],
    });
  }),

  http.get(`${API_BASE}/autocomplete/authors`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    return HttpResponse.json({
      meta: {
        count: 1,
        db_response_time_ms: 10,
      },
      results: [
        {
          id: 'https://openalex.org/A5000000001',
          display_name: query ? `${query} Doe` : 'John Doe',
          hint: 'Harvard University',
          cited_by_count: 500,
          works_count: 50,
          entity_type: 'author',
        },
      ],
    });
  }),

  // Error scenarios
  http.get(`${API_BASE}/error/404`, () => {
    return HttpResponse.json(
      {
        error: 'Not Found',
        message: 'The requested resource was not found',
      },
      { status: 404 }
    );
  }),

  http.get(`${API_BASE}/error/429`, () => {
    return HttpResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
      },
      { 
        status: 429,
        headers: {
          'Retry-After': '1',
        },
      }
    );
  }),

  http.get(`${API_BASE}/error/500`, () => {
    return HttpResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Something went wrong',
      },
      { status: 500 }
    );
  }),
];

// Handler overrides for specific test scenarios
export const errorHandlers = {
  networkError: [
    // Network error responses for specific endpoints - return 500 status instead of HttpResponse.error()
    http.get(`${API_BASE}/continents`, () => {
      return new HttpResponse(null, { 
        status: 500, 
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'application/json' }
      });
    }),
    http.get(`${API_BASE}/continents/:id`, () => {
      return new HttpResponse(null, { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
    }),
    http.get(`${API_BASE}/continents/random`, () => {
      return new HttpResponse(null, { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
    }),
    http.get(`${API_BASE}/regions`, () => {
      return new HttpResponse(null, { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
    }),
    http.get(`${API_BASE}/regions/:id`, () => {
      return new HttpResponse(null, { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
    }),
    http.get(`${API_BASE}/regions/random`, () => {
      return new HttpResponse(null, { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
    }),
    http.post(`${API_BASE}/text`, () => {
      return new HttpResponse(null, { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
    }),
    // Fallback for all other endpoints
    http.get(`${API_BASE}/*`, () => {
      return new HttpResponse(null, { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
    }),
    http.post(`${API_BASE}/*`, () => {
      return new HttpResponse(null, { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
    }),
  ],

  timeout: [
    // Specific timeout handlers
    http.post(`${API_BASE}/text`, async () => {
      // Simulate a timeout by returning an error after a minimal delay
      await new Promise(resolve => setTimeout(resolve, 10));
      return new HttpResponse(null, { status: 408, statusText: 'Request Timeout' });
    }),
    http.get(`${API_BASE}/continents`, async () => {
      // Simulate a timeout by returning an error after a minimal delay
      await new Promise(resolve => setTimeout(resolve, 10));
      return new HttpResponse(null, { status: 408, statusText: 'Request Timeout' });
    }),
    // Wildcard handlers for everything else
    http.get(`${API_BASE}/*`, async () => {
      // Simulate a timeout by returning an error after a minimal delay
      await new Promise(resolve => setTimeout(resolve, 10));
      return new HttpResponse(null, { status: 408, statusText: 'Request Timeout' });
    }),
    http.post(`${API_BASE}/*`, async () => {
      // Simulate a timeout by returning an error after a minimal delay
      await new Promise(resolve => setTimeout(resolve, 10));
      return new HttpResponse(null, { status: 408, statusText: 'Request Timeout' });
    }),
  ],

  emptyResponse: http.get(`${API_BASE}/works`, () => {
    return HttpResponse.json({
      meta: {
        count: 0,
        db_response_time_ms: 10,
        page: 1,
        per_page: 25,
      },
      results: [],
    });
  }),
};