/**
 * MSW handlers for autocomplete API tests
 */
import { http, HttpResponse } from "msw";

const OPENALEX_BASE_URL = "https://api.openalex.org";

// Sample autocomplete responses
const mockAutocompleteResponse = (entityType: string, query: string) => {
  const results = [];

  // Generate 5 mock results
  for (let i = 0; i < 5; i++) {
    results.push({
      id: `https://openalex.org/${entityType[0].toUpperCase()}${1000 + i}`,
      display_name: `${query} Result ${i + 1}`,
      entity_type: entityType,
      cited_by_count: 1000 - i * 100,
      works_count: 500 - i * 50,
      hint: `Sample ${entityType} for ${query}`,
    });
  }

  return results;
};

export const autocompleteHandlers = [
  // General autocomplete endpoint
  http.get(`${OPENALEX_BASE_URL}/autocomplete`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("work", query) });
  }),

  // Entity-specific autocomplete endpoints
  http.get(`${OPENALEX_BASE_URL}/autocomplete/authors`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("author", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/works`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("work", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/sources`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("source", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/institutions`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("institution", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/topics`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("topic", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/publishers`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("publisher", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/funders`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("funder", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/concepts`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("concept", query) });
  }),
];
