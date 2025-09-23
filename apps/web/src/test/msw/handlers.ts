/**
 * MSW (Mock Service Worker) handlers for OpenAlex API endpoints
 * Used to mock API responses in tests and prevent unhandled network requests
 */

import { http, HttpResponse } from "msw";
import type { Work, Author, Institution } from "@academic-explorer/openalex-client";

const API_BASE = "https://api.openalex.org";

/**
 * Mock data factories for OpenAlex entities
 */
const createMockWork = (id: string): Work => ({
  id: `https://openalex.org/${id}`,
  doi: `https://doi.org/10.1000/${id.toLowerCase()}`,
  title: `Mock Work ${id}`,
  display_name: `Mock Work ${id}`,
  publication_year: 2023,
  publication_date: "2023-01-01",
  ids: {
    openalex: `https://openalex.org/${id}`,
    doi: `https://doi.org/10.1000/${id.toLowerCase()}`,
    mag: null,
    pmid: null,
    pmcid: null
  },
  language: "en",
  primary_location: null,
  type: "article",
  type_crossref: "journal-article",
  indexed_in: [],
  open_access: {
    is_oa: true,
    oa_url: null,
    any_repository_has_fulltext: false
  },
  authorships: [],
  institution_assertions: [],
  countries_distinct_count: 1,
  institutions_distinct_count: 1,
  corresponding_author_ids: [],
  corresponding_institution_ids: [],
  apc_list: null,
  apc_paid: null,
  fwci: 1.0,
  has_fulltext: false,
  fulltext_origin: null,
  cited_by_count: 10,
  cited_by_percentile_year: {
    min: 75,
    max: 85
  },
  biblio: {
    volume: "1",
    issue: "1",
    first_page: "1",
    last_page: "10"
  },
  is_retracted: false,
  is_paratext: false,
  primary_topic: null,
  topics: [],
  keywords: [],
  concepts: [],
  mesh: [],
  locations_count: 1,
  locations: [],
  best_oa_location: null,
  sustainable_development_goals: [],
  grants: [],
  datasets: [],
  versions: [],
  referenced_works_count: 0,
  referenced_works: [],
  related_works: [],
  abstract_inverted_index: null,
  cited_by_api_url: `https://api.openalex.org/works?filter=cites:${id}`,
  counts_by_year: [],
  updated_date: "2023-01-01",
  created_date: "2023-01-01"
});

const createMockAuthor = (id: string): Author => ({
  id: `https://openalex.org/${id}`,
  orcid: null,
  display_name: `Mock Author ${id}`,
  display_name_alternatives: [],
  works_count: 50,
  cited_by_count: 500,
  ids: {
    openalex: `https://openalex.org/${id}`,
    orcid: null,
    scopus: null,
    twitter: null,
    wikipedia: null,
    mag: null
  },
  last_known_institutions: [],
  last_known_institution: null,
  affiliations: [],
  topics: [],
  topic: null,
  x_concepts: [],
  works_api_url: `https://api.openalex.org/works?filter=author.id:${id}`,
  updated_date: "2023-01-01",
  created_date: "2023-01-01",
  summary_stats: {
    "2yr_mean_citedness": 5.0,
    h_index: 10,
    i10_index: 5
  },
  counts_by_year: []
});

const createMockInstitution = (id: string): Institution => ({
  id: `https://openalex.org/${id}`,
  ror: null,
  display_name: `Mock Institution ${id}`,
  country_code: "US",
  type: "education",
  homepage_url: null,
  image_url: null,
  image_thumbnail_url: null,
  display_name_acronyms: [],
  display_name_alternatives: [],
  works_count: 1000,
  cited_by_count: 10000,
  ids: {
    openalex: `https://openalex.org/${id}`,
    ror: null,
    grid: null,
    wikipedia: null,
    wikidata: null,
    mag: null
  },
  geo: {
    city: "Mock City",
    geonames_city_id: null,
    region: null,
    country_code: "US",
    country: "United States",
    latitude: 40.0,
    longitude: -74.0
  },
  international: {
    display_name: {}
  },
  associated_institutions: [],
  repositories: [],
  roles: [],
  topics: [],
  topic: null,
  x_concepts: [],
  works_api_url: `https://api.openalex.org/works?filter=institutions.id:${id}`,
  updated_date: "2023-01-01",
  created_date: "2023-01-01",
  summary_stats: {
    "2yr_mean_citedness": 3.0,
    h_index: 50,
    i10_index: 100
  },
  counts_by_year: []
});

/**
 * MSW handlers for OpenAlex API endpoints
 */
export const openalexHandlers = [
  // Get single work by ID
  http.get(`${API_BASE}/works/:id`, ({ params }) => {
    const { id } = params;

    if (typeof id !== "string") {
      return HttpResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Handle rate limit simulation
    if (id === "W2799442855") {
      return HttpResponse.json(
        { error: "API rate limit exceeded" },
        {
          status: 429,
          headers: {
            "Retry-After": "60"
          }
        }
      );
    }

    const work = createMockWork(id);
    return HttpResponse.json(work);
  }),

  // Get single author by ID
  http.get(`${API_BASE}/authors/:id`, ({ params }) => {
    const { id } = params;

    if (typeof id !== "string") {
      return HttpResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const author = createMockAuthor(id);
    return HttpResponse.json(author);
  }),

  // Get single institution by ID
  http.get(`${API_BASE}/institutions/:id`, ({ params }) => {
    const { id } = params;

    if (typeof id !== "string") {
      return HttpResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const institution = createMockInstitution(id);
    return HttpResponse.json(institution);
  }),

  // List works endpoint
  http.get(`${API_BASE}/works`, ({ request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get("per_page")) || 25;

    const works = Array.from({ length: Math.min(perPage, 10) }, (_, i) =>
      createMockWork(`W${(1000000000 + i).toString()}`)
    );

    return HttpResponse.json({
      results: works,
      meta: {
        count: works.length,
        db_response_time_ms: 10,
        page: 1,
        per_page: perPage,
        groups_count: null
      }
    });
  }),

  // List authors endpoint
  http.get(`${API_BASE}/authors`, ({ request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get("per_page")) || 25;

    const authors = Array.from({ length: Math.min(perPage, 10) }, (_, i) =>
      createMockAuthor(`A${(1000000000 + i).toString()}`)
    );

    return HttpResponse.json({
      results: authors,
      meta: {
        count: authors.length,
        db_response_time_ms: 10,
        page: 1,
        per_page: perPage,
        groups_count: null
      }
    });
  }),

  // List institutions endpoint
  http.get(`${API_BASE}/institutions`, ({ request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get("per_page")) || 25;

    const institutions = Array.from({ length: Math.min(perPage, 10) }, (_, i) =>
      createMockInstitution(`I${(1000000000 + i).toString()}`)
    );

    return HttpResponse.json({
      results: institutions,
      meta: {
        count: institutions.length,
        db_response_time_ms: 10,
        page: 1,
        per_page: perPage,
        groups_count: null
      }
    });
  }),

  // Catch-all for unhandled OpenAlex API routes
  http.get(`${API_BASE}/*`, () => {
    return HttpResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  })
];