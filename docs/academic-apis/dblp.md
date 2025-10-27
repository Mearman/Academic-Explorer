# DBLP API Documentation

**Category:** Computer Science Bibliography
**Data Type:** Bibliographic data, author information
**API Type:** REST API
**Authentication:** None required
**Rate Limits:** Reasonable usage limits

## Overview

DBLP (Digital Bibliography & Library Project) is a comprehensive computer science bibliography database that provides free API access to millions of academic publications, author profiles, and conference/journal metadata in computer science and related fields.

## Key Features

- **Computer science literature database** with millions of publications
- **Author publication profiles** with complete publication histories
- **Conference and journal metadata** with venue hierarchies
- **Co-authorship networks** and collaboration analysis
- **Comprehensive coverage** of CS conferences, workshops, and journals
- **Real-time updates** with new publications added regularly

## Documentation

- **API Documentation:** https://dblp.org/faq/13581473
- **Search API:** https://dblp.org/search/api
- **Binary API:** https://dblp.org/faq/How+can+I+use+the+DBLP+search+API+programatically
- **FAQ:** https://dblp.org/faq/

## Rate Limits

- **Reasonable usage limits** enforced
- **No hard limits** published but respectful usage required
- **Avoid excessive parallel requests**
- **Add delays** between consecutive requests
- **Use appropriate User-Agent** headers

## API Endpoints

### Search API
```bash
# Search for publications
https://dblp.org/search/publ/api?q=machine%20learning&format=json&h=10

# Search by author
https://dblp.org/search/author/api?q=john%20smith&format=json&h=20

# Search by venue
https://dblp.org/search/venue/api?q=nature%20machine%20learning&format=json&h=5
```

### Binary API
```bash
# Get publication details (binary format)
https://dblp.org/rec/conf/aaai/Smith2023.bib

# Get author profile
https://dblp.org/pid/123/456.bib

# Get venue information
https://dblp.org/journals/nature/2023.bib
```

## Implementation Examples

### Basic Search (JavaScript)
```javascript
class DBLPAPI {
  constructor() {
    this.searchBaseUrl = 'https://dblp.org/search';
    this.requestDelay = 1000; // 1 second between requests
    this.lastRequest = 0;
  }

  async makeRequest(url) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLast = now - this.lastRequest;
    if (timeSinceLast < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLast));
    }
    this.lastRequest = Date.now();

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AcademicExplorer/1.0 (mailto:your-email@example.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`DBLP API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchPublications(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      h: options.maxResults || 20,
      ...options
    });

    const url = `${this.searchBaseUrl}/publ/api?${params}`;
    const result = await this.makeRequest(url);

    return {
      query,
      total: result.result ? result.result['@total'] : 0,
      publications: result.result ? result.result.completion.map(this.parsePublication) : []
    };
  }

  parsePublication(pub) {
    return {
      title: pub.title ? pub.title.text : '',
      authors: pub.authors ? pub.authors.author.map(author =>
        typeof author === 'string' ? author : author.text
      ) : [],
      venue: pub.venue ? (typeof pub.venue === 'string' ? pub.venue : pub.venue.text) : '',
      year: pub.year ? parseInt(pub.year.text) : null,
      type: pub.type ? pub.type.text : '',
      url: pub.url ? pub.url.text : '',
      doi: pub.doi ? pub.doi.text : '',
      ee: pub.ee ? pub.ee.text : ''
    };
  }
}

// Usage example
const dblp = new DBLPAPI();

// Search for machine learning publications
dblp.searchPublications('machine learning', { maxResults: 10 }).then(result => {
  console.log(`Found ${result.total} publications`);
  result.publications.forEach(pub => {
    console.log(`Title: ${pub.title}`);
    console.log(`Authors: ${pub.authors.join(', ')}`);
    console.log(`Venue: ${pub.venue} (${pub.year})`);
    console.log(`DOI: ${pub.doi || 'Not available'}`);
    console.log('---');
  });
});
```

### Advanced Analysis (Python)
```python
import requests
import xml.etree.ElementTree as ET
import time

class DBLPAPI:
    def __init__(self):
        self.search_base_url = 'https://dblp.org/search'
        self.request_delay = 1.0  # seconds between requests

    def search_publications(self, query, max_results=20):
        """Search for publications."""
        params = {
            'q': query,
            'format': 'json',
            'h': max_results
        }

        response = requests.get(f"{self.search_base_url}/publ/api", params=params)
        response.raise_for_status()
        result = response.json()

        publications = []
        if 'result' in result and 'completion' in result['result']:
            for pub in result['result']['completion']:
                publication = self._parse_publication(pub)
                publications.append(publication)

        return {
            'query': query,
            'total': result['result']['@total'] if 'result' in result else 0,
            'publications': publications
        }

    def _parse_publication(self, pub):
        """Parse publication data from DBLP response."""
        return {
            'title': pub.get('title', {}).get('text', ''),
            'authors': [],
            'venue': '',
            'year': None,
            'type': pub.get('type', {}).get('text', ''),
            'url': pub.get('url', {}).get('text', ''),
            'doi': pub.get('doi', {}).get('text', ''),
            'ee': pub.get('ee', {}).get('text', '')
        }

# Usage example
dblp = DBLPAPI()
ai_pubs = dblp.search_publications('artificial intelligence', max_results=10)
print(f"Found {ai_pubs['total']} AI publications")
```

## Data Models

### Publication Object
```json
{
  "title": "Deep Learning for Computer Vision",
  "authors": ["John Smith", "Jane Doe"],
  "venue": "CVPR 2023",
  "year": 2023,
  "type": "inproceedings",
  "url": "https://dblp.org/rec/conf/cvpr/Smith2023",
  "doi": "10.1000/1823.12345"
}
```

## Common Use Cases

### Academic Profile Analysis
- Track publication history
- Calculate h-index
- Analyze collaboration patterns
- Compare research output

### Conference Analysis
- Track publication trends
- Identify top contributors
- Compare conference impact
- Analyze author networks

## Best Practices

1. **Implement rate limiting** - add delays between requests
2. **Use appropriate User-Agent** headers with contact information
3. **Cache responses** when possible to reduce server load
4. **Handle XML parsing** carefully with proper error handling
5. **Respect server limitations** and avoid excessive requests

## Alternatives

- **Semantic Scholar API** - For citation analysis
- **OpenAlex API** - For comprehensive scholarly data
- **Crossref API** - For DOI metadata
- **arXiv API** - For CS preprints

## Support

- **Documentation:** https://dblp.org/faq/13581473
- **Search API:** https://dblp.org/search/api
- **FAQ:** https://dblp.org/faq/

---

*Last updated: 2025-10-27*