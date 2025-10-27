# CORE API Documentation

**Category:** Aggregated Open Access
**Data Type:** Open access papers, repositories, journals
**API Type:** REST API
**Authentication:** API key required for higher usage
**Rate Limits:** Varies by plan (free tier: 1000 requests/day)

## Overview

CORE (COnnecting REpositories) is one of the world's largest aggregators of open access research outputs, providing access to millions of academic papers from repositories and journals worldwide. It offers powerful search capabilities and comprehensive metadata for open access scholarly content.

## Key Features

- **268+ million open access papers** from thousands of repositories
- **Advanced text search** with relevance ranking and filtering
- **Full-text access** where legally permitted
- **Repository discovery** and analytics
- **Research output analysis** and impact metrics
- **Bulk data access** for research purposes
- **Multiple output formats** (JSON, XML, CSV)
- **Faceted search** by subject, year, repository, and more

## Documentation

- **API Documentation:** https://core.ac.uk/documentation/api
- **Developer Portal:** https://core.ac.uk/services/
- **Main Site:** https://core.ac.uk/
- **Data Dashboard:** https://core.ac.uk/data/dashboard
- **GitHub:** https://github.com/oacore/core-api

## Rate Limits

- **Free tier:** 1,000 requests per day
- **Premium tiers:** Higher limits available
- **Rate limiting headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- **Quota management:** Daily reset at midnight UTC
- **Bulk access:** Special arrangements for large-scale research

## API Endpoints

### Search Papers
```bash
# Search for papers
https://api.core.ac.uk/v3/search/works

# Search with query
https://api.core.ac.uk/v3/search/works?q=machine+learning

# Search with filters
https://api.core.ac.uk/v3/search/works?q=artificial+intelligence&pageSize=25
```

### Get Specific Paper
```bash
# Get paper by ID
https://api.core.ac.uk/v3/works/123456

# Get full text where available
https://api.core.ac.uk/v3/works/123456/download?format=pdf
```

### Repository Management
```bash
# List repositories
https://api.core.ac.uk/v3/repositories

# Get repository details
https://api.core.ac.uk/v3/repositories/456789
```

## Implementation Examples

### Basic Search Usage (JavaScript)
```javascript
class COREAPI {
  constructor(apiKey = null) {
    this.baseURL = 'https://api.core.ac.uk/v3';
    this.apiKey = apiKey;
    this.requestDelay = 1000; // Respect rate limits
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
      'Accept': 'application/json',
      'User-Agent': 'AcademicExplorer/1.0'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, { headers, ...options });
    if (!response.ok) {
      throw new Error(`CORE API error: ${response.status}`);
    }
    return response.json();
  }

  async searchPapers(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      pageSize: options.pageSize || 25,
      page: options.page || 1,
      ...options.filters
    });

    const url = `${this.baseURL}/search/works?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data.totalHits,
      papers: data.results.map(p => this.parsePaperData(p)),
      page: parseInt(data.pageIndex) + 1,
      pageSize: parseInt(data.pageSize)
    };
  }

  parsePaperData(paperData) {
    return {
      id: paperData.id,
      title: paperData.title,
      authors: paperData.authors || [],
      year: paperData.yearPublished,
      abstract: paperData.description,
      publisher: paperData.publisher,
      source: paperData.source?.identifier,
      identifiers: {
        doi: paperData.identifiers?.doi?.[0],
        core: paperData.identifiers?.core?.[0]
      },
      downloadUrl: paperData.downloadUrl,
      subjects: paperData.subjects || [],
      repository: paperData.repository?.identifier,
      oaStatus: paperData.oaStatus
    };
  }

  async getPaper(paperId) {
    const url = `${this.baseURL}/works/${paperId}`;
    const data = await this.makeRequest(url);
    return this.parsePaperData(data);
  }

  async searchRepositories(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      pageSize: options.pageSize || 25,
      ...options.filters
    });

    const url = `${this.baseURL}/search/repositories?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data.totalHits,
      repositories: data.results.map(r => this.parseRepositoryData(r))
    };
  }

  parseRepositoryData(repoData) {
    return {
      id: repoData.id,
      name: repoData.name,
      description: repoData.description,
      url: repoData.baseUrl,
      type: repoData.type,
      country: repoData.country,
      oaiPmhBaseUrl: repoData.oaiPmhBaseUrl,
      software: repoData.software,
      metadataFormats: repoData.metadataFormats || [],
      identifiers: repoData.identifiers || {}
    };
  }
}

// Usage
const core = new COREAPI();

core.searchPapers('machine learning', {
  pageSize: 10,
  filters: { yearPublished: '2023' }
}).then(result => {
  console.log(`Found ${result.total} papers`);
  result.papers.forEach(paper => {
    console.log(`- ${paper.title} (${paper.year})`);
  });
});

core.getPaper('123456').then(paper => {
  console.log(`Title: ${paper.title}`);
  console.log(`Authors: ${paper.authors.join(', ')}`);
});
```

