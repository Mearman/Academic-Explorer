# OpenAlex API Documentation

**Category:** Comprehensive Scholar Database
**Data Type:** Works, Authors, Venues, Institutions, Concepts, Publishers, Funders
**API Type:** REST API
**Authentication:** None required
**Rate Limits:** Generous limits for academic use

## Overview

OpenAlex is a completely free and open scholarly catalog that provides comprehensive data about research entities. It's designed as an open alternative to commercial databases like Scopus and Web of Science, and serves as the replacement for the discontinued Microsoft Academic Graph.

## Key Features

- **Complete scholarly catalog** with 200M+ works
- **Citation networks** and relationships
- **Author profiles** and institutional affiliations
- **Concept/topic analysis** with hierarchical concepts
- **Venue information** (journals, conferences)
- **Publisher and funder data**
- **Alternative to Microsoft Academic Graph**

## Documentation

- **Main API:** https://docs.openalex.org/
- **API Reference:** https://docs.openalex.org/api
- **Quick Start:** https://docs.openalex.org/how-to-use-the-api/rate-limits-and-authentication
- **GraphQL Playground:** https://openalex.io/

## Rate Limits

OpenAlex provides generous rate limits for academic use:
- No hard limits published
- Respectful crawling encouraged
- Automated requests should include appropriate delays
- Commercial use may have different considerations

## API Endpoints

### Works
```bash
# Search works
https://api.openalex.org/works?search=machine%20learning

# Filter by publication year
https://api.openalex.org/works?filter=publication_year:2023

# Get specific work by ID
https://api.openalex.org/works/W123456789
```

### Authors
```bash
# Search authors
https://api.openalex.org/authors?search=john%20smith

# Get author by ID
https://api.openalex.org/authors/A5017898742

# Get author's works
https://api.openalex.org/authors/A5017898742/works
```

### Venues (Journals/Conferences)
```bash
# Search venues
https://api.openalex.org/venues?search=nature

# Get venue by ID
https://api.openalex.org/venues/V123456789
```

### Institutions
```bash
# Search institutions
https://api.openalex.org/institutions?search=stanford

# Get institution by ID
https://api.openalex.org/institutions/I123456789
```

## Implementation Examples

### Basic Search (JavaScript)
```javascript
async function searchOpenAlex(query, entity = 'works') {
  const response = await fetch(
    `https://api.openalex.org/${entity}?search=${encodeURIComponent(query)}&per-page=10`
  );
  const data = await response.json();
  return data.results;
}

// Search for works
searchOpenAlex('machine learning', 'works').then(works => {
  console.log('Found works:', works.length);
});

// Search for authors
searchOpenAlex('john smith', 'authors').then(authors => {
  console.log('Found authors:', authors.length);
});
```

### Advanced Filtering (Python)
```python
import requests

def search_openalex(filters, entity='works'):
    base_url = f"https://api.openalex.org/{entity}"
    params = {'filter': filters}

    response = requests.get(base_url, params=params)
    return response.json()

# Search machine learning papers from 2023
results = search_openalex('publication_year:2023,concepts:C154945302')
print(f"Found {len(results['results'])} works")
```

### Pagination Handling
```javascript
async function getAllOpenAlexResults(query, maxPages = 10) {
  let allResults = [];
  let page = 1;

  while (page <= maxPages) {
    const response = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=200&page=${page}`
    );
    const data = await response.json();

    allResults = allResults.concat(data.results);

    if (data.results.length < 200) break;
    page++;
  }

  return allResults;
}
```

## Data Models

### Work Object
```json
{
  "id": "https://openalex.org/W123456789",
  "title": "Example Paper Title",
  "publication_year": 2023,
  "primary_location": {
    "source": {
      "display_name": "Nature Machine Intelligence"
    }
  },
  "authorships": [
    {
      "author": {
        "display_name": "John Smith",
        "id": "https://openalex.org/A5017898742"
      }
    }
  ],
  "concepts": [
    {
      "display_name": "Machine Learning",
      "score": 0.95
    }
  ],
  "cited_by_count": 42,
  "open_access": {
    "is_oa": true,
    "oa_url": "https://arxiv.org/abs/2301.00000"
  }
}
```

### Author Object
```json
{
  "id": "https://openalex.org/A5017898742",
  "display_name": "John Smith",
  "orcid": "https://orcid.org/0000-0002-1234-5678",
  "works_count": 25,
  "cited_by_count": 500,
  "last_known_institution": {
    "display_name": "Stanford University",
    "country_code": "US",
    "id": "https://openalex.org/I4210124497"
  },
  "topics": [
    {
      "display_name": "Machine Learning",
      "score": 0.85
    }
  ]
}
```

## Common Use Cases

### Citation Network Analysis
```javascript
async function getCitationNetwork(workId) {
  const work = await fetch(`https://api.openalex.org/works/${workId}`).then(r => r.json());

  // Get works that cite this paper
  const citingWorks = await fetch(`https://api.openalex.org/works?filter=cites:${workId}&per-page=10`).then(r => r.json());

  // Get works that this paper cites
  const referencedWorks = work.referenced_works || [];

  return {
    work,
    citingWorks: citingWorks.results,
    referencedWorks: referencedWorks.slice(0, 10) // Limit to first 10
  };
}
```

### Institution Collaboration Network
```javascript
async function getInstitutionCollaborations(institutionId) {
  const institution = await fetch(`https://api.openalex.org/institutions/${institutionId}`).then(r => r.json());

  // Get works from this institution
  const works = await fetch(`https://api.openalex.org/works?filter=institutions.id:${institutionId}&per-page=100`).then(r => r.json());

  // Extract co-author institutions
  const collaboratorCounts = {};
  works.results.forEach(work => {
    work.authorships.forEach(authorship => {
      if (authorship.institutions) {
        authorship.institutions.forEach(inst => {
          if (inst.id !== institutionId) {
            collaboratorCounts[inst.display_name] = (collaboratorCounts[inst.display_name] || 0) + 1;
          }
        });
      }
    });
  });

  return {
    institution,
    collaboratorCounts,
    totalWorks: works.meta.count
  };
}
```

## Best Practices

1. **Use pagination** for large result sets
2. **Implement caching** to reduce server load
3. **Add delays** between consecutive requests
4. **Use specific filters** to reduce response sizes
5. **Handle errors gracefully** with proper HTTP status code checking
6. **Monitor rate limits** and respect service announcements

## Alternatives

- **Crossref API** - For DOI metadata and citation linking
- **Semantic Scholar API** - For citation analysis and recommendations
- **DataCite GraphQL** - For DOI research metadata
- **Web of Science API** - Commercial alternative (requires subscription)

## Support

- **Documentation:** https://docs.openalex.org/
- **GitHub:** https://github.com/ourresearch/openalex
- **Contact:** Available through OpenAlex website

---

*Last updated: 2025-10-27*