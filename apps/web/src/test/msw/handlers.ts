/**
 * MSW (Mock Service Worker) handlers for OpenAlex API endpoints
 * Used to mock API responses in tests and prevent unhandled network requests
 */

import { http, HttpResponse } from "msw";
import type { Work, Author, Institution, Authorship } from "@academic-explorer/types";

const API_BASE = "https://api.openalex.org";

/**
 * Mock data factories for OpenAlex entities
 */
const createMockWork = (id: string): Work => {
  const mockWork: Work = {
  id: `https://openalex.org/${id}`,
  doi: `https://doi.org/10.1000/${id.toLowerCase()}`,
  title: `Mock Work ${id}`,
  display_name: `Mock Work ${id}`,
  publication_year: 2023,
  publication_date: "2023-01-01",
  type: "article",
  ids: {
    openalex: `https://openalex.org/${id}`,
    doi: `https://doi.org/10.1000/${id.toLowerCase()}`,
    pmid: undefined,
    pmcid: undefined,
  },
  language: "en",
  primary_location: undefined,
  type_crossref: "journal-article",
  indexed_in: [],
  open_access: {
    is_oa: true,
    oa_url: undefined,
    any_repository_has_fulltext: false,
  },
  authorships: [
    {
      author_position: "first",
      author: {
        id: `https://openalex.org/A${id.slice(1)}`,
        display_name: `Mock Author for ${id}`,
        orcid: undefined,
      },
      institutions: [
        {
          id: `https://openalex.org/I${id.slice(1)}`,
          display_name: `Mock Institution for ${id}`,
          ror: undefined,
          country_code: "US",
          type: "education",
        },
      ],
      countries: ["US"],
      is_corresponding: true,
      raw_author_name: `Mock Author for ${id}`,
      raw_affiliation_strings: [`Mock Institution for ${id}`],
    } as Authorship,
  ],
  countries_distinct_count: 1,
  institutions_distinct_count: 1,
  corresponding_author_ids: [`https://openalex.org/A${id.slice(1)}`],
  corresponding_institution_ids: [`https://openalex.org/I${id.slice(1)}`],
  apc_list: undefined,
  apc_paid: undefined,
  fwci: 1.0,
  has_fulltext: false,
  fulltext_origin: undefined,
  cited_by_count: 10,
  cited_by_percentile_year: {
    min: 75,
    max: 85,
  },
  biblio: {
    volume: "1",
    issue: "1",
    first_page: "1",
    last_page: "10",
  },
  is_retracted: false,
  is_paratext: false,
  topics: [],
  keywords: [],
  concepts: [],
  mesh: [],
  locations_count: 1,
  locations: [
    {
      source: {
        id: `https://openalex.org/S${id.slice(1)}`,
        display_name: `Mock Source for ${id}`,
        issn_l: "1234-5678",
        issn: ["1234-5678", "5678-1234"],
        is_oa: true,
        is_in_doaj: false,
        host_organization: undefined,
        host_organization_name: undefined,
        host_organization_lineage: [],
        type: "journal",
      },
      landing_page_url: `https://example.com/${id}`,
      pdf_url: undefined,
      is_oa: true,
      version: "publishedVersion",
      license: "cc-by",
    },
  ],
  best_oa_location: {
    source: {
      id: `https://openalex.org/S${id.slice(1)}`,
      display_name: `Mock Source for ${id}`,
      issn_l: "1234-5678",
      issn: ["1234-5678", "5678-1234"],
      is_oa: true,
      is_in_doaj: false,
      host_organization: undefined,
      host_organization_name: undefined,
      host_organization_lineage: [],
      type: "journal",
    },
    landing_page_url: `https://example.com/${id}`,
    pdf_url: undefined,
    is_oa: true,
    version: "publishedVersion",
    license: "cc-by",
  },
  sustainable_development_goals: [],
  grants: [],
  datasets: [],
  versions: [],
  referenced_works_count: 2,
  referenced_works: [
    `https://openalex.org/W${(parseInt(id.slice(1)) + 1000).toString()}`,
    `https://openalex.org/W${(parseInt(id.slice(1)) + 2000).toString()}`,
  ],
  related_works: [
    `https://openalex.org/W${(parseInt(id.slice(1)) + 3000).toString()}`,
    `https://openalex.org/W${(parseInt(id.slice(1)) + 4000).toString()}`,
  ],
  abstract_inverted_index: {
    This: [0],
    is: [1],
    a: [2],
    mock: [3],
    abstract: [4],
    for: [5],
    testing: [6],
  },
  cited_by_api_url: `https://api.openalex.org/works?filter=cites:${id}`,
  counts_by_year: [
    {
      year: 2023,
      cited_by_count: 5,
      works_count: 2,
    },
    {
      year: 2022,
      cited_by_count: 3,
      works_count: 1,
    },
    {
      year: 2021,
      cited_by_count: 2,
      works_count: 1,
    },
  ],
  updated_date: "2023-01-01",
  created_date: "2023-01-01",
  };
  return mockWork;
};

