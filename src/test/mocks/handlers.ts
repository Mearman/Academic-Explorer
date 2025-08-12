import { http, HttpResponse } from 'msw';
import { mockWork, mockAuthor, mockSource, mockInstitution, mockWorksResponse, mockAuthorsResponse } from './data';

const API_BASE = 'https://api.openalex.org';

export const handlers = [
  // Works endpoints
  http.get(`${API_BASE}/works`, () => {
    return HttpResponse.json(mockWorksResponse);
  }),

  http.get(`${API_BASE}/works/:id`, ({ params }) => {
    const { id } = params;
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
  networkError: http.get(`${API_BASE}/*`, () => {
    return HttpResponse.error();
  }),

  timeout: http.get(`${API_BASE}/*`, async () => {
    await new Promise(resolve => setTimeout(resolve, 100000));
    return HttpResponse.json({});
  }),

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