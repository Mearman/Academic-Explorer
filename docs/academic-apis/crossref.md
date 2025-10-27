# Crossref API Documentation

**Category:** DOI Metadata and Citations
**Data Type:** Bibliographic metadata, DOI resolution
**API Type:** REST API
**Authentication:** Optional (enhanced limits with key)
**Rate Limits:** 50 requests/second without key, higher with key

## Overview

Crossref provides a free REST API for accessing scholarly metadata from millions of research outputs. It's the essential service for DOI registration, resolution, and citation linking across academic literature.

## Key Features

- **DOI registration and resolution**
- **Citation linking and metadata**
- **Fundref and license information**
- **Event data (citations, mentions)**
- **Author and affiliation information**
- **Journal and book metadata**

## Documentation

- **API Home:** https://www.crossref.org/services/metadata-delivery/rest-api/
- **API Documentation:** https://api.crossref.org
- **Rate Limits:** https://www.crossref.org/services/metadata-delivery/rest-api/#rate-limits
- **GraphQL API:** https://api.crossref.org/graphql

## Authentication

- **No authentication required** for basic access (50 requests/second)
- **API key** available for higher rate limits (register for free account)
- **Mailto parameter** recommended for contact information

## Rate Limits

- **Without API key:** 50 requests per second
- **With API key:** Higher limits available based on account
- **Rate limit headers** included in responses:
  - `X-Rate-Limit-Limit`: Total requests allowed
  - `X-Rate-Limit-Interval`: Time window in seconds
  - `X-Rate-Limit-Remaining`: Requests remaining

## API Endpoints

### Work Metadata
```bash
# Get work by DOI
https://api.crossref.org/works/10.1038/nature12373

# Search works
https://api.crossref.org/works?query=machine%20learning&rows=10

# Filter by publication year
https://api.crossref.org/works?filter=publication-year:2023&query=artificial%20intelligence
```

### DOI Resolution
```bash
# Resolve DOI to metadata
https://api.crossref.org/works/10.1038/nature12373/transform/application/json
```

### Funders
```bash
# Search works by funder
https://api.crossref.org/funders?query=national%20science%20foundation
```

### Journals
```bash
# Get journal by ISSN
https://api.crossref.org/journals/2049-3630
```

## Implementation Examples

### Basic DOI Lookup (JavaScript)
```javascript
async function getCrossrefMetadata(doi) {
  const response = await fetch(`https://api.crossref.org/works/${doi}`);
  const data = await response.json();
  return data.message;
}

getCrossrefMetadata("10.1038/nature12373").then(metadata => {
  console.log('Title:', metadata.title[0]);
  console.log('Authors:', metadata.author.map(a => a.given + ' ' + a.family));
  console.log('Published:', metadata.published['date-parts'][0]);
});
```

### Advanced Search (Python)
```python
import requests

def search_crossref(query, filters=None, rows=20):
    base_url = "https://api.crossref.org/works"
    params = {
        'query': query,
        'rows': rows,
        'select': 'title,author,published,DOI,container-title,ISSN'
    }

    if filters:
        params['filter'] = filters

    response = requests.get(base_url, params=params)
    return response.json()

# Search for machine learning papers from 2023
results = search_crossref(
    query="machine learning",
    filters="publication-year:2023,type:journal-article"
)

for item in results['message']['items']:
    print(f"{item['title'][0]} - {item.get('DOI', 'No DOI')}")
