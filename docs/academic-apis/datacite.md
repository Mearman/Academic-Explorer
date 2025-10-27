# DataCite API Documentation

**Category:** Scholarly Metadata Management
**Data Type:** DOI metadata, research outputs, datasets
**API Type:** REST API + GraphQL API
**Authentication:** API key required for write operations
**Rate Limits:** Standard usage limits apply

## Overview

DataCite is a leading global provider of DOIs (Digital Object Identifiers) for research data and other research outputs. Their APIs provide access to metadata for millions of scholarly works, including datasets, software, articles, preprints, and other research outputs across all disciplines.

## Key Features

- **20+ million DOIs** registered across all research disciplines
- **GraphQL API** for flexible, efficient data querying
- **REST API** for traditional REST operations
- **Comprehensive metadata** including creators, affiliations, funding information
- **Research output types** (datasets, software, articles, preprints, etc.)
- **Relationship support** between research outputs
- **Event tracking** via Events Data
- **Crossref integration** for citation tracking

## Documentation

- **REST API:** https://api.datacite.org/dois
- **GraphQL API:** https://api.datacite.org/graphql
- **GraphQL Playground:** https://api.datacite.org/graphiql
- **API Documentation:** https://support.datacite.org/docs/api
- **Developer Guide:** https://support.datacite.org/docs/getting-started

## Rate Limits

- **Standard API limits** enforced based on usage
- **GraphQL queries** limited by query complexity
- **Respectful usage** encouraged
- **Cache responses** to optimize performance

## API Endpoints

### REST API
```bash
# Get DOI metadata
https://api.datacite.org/dois/10.5061/dryad.123456

# Search DOIs
https://api.datacite.org/dois?query=machine+learning&resource-type-id=dataset

# GraphQL endpoint
https://api.datacite.org/graphql
```

## Implementation Examples

### Basic REST API Usage (JavaScript)
```javascript
class DataCiteAPI {
  constructor(apiKey = null) {
    this.baseURL = 'https://api.datacite.org';
    this.apiKey = apiKey;
    this.requestDelay = 100;
    this.lastRequest = 0;
  }

  async makeRequest(url, options = {}) {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequest;
    if (timeSinceLast < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLast));
    }
    this.lastRequest = Date.now();

    const headers = {
      'Accept': 'application/vnd.api+json',
      'User-Agent': 'AcademicExplorer/1.0'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, { headers, ...options });
    if (!response.ok) {
      throw new Error(`DataCite API error: ${response.status}`);
    }
    return response.json();
  }

  async getDOI(doi) {
    const url = `${this.baseURL}/dois/${encodeURIComponent(doi)}`;
    const data = await this.makeRequest(url);
    return this.parseDOIData(data.data);
  }

  parseDOIData(doiData) {
    const attrs = doiData.attributes;
    return {
      doi: attrs.doi,
      title: attrs.titles?.[0]?.title || '',
      creators: attrs.creators || [],
      publicationYear: attrs.published?.substring(0, 4),
      resourceType: attrs.types?.resourceTypeGeneral,
      descriptions: attrs.descriptions || [],
      subjects: attrs.subjects || [],
      url: attrs.url
    };
  }

  async searchDOIs(query, options = {}) {
    const params = new URLSearchParams({
      'query': query,
      'page[size]': options.pageSize || 25,
      ...options.filters
    });

    const url = `${this.baseURL}/dois?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data.meta.total,
      dois: data.data.map(d => this.parseDOIData(d))
    };
  }
}

// Usage
const datacite = new DataCiteAPI();

datacite.getDOI('10.5061/dryad.123456').then(metadata => {
  console.log(`Title: ${metadata.title}`);
  console.log(`Type: ${metadata.resourceType}`);
});

datacite.searchDOIs('machine learning', {
  pageSize: 10,
  filters: { 'resource-type-id': 'dataset' }
}).then(result => {
  console.log(`Found ${result.total} datasets`);
});
```

### GraphQL API Usage (Python)
```python
import requests
import time

class DataCiteGraphQL:
    def __init__(self, api_key=None):
        self.graphql_url = "https://api.datacite.org/graphql"
        self.api_key = api_key
        self.request_delay = 0.1
        self.last_request = 0

    def make_query(self, query, variables=None):
        now = time.time()
        if now - self.last_request < self.request_delay:
            time.sleep(self.request_delay - (now - self.last_request))

        self.last_request = time.time()

        headers = {'Content-Type': 'application/json'}
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'

        response = requests.post(
            self.graphql_url,
            json={'query': query, 'variables': variables or {}},
            headers=headers
        )
        response.raise_for_status()
        return response.json()

    def search_dois(self, query_text, resource_types=None, first=25):
        query = """
        query SearchDOIs($query: String!, $first: Int!, $resourceTypes: [String!]) {
          search(
            query: $query
            first: $first
            filter: { resourceTypes: $resourceTypes }
          ) {
            totalCount
            nodes {
              doi
              titles { title }
              creators { name }
              publicationYear
              resourceType
              descriptions { description }
              subjects { subject }
            }
          }
        }
        """

        variables = {
            'query': query_text,
            'first': first,
            'resourceTypes': resource_types
        }

        return self.make_query(query, variables)

# Usage
datacite = DataCiteGraphQL()

result = datacite.search_dois(
    'machine learning',
    resource_types=['Dataset'],
    first=10
)

print(f"Found {result['data']['search']['totalCount']} datasets")
for node in result['data']['search']['nodes']:
    print(f"- {node['titles'][0]['title']}")
    print(f"  DOI: {node['doi']}")
```

## Data Models

### Resource Types
- **Dataset** - Research datasets
- **Software** - Software and code
- **Text** - Articles, preprints, books
- **Collection** - Collections of resources
- **Other** - Other resource types

### DOI Object Structure
```json
{
  "doi": "10.5061/dryad.123456",
  "title": "Machine Learning Dataset",
  "creators": [
    {
      "name": "Smith, John",
      "nameIdentifiers": [
        {
          "nameIdentifier": "0000-0002-1234-5678",
          "nameIdentifierScheme": "ORCID"
        }
      ]
    }
  ],
  "publicationYear": "2023",
  "resourceType": "Dataset",
  "descriptions": [
    {
      "description": "Dataset description...",
      "descriptionType": "Abstract"
    }
  ],
  "subjects": [
    { "subject": "Machine Learning" }
  ],
  "url": "https://doi.org/10.5061/dryad.123456"
}
```

## Best Practices

1. **Use GraphQL** for complex queries to reduce API calls
2. **Cache responses** to avoid redundant requests
3. **Implement rate limiting** to respect usage limits
4. **Use specific queries** for relevant results
5. **Handle pagination** for large result sets
6. **Validate DOIs** before making API calls

## Error Handling

```javascript
async function robustDataCiteRequest(dataciteAPI, requestFunction, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await requestFunction();
    } catch (error) {
      if (error.message.includes('429')) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Alternatives

- **Crossref API** - For DOI metadata of scholarly publications
- **OpenAlex API** - For comprehensive scholarly data
- **Zenodo API** - For research data deposits
- **Figshare API** - For research data sharing

## Support

- **API Documentation:** https://support.datacite.org/docs/api
- **GraphQL Playground:** https://api.datacite.org/graphiql
- **Support Portal:** https://support.datacite.org/

---

*Last updated: 2025-10-27*