const createMockAuthor = (id: string): Author => ({
  id: `https://openalex.org/${id}`,
  orcid: undefined,
  display_name: `Mock Author ${id}`,
  display_name_alternatives: [],
  works_count: 50,
  cited_by_count: 500,
  ids: {
    openalex: `https://openalex.org/${id}`,
    orcid: undefined,
  },
  last_known_institutions: [],
  affiliations: [],
  x_concepts: [],
  updated_date: "2023-01-01",
  created_date: "2023-01-01",
  summary_stats: {
    "2yr_mean_citedness": 5.0,
    h_index: 10,
    i10_index: 5,
  },
  counts_by_year: [],
});

const createMockInstitution = (id: string): Institution => ({
  id: `https://openalex.org/${id}`,
  ror: undefined,
  display_name: `Mock Institution ${id}`,
  country_code: "US",
  type: "education",
  lineage: [],
});

/**
 * MSW handlers for OpenAlex API endpoints
 */
export const openalexHandlers = [
  // Get single work by ID
  http.get(`${API_BASE}/works/:id`, ({ params }) => {
    const { id } = params;

    if (typeof id !== "string") {
      return HttpResponse.json(
        { error: "Invalid ID" },
        {
          status: 400,
          headers: {
            "x-powered-by": "msw",
            "x-msw-request-id": "mock-invalid-id",
          },
        },
      );
    }

    // Handle rate limit simulation
    if (id === "W2799442855") {
      return HttpResponse.json(
        { error: "API rate limit exceeded" },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "x-powered-by": "msw",
            "x-msw-request-id": `mock-rate-limit-${id}`,
          },
        },
      );
    }

    const work = createMockWork(id);
    return HttpResponse.json(work, {
      headers: {
        "x-powered-by": "msw",
        "x-msw-request-id": `mock-${id}`,
      },
    });
  }),

  // Get single author by ID
  http.get(`${API_BASE}/authors/:id`, ({ params }) => {
    const { id } = params;

    if (typeof id !== "string") {
      return HttpResponse.json(
        { error: "Invalid ID" },
        {
          status: 400,
          headers: {
            "x-powered-by": "msw",
            "x-msw-request-id": "mock-invalid-id",
          },
        },
      );
    }

    const author = createMockAuthor(id);
    return HttpResponse.json(author, {
      headers: {
        "x-powered-by": "msw",
        "x-msw-request-id": `mock-${id}`,
      },
    });
  }),

  // Get single institution by ID
  http.get(`${API_BASE}/institutions/:id`, ({ params }) => {
    const { id } = params;

    if (typeof id !== "string") {
      return HttpResponse.json(
        { error: "Invalid ID" },
        {
          status: 400,
          headers: {
            "x-powered-by": "msw",
            "x-msw-request-id": "mock-invalid-id",
          },
        },
      );
    }

    const institution = createMockInstitution(id);
    return HttpResponse.json(institution, {
      headers: {
        "x-powered-by": "msw",
        "x-msw-request-id": `mock-${id}`,
      },
    });
  }),

  // List works endpoint
  http.get(`${API_BASE}/works`, ({ request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get("per_page")) || 25;

    const works = Array.from({ length: Math.min(perPage, 10) }, (_, i) =>
      createMockWork(`W${(1000000000 + i).toString()}`),
    );

    return HttpResponse.json(
      {
        results: works,
        meta: {
          count: works.length,
          db_response_time_ms: 10,
          page: 1,
          per_page: perPage,
          groups_count: undefined,
        },
      },
      {
        headers: {
          "x-powered-by": "msw",
          "x-msw-request-id": `mock-works-list-${perPage}`,
        },
      },
    );
  }),

  // List authors endpoint
  http.get(`${API_BASE}/authors`, ({ request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get("per_page")) || 25;

    const authors = Array.from({ length: Math.min(perPage, 10) }, (_, i) =>
      createMockAuthor(`A${(1000000000 + i).toString()}`),
    );

    return HttpResponse.json(
      {
        results: authors,
        meta: {
          count: authors.length,
          db_response_time_ms: 10,
          page: 1,
          per_page: perPage,
          groups_count: undefined,
        },
      },
      {
        headers: {
          "x-powered-by": "msw",
          "x-msw-request-id": `mock-authors-list-${perPage}`,
        },
      },
    );
  }),

  // List institutions endpoint
  http.get(`${API_BASE}/institutions`, ({ request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get("per_page")) || 25;

    const institutions = Array.from({ length: Math.min(perPage, 10) }, (_, i) =>
      createMockInstitution(`I${(1000000000 + i).toString()}`),
    );

    return HttpResponse.json(
      {
        results: institutions,
        meta: {
          count: institutions.length,
          db_response_time_ms: 10,
          page: 1,
          per_page: perPage,
          groups_count: undefined,
        },
      },
      {
        headers: {
          "x-powered-by": "msw",
          "x-msw-request-id": `mock-institutions-list-${perPage}`,
        },
      },
    );
  }),

  // Catch-all for unhandled OpenAlex API routes
  http.get(`${API_BASE}/*`, () => {
    return HttpResponse.json(
      { error: "Not found" },
      {
        status: 404,
        headers: {
          "x-powered-by": "msw",
          "x-msw-request-id": "mock-catch-all",
        },
      },
    );
  }),
];