```

### Rate Limit Handling
```javascript
class CrossrefAPI {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.lastRequestTime = 0;
    this.minInterval = 1000 / 50; // 50 requests per second
  }

  async makeRequest(url) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();

    const headers = {
      'User-Agent': 'AcademicExplorer/1.0 (mailto:your-email@example.com)'
    };

    if (this.apiKey) {
      headers['Crossref-Plus-API-Token'] = this.apiKey;
    }

    const response = await fetch(url, { headers });

    // Check rate limit headers
    const remaining = response.headers.get('X-Rate-Limit-Remaining');
    const limit = response.headers.get('X-Rate-Limit-Limit');

    if (remaining && parseInt(remaining) < 5) {
      console.log(`Rate limit warning: ${remaining}/${limit} requests remaining`);
    }

    return response.json();
  }

  async searchWorks(query, filters = {}) {
    const params = new URLSearchParams({
      query,
      rows: '20',
      ...filters
    });

    const url = `https://api.crossref.org/works?${params}`;
    const data = await this.makeRequest(url);
    return data.message;
  }
}
```

## Data Models

### Work Object
```json
{
  "DOI": "10.1038/nature12373",
  "title": ["Example Paper Title"],
  "author": [
    {
      "given": "John",
      "family": "Smith",
      "ORCID": "http://orcid.org/0000-0002-1234-5678"
    }
  ],
  "published": {
    "date-parts": [[2023, 1, 15]]
  },
  "container-title": ["Nature Machine Intelligence"],
  "ISSN": ["2049-3630"],
  "member": "https://api.crossref.org/members/301",
  "reference-count": 25,
  "is-referenced-by-count": 42,
  "license": [
    {
      "URL": "http://creativecommons.org/licenses/by/4.0/",
      "start": {
        "date-parts": [[2023, 1, 15]]
      }
    }
  ]
}
```

## Common Use Cases

### Citation Network Building
```javascript
async function buildCitationNetwork(doi, depth = 1) {
  const api = new CrossrefAPI();

  async function getReferences(workDoi) {
    const work = await api.makeRequest(`https://api.crossref.org/works/${workDoi}`);
    return work.reference || [];
  }

  async function getCitations(workDoi) {
    const citations = await api.searchWorks('', {
      'references': workDoi
    });
    return citations.items;
  }

  const network = { nodes: [], edges: [] };
  const visited = new Set();

  async function traverse(currentDoi, currentDepth) {
    if (visited.has(currentDoi) || currentDepth > depth) return;
    visited.add(currentDoi);

    const work = await api.makeRequest(`https://api.crossref.org/works/${currentDoi}`);

    // Add node
    network.nodes.push({
      id: currentDoi,
      title: work.title?.[0] || 'Unknown',
      year: work.published?.['date-parts']?.[0]?.[0]
    });

    // Get references (citations made by this paper)
    const references = await getReferences(currentDoi);
    for (const ref of references.slice(0, 10)) { // Limit for performance
      if (ref.DOI) {
        network.edges.push({
          source: currentDoi,
          target: ref.DOI,
          type: 'references'
        });

        if (!visited.has(ref.DOI)) {
          await traverse(ref.DOI, currentDepth + 1);
        }
      }
    }
  }

  await traverse(doi, 0);
  return network;
}
```

### Author Disambiguation
```javascript
async function findAuthorByName(name, institution = null) {
  const api = new CrossrefAPI();

  // Search for works by author name
  const results = await api.searchWorks(name, {
    'select': 'author,member,published'
  });

  // Group by potential author profiles
  const authorProfiles = {};

  results.items.forEach(work => {
    work.author?.forEach(author => {
      if (author.family?.toLowerCase().includes(name.toLowerCase()) ||
          author.given?.toLowerCase().includes(name.toLowerCase())) {

        const key = `${author.family}_${author.given}_${author.ORCID || 'no-orcid'}`;

        if (!authorProfiles[key]) {
          authorProfiles[key] = {
            name: `${author.given} ${author.family}`,
            orcid: author.ORCID,
            works: [],
            institutions: new Set()
          };
        }

        authorProfiles[key].works.push({
          doi: work.DOI,
          title: work.title?.[0],
          year: work.published?.['date-parts']?.[0]?.[0],
          publisher: work.member
        });

        // Extract institution information if available
        if (institution && work.member) {
          authorProfiles[key].institutions.add(work.member);
        }
      }
    });
  });

  // Sort by number of works (most likely correct profile)
  return Object.values(authorProfiles)
    .sort((a, b) => b.works.length - a.works.length)
    .map(profile => ({
      ...profile,
      institutions: Array.from(profile.institutions)
    }));
}
```

## Best Practices

1. **Include User-Agent** with contact email
2. **Respect rate limits** - implement delays between requests
3. **Use the select parameter** to limit response fields
4. **Cache responses** to reduce server load
5. **Handle HTTP errors** gracefully
6. **Use appropriate filters** to reduce response sizes

## Rate Limit Optimization

```javascript
class OptimizedCrossrefAPI extends CrossrefAPI {
  constructor(apiKey = null) {
    super(apiKey);
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  async cachedRequest(url) {
    const cacheKey = url;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const data = await this.makeRequest(url);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  async batchSearch(dois) {
    const results = [];

    for (const doi of dois) {
      try {
        const result = await this.cachedRequest(`https://api.crossref.org/works/${doi}`);
        results.push({ doi, success: true, data: result.message });
      } catch (error) {
        results.push({ doi, success: false, error: error.message });
      }
    }

    return results;
  }
}
```

## Alternatives

- **OpenAlex API** - For comprehensive scholarly data
- **DataCite GraphQL** - For DOI research metadata
- **Semantic Scholar API** - For citation analysis
- **Unpaywall API** - For open access status

## Support

- **Documentation:** https://www.crossref.org/services/metadata-delivery/rest-api/
- **Support:** https://www.crossref.org/support/
- **Status Page:** https://status.crossref.org/

---

*Last updated: 2025-10-27*