### Advanced Analysis (Python)
```python
import requests
import time
import json
from typing import List, Dict, Optional

class COREAPI:
    def __init__(self, api_key: Optional[str] = None):
        self.base_url = "https://api.core.ac.uk/v3"
        self.api_key = api_key
        self.request_delay = 1.0
        self.last_request = 0

    def make_request(self, url: str, params: Dict = None) -> Dict:
        now = time.time()
        if now - self.last_request < self.request_delay:
            time.sleep(self.request_delay - (now - self.last_request))

        self.last_request = time.time()

        headers = {
            'Accept': 'application/json',
            'User-Agent': 'AcademicExplorer/1.0'
        }

        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'

        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        return response.json()

    def search_papers(self, query: str, **kwargs) -> Dict:
        params = {
            'q': query,
            'pageSize': kwargs.get('page_size', 25),
            'page': kwargs.get('page', 1)
        }

        # Add any additional filters
        params.update(kwargs.get('filters', {}))

        url = f"{self.base_url}/search/works"
        data = self.make_request(url, params)

        return {
            'total': data.get('totalHits', 0),
            'papers': [self.parse_paper_data(p) for p in data.get('results', [])],
            'page': data.get('pageIndex', 0) + 1,
            'page_size': data.get('pageSize', 25)
        }

    def parse_paper_data(self, paper_data: Dict) -> Dict:
        return {
            'id': paper_data.get('id'),
            'title': paper_data.get('title', ''),
            'authors': paper_data.get('authors', []),
            'year': paper_data.get('yearPublished'),
            'abstract': paper_data.get('description', ''),
            'publisher': paper_data.get('publisher'),
            'source': paper_data.get('source', {}).get('identifier'),
            'identifiers': {
                'doi': paper_data.get('identifiers', {}).get('doi', [''])[0] if paper_data.get('identifiers', {}).get('doi') else None,
                'core': paper_data.get('identifiers', {}).get('core', [''])[0] if paper_data.get('identifiers', {}).get('core') else None
            },
            'download_url': paper_data.get('downloadUrl'),
            'subjects': paper_data.get('subjects', []),
            'repository': paper_data.get('repository', {}).get('identifier'),
            'oa_status': paper_data.get('oaStatus')
        }

    def analyze_open_access_trends(self, start_year: int = 2010, end_year: int = 2023) -> Dict:
        """Analyze open access publication trends over time"""
        trends = {}

        for year in range(start_year, end_year + 1):
            try:
                result = self.search_papers(
                    "open access",
                    filters={'yearPublished': str(year)},
                    page_size=1  # Just need the count
                )
                trends[year] = result['total']
                print(f"Year {year}: {result['total']} papers")

                # Rate limiting
                time.sleep(1)

            except Exception as e:
                print(f"Error processing year {year}: {e}")
                trends[year] = 0

        return trends

    def discover_repositories_by_topic(self, topic: str, limit: int = 20) -> List[Dict]:
        """Discover repositories that publish on specific topics"""
        # First search for papers on the topic
        papers_result = self.search_papers(topic, page_size=100)

        # Count repositories
        repo_counts = {}
        for paper in papers_result['papers']:
            repo = paper.get('repository')
            if repo:
                repo_counts[repo] = repo_counts.get(repo, 0) + 1

        # Sort by count and get repository details
        top_repos = sorted(repo_counts.items(), key=lambda x: x[1], reverse=True)[:limit]

        repositories = []
        for repo_id, count in top_repos:
            try:
                repo_data = self.make_request(f"{self.base_url}/repositories/{repo_id}")
                repositories.append({
                    'id': repo_id,
                    'name': repo_data.get('name', ''),
                    'description': repo_data.get('description', ''),
                    'country': repo_data.get('country', ''),
                    'paper_count': count,
                    'url': repo_data.get('baseUrl', '')
                })
                time.sleep(0.5)  # Rate limiting
            except Exception as e:
                print(f"Error fetching repository {repo_id}: {e}")

        return repositories

# Usage
core = COREAPI()

# Search for papers
result = core.search_papers('artificial intelligence', page_size=10)
print(f"Found {result['total']} papers")

# Analyze trends
trends = core.analyze_open_access_trends(2020, 2023)
print("Open access trends:", trends)

# Discover repositories
repositories = core.discover_repositories_by_topic('machine learning', limit=10)
for repo in repositories:
    print(f"- {repo['name']} ({repo['country']}) - {repo['paper_count']} papers")
```

## Data Models

### Paper Object Structure
```json
{
  "id": "123456",
  "title": "Machine Learning for Scientific Discovery",
  "authors": [
    {
      "name": "Smith, John",
      "identifiers": {
        "orcid": "0000-0002-1234-5678"
      }
    }
  ],
  "year": 2023,
  "abstract": "Abstract text...",
  "publisher": "Nature Publishing Group",
  "source": {
    "identifier": "arXiv",
    "type": "repository"
  },
  "identifiers": {
    "doi": "10.1038/s41586-023-01234",
    "core": "123456"
  },
  "downloadUrl": "https://core.ac.uk/download/pdf/123456.pdf",
  "subjects": [
    { "subject": "Computer Science" },
    { "subject": "Artificial Intelligence" }
  ],
  "repository": "arXiv.org",
  "oaStatus": "Gold Open Access"
}
```

### Repository Object Structure
```json
{
  "id": "456789",
  "name": "arXiv.org",
  "description": "Open access repository for physics and mathematics papers",
  "baseUrl": "https://arxiv.org",
  "type": "institutional",
  "country": "United States",
  "oaiPmhBaseUrl": "https://export.arxiv.org/oai2",
  "software": "arXiv",
  "metadataFormats": ["oai_dc"],
  "identifiers": {
    "ror": "05ryps150",
    "isni": "0000000122334567"
  }
}
```

## Common Use Cases

### 1. Open Access Discovery
```javascript
// Find open access versions of papers
async function findOpenAccessVersions(doiList) {
  const results = [];

  for (const doi of doiList) {
    const result = await core.searchPapers(`doi:"${doi}"`);
    if (result.papers.length > 0) {
      const paper = result.papers[0];
      if (paper.downloadUrl) {
        results.push({
          doi,
          title: paper.title,
          downloadUrl: paper.downloadUrl,
          repository: paper.repository
        });
      }
    }
  }

  return results;
}
```

### 2. Research Output Analysis
```python
def analyze_research_output(topic, year_range):
    """Analyze research output for a topic over time"""
    analysis = {
        'topic': topic,
        'yearly_counts': {},
        'total_papers': 0,
        'repositories': {},
        'subjects': {}
    }

    for year in year_range:
        result = core.search_papers(
            topic,
            filters={'yearPublished': str(year)},
            page_size=100
        )

        analysis['yearly_counts'][year] = result['total']
        analysis['total_papers'] += result['total']

        # Analyze repositories
        for paper in result['papers']:
            repo = paper.get('repository', 'Unknown')
            analysis['repositories'][repo] = analysis['repositories'].get(repo, 0) + 1

            # Analyze subjects
            for subject in paper.get('subjects', []):
                subj_name = subject.get('subject', 'Unknown')
                analysis['subjects'][subj_name] = analysis['subjects'].get(subj_name, 0) + 1

    return analysis
```

## Best Practices

1. **Respect rate limits** - Use appropriate delays between requests
2. **Cache results** - Store frequently accessed data locally
3. **Use specific queries** - Narrow searches for better results
4. **Handle pagination** - Process large result sets efficiently
5. **Validate metadata** - Check for completeness and accuracy
6. **Monitor quota** - Track remaining requests in free tier

## Error Handling

```javascript
async function robustCORERequest(coreAPI, requestFunction, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await requestFunction();
    } catch (error) {
      if (error.message.includes('429')) {
        // Rate limit exceeded - wait longer
        const delay = Math.pow(2, attempt) * 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (error.message.includes('401')) {
        // Authentication error
        throw new Error('Invalid API key');
      }
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Alternatives

- **OpenAlex API** - For comprehensive scholarly data
- **Crossref API** - For DOI metadata
- **Unpaywall API** - For open access discovery
- **arXiv API** - For preprint access
- **Semantic Scholar API** - For paper metadata and citations

## Support

- **API Documentation:** https://core.ac.uk/documentation/api
- **Developer Portal:** https://core.ac.uk/services/
- **Support:** https://core.ac.uk/contact-us
- **GitHub Issues:** https://github.com/oacore/core-api/issues

---

*Last updated: 2025-10-27*
