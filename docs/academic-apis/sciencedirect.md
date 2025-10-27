# ScienceDirect API Documentation

**Category:** Publisher Platform
**Data Type:** Full-text articles, abstracts, metadata
**API Type:** REST API
**Authentication:** API key required
**Rate Limits:** Varies by subscription and institution

## Overview

ScienceDirect is Elsevier's leading platform for scientific, technical, and medical research, providing access to over 18 million articles from thousands of journals and books. The ScienceDirect API allows developers to search and retrieve scholarly content programmatically, with access levels determined by institutional subscriptions.

## Key Features

- **18+ million full-text articles** across all scientific disciplines
- **Comprehensive metadata** including abstracts, keywords, and references
- **Advanced search capabilities** with sophisticated filtering options
- **Institutional access control** based on subscription rights
- **Full-text download** where permitted by subscriptions
- **Citation analysis** and reference linking
- **Subject classification** and controlled vocabularies
- **Real-time availability** checking for subscriptions

## Documentation

- **API Documentation:** https://dev.elsevier.com/science_direct
- **Developer Portal:** https://dev.elsevier.com/
- **Main Site:** https://www.sciencedirect.com/
- **API Key Registration:** https://dev.elsevier.com/apikey/manage
- **Documentation Portal:** https://dev.elsevier.com/documentation
- **Support:** https://service.elsevier.com/app/contact/supporthub/developer/

## Rate Limits

- **Free tier:** 1,000 requests per month
- **Institutional tiers:** Higher limits based on subscription
- **Rate limiting headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Quota management:** Monthly reset cycle
- **Burst protection:** Automatic throttling for high-frequency requests
- **Enterprise options:** Custom limits for large-scale usage

## API Endpoints

### Search Articles
```bash
# Search for articles
https://api.elsevier.com/content/search/sciencedirect?query=artificial+intelligence

# Advanced search with filters
https://api.elsevier.com/content/search/sciencedirect?query=machine+learning&date=2023&subj=Computer+Science

# Retrieve specific article
https://api.elsevier.com/content/article/pii/S0004370212345678
```

### Metadata Retrieval
```bash
# Get article metadata
https://api.elsevier.com/content/metadata/doi/10.1016/j.chemosphere.2023.123456

# Search by ISSN
https://api.elsevier.com/content/search/sciencedirect?issn=13598364&date=2023
```

### Availability Check
```bash
# Check subscription availability
https://api.elsevier.com/content/article/pii/S0004370212345678?view=FULL&httpAccept=application/json
```

## Implementation Examples

### Basic Search and Retrieval (JavaScript)
```javascript
class ScienceDirectAPI {
  constructor(apiKey, institutionToken = null) {
    this.baseURL = 'https://api.elsevier.com/content';
    this.apiKey = apiKey;
    this.institutionToken = institutionToken;
    this.requestDelay = 100; // Respect rate limits
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
      'X-ELS-APIKey': this.apiKey,
      'User-Agent': 'AcademicExplorer/1.0'
    };

    if (this.institutionToken) {
      headers['X-ELS-Insttoken'] = this.institutionToken;
    }

    const response = await fetch(url, { headers, ...options });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (response.status === 401) {
        throw new Error('Invalid API credentials');
      }
      if (response.status === 403) {
        throw new Error('Access forbidden - check subscription');
      }
      throw new Error(`ScienceDirect API error: ${response.status}`);
    }

    return response.json();
  }

  async searchArticles(query, options = {}) {
    const params = new URLSearchParams({
      query: query,
      count: options.pageSize || 25,
      start: (options.page - 1) * (options.pageSize || 25) + 1,
      sort: options.sort || 'relevance',
      view: options.view || 'STANDARD'
    });

    // Add filters
    if (options.date) params.append('date', options.date);
    if (options.subject) params.append('subj', options.subject);
    if (options.issn) params.append('issn', options.issn);
    if (options.author) params.append('author', options.author);

    const url = `${this.baseURL}/search/sciencedirect?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data['search-results']['opensearch:totalResults'],
      articles: data['search-results'].entry.map(article => this.parseArticleData(article)),
      page: options.page || 1,
      pageSize: options.pageSize || 25
    };
  }

  parseArticleData(articleData) {
    return {
      pii: articleData['pii'],
      doi: articleData['prism:doi'],
      title: articleData['dc:title'],
      authors: articleData['dc:creator'] ? [articleData['dc:creator']] : [],
      publicationName: articleData['prism:publicationName'],
      volume: articleData['prism:volume'],
      issue: articleData['prism:issue'],
      pageRange: articleData['prism:pageRange'],
      coverDate: articleData['prism:coverDate'],
      abstract: articleData['dc:description'],
      subjects: articleData['subject-areas']?.map(s => s['$']) || [],
      openaccess: articleData['openaccess'] === 'true',
      available: articleData['available'] === 'true',
      links: articleData.link || []
    };
  }

  async getArticle(pii, options = {}) {
    const params = new URLSearchParams({
      view: options.view || 'FULL'
    });

    const url = `${this.baseURL}/article/pii/${pii}?${params}`;
    const data = await this.makeRequest(url);
    return this.parseFullArticleData(data);
  }

  parseFullArticleData(articleData) {
    return {
      pii: articleData['coredata']['pii'],
      doi: articleData['coredata']['prism:doi'],
      title: articleData['coredata']['dc:title'],
      authors: articleData['coredata']['dc:creator'] || [],
      abstract: articleData['coredata']['dc:description'],
      publicationName: articleData['coredata']['prism:publicationName'],
      volume: articleData['coredata']['prism:volume'],
      issue: articleData['coredata']['prism:issue'],
      pageRange: articleData['coredata']['prism:pageRange'],
      coverDate: articleData['coredata']['prism:coverDate'],
      subjects: articleData['coredata']['subject-areas']?.map(s => s['$']) || [],
      openaccess: articleData['coredata']['openaccess'] === 'true',
      available: articleData['coredata']['available'] === 'true',
      links: articleData['coredata'].link || [],
      references: articleData['references']?.map(r => ({
        id: r['@ref'] === 'self' ? r['dc:identifier'] : r['@id'],
        title: r['dc:title'],
        authors: r['authors']?.author || []
      })) || []
    };
  }

  async checkAvailability(pii) {
    const url = `${this.baseURL}/article/pii/${pii}?view=ENTITLED`;
    const data = await this.makeRequest(url);
    return {
      available: data['coredata']['available'] === 'true',
      entitled: data['coredata']['entitled'] === 'true',
      openAccess: data['coredata']['openaccess'] === 'true'
    };
  }
}

// Usage
const scienceDirect = new ScienceDirectAPI('your-api-key', 'your-institution-token');

scienceDirect.searchArticles('machine learning', {
  pageSize: 10,
  date: '2023',
  subject: 'Computer Science'
}).then(result => {
  console.log(`Found ${result.total} articles`);
  result.articles.forEach(article => {
    console.log(`- ${article.title} (${article.publicationName})`);
  });
});
```

### Advanced Research Analysis (Python)
```python
import requests
import time
from typing import List, Dict, Optional
from urllib.parse import quote

class ScienceDirectAPI:
    def __init__(self, api_key: str, institution_token: Optional[str] = None):
        self.base_url = "https://api.elsevier.com/content"
        self.api_key = api_key
        self.institution_token = institution_token
        self.request_delay = 0.1
        self.last_request = 0

    def make_request(self, url: str, params: Dict = None) -> Dict:
        now = time.time()
        if now - self.last_request < self.request_delay:
            time.sleep(self.request_delay - (now - self.last_request))

        self.last_request = time.time()

        headers = {
            'Accept': 'application/json',
            'X-ELS-APIKey': self.api_key,
            'User-Agent': 'AcademicExplorer/1.0'
        }

        if self.institution_token:
            headers['X-ELS-Insttoken'] = self.institution_token

        response = requests.get(url, params=params, headers=headers)

        if response.status_code == 429:
            raise Exception("Rate limit exceeded")
        elif response.status_code == 401:
            raise Exception("Invalid API credentials")
        elif response.status_code == 403:
            raise Exception("Access forbidden - check subscription")

        response.raise_for_status()
        return response.json()

    def search_articles(self, query: str, **kwargs) -> Dict:
        params = {
            'query': query,
            'count': kwargs.get('page_size', 25),
            'start': (kwargs.get('page', 1) - 1) * kwargs.get('page_size', 25) + 1,
            'sort': kwargs.get('sort', 'relevance'),
            'view': kwargs.get('view', 'STANDARD')
        }

        # Add optional filters
        if kwargs.get('date'):
            params['date'] = kwargs['date']
        if kwargs.get('subject'):
            params['subj'] = kwargs['subject']
        if kwargs.get('issn'):
            params['issn'] = kwargs['issn']

        url = f"{self.base_url}/search/sciencedirect"
        data = self.make_request(url, params)

        return {
            'total': int(data['search-results']['opensearch:totalResults']),
            'articles': [self.parse_article_data(article) for article in data['search-results'].get('entry', [])],
            'page': kwargs.get('page', 1),
            'page_size': kwargs.get('page_size', 25)
        }

    def parse_article_data(self, article_data: Dict) -> Dict:
        return {
            'pii': article_data.get('pii'),
            'doi': article_data.get('prism:doi'),
            'title': article_data.get('dc:title'),
            'authors': [article_data['dc:creator']] if article_data.get('dc:creator') else [],
            'publication_name': article_data.get('prism:publicationName'),
            'volume': article_data.get('prism:volume'),
            'issue': article_data.get('prism:issue'),
            'page_range': article_data.get('prism:pageRange'),
            'cover_date': article_data.get('prism:coverDate'),
            'abstract': article_data.get('dc:description'),
            'subjects': [s.get('$') for s in article_data.get('subject-areas', [])],
            'open_access': article_data.get('openaccess') == 'true',
            'available': article_data.get('available') == 'true',
            'links': article_data.get('link', [])
        }

    def analyze_research_trends(self, topics: List[str], start_year: int = 2020, end_year: int = 2023) -> Dict:
        """Analyze publication trends for multiple topics"""
        trends = {}

        for topic in topics:
            topic_trends = {}
            print(f"Analyzing topic: {topic}")

            for year in range(start_year, end_year + 1):
                try:
                    result = self.search_articles(
                        topic,
                        date=str(year),
                        page_size=1  # Just need the count
                    )
                    topic_trends[year] = result['total']
                    print(f"  Year {year}: {result['total']} articles")

                    # Rate limiting
                    time.sleep(0.5)

                except Exception as e:
                    print(f"Error processing {topic} for year {year}: {e}")
                    topic_trends[year] = 0

            trends[topic] = topic_trends

        return trends

    def discover_top_journals(self, subject: str, limit: int = 10) -> List[Dict]:
        """Discover top journals for a subject area"""
        result = self.search_articles(
            f"SUBJAREA({subject})",
            page_size=200,
            sort='date'
        )

        journal_counts = {}
        for article in result['articles']:
            journal = article.get('publication_name', 'Unknown')
            if journal != 'Unknown':
                journal_counts[journal] = journal_counts.get(journal, 0) + 1

        # Sort by count and return top journals
        top_journals = sorted(journal_counts.items(), key=lambda x: x[1], reverse=True)[:limit]

        return [{'journal': journal, 'article_count': count} for journal, count in top_journals]

    def check_full_text_access(self, pii_list: List[str]) -> Dict:
        """Check full-text access for multiple articles"""
        access_results = {}

        for pii in pii_list:
            try:
                result = self.make_request(
                    f"{self.base_url}/article/pii/{pii}",
                    params={'view': 'ENTITLED'}
                )

                coredata = result.get('coredata', {})
                access_results[pii] = {
                    'available': coredata.get('available') == 'true',
                    'entitled': coredata.get('entitled') == 'true',
                    'open_access': coredata.get('openaccess') == 'true',
                    'title': coredata.get('dc:title', 'Unknown')
                }

                time.sleep(0.2)  # Rate limiting

            except Exception as e:
                print(f"Error checking access for {pii}: {e}")
                access_results[pii] = {
                    'available': False,
                    'entitled': False,
                    'open_access': False,
                    'error': str(e)
                }

        return access_results

# Usage
science_direct = ScienceDirectAPI('your-api-key', 'your-institution-token')

# Search for articles
result = science_direct.search_articles('artificial intelligence', page_size=10)
print(f"Found {result['total']} articles")

# Analyze trends
trends = science_direct.analyze_research_trends(['machine learning', 'deep learning'], 2020, 2023)
for topic, trend_data in trends.items():
    print(f"{topic}: {trend_data}")

# Discover top journals
journals = science_direct.discover_top_journals('Computer Science', limit=10)
for journal in journals:
    print(f"- {journal['journal']}: {journal['article_count']} articles")
```

## Data Models

### Article Object Structure
```json
{
  "pii": "S0004370212345678",
  "doi": "10.1016/j.chemosphere.2023.123456",
  "title": "Advanced Machine Learning Applications in Environmental Science",
  "authors": ["Smith, John", "Doe, Jane"],
  "publicationName": "Chemosphere",
  "volume": "312",
  "issue": "2",
  "pageRange": "123-145",
  "coverDate": "2023-12-01",
  "abstract": "This paper presents novel applications of machine learning...",
  "subjects": ["Computer Science", "Environmental Science"],
  "openAccess": false,
  "available": true,
  "links": [
    {
      "@ref": "self",
      "@href": "https://api.elsevier.com/content/article/pii/S0004370212345678"
    }
  ]
}
```

## Common Use Cases

### 1. Research Trend Analysis
```javascript
// Track research trends over time
async function analyzeTrends(topic, yearRange) {
  const trends = {};

  for (const year of yearRange) {
    const result = await scienceDirect.searchArticles(topic, {
      date: year.toString(),
      pageSize: 1
    });
    trends[year] = result.total;
  }

  return trends;
}
```

### 2. Access Verification
```python
# Verify institutional access before download
def verify_access(pii_list):
    access_info = {}

    for pii in pii_list:
        try:
            result = science_direct.make_request(
                f"{science_direct.base_url}/article/pii/{pii}",
                params={'view': 'ENTITLED'}
            )

            access_info[pii] = {
                'full_access': result['coredata'].get('entitled') == 'true',
                'open_access': result['coredata'].get('openaccess') == 'true',
                'title': result['coredata'].get('dc:title')
            }

        except Exception as e:
            access_info[pii] = {'error': str(e)}

    return access_info
```

## Best Practices

1. **Check access rights** - Verify subscription access before requesting full text
2. **Respect rate limits** - Implement appropriate delays between requests
3. **Cache results** - Store frequently accessed metadata locally
4. **Handle access restrictions** - Gracefully handle permission-based denials
5. **Use specific queries** - Narrow searches for better performance
6. **Monitor quotas** - Track API usage against institutional limits

## Error Handling

```javascript
async function robustScienceDirectRequest(api, requestFunction, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await requestFunction();
    } catch (error) {
      if (error.message.includes('429')) {
        // Rate limit exceeded
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (error.message.includes('403')) {
        // Access denied - may need to check subscription
        throw new Error('Subscription access required');
      }
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}
```

## Alternatives

- **Scopus API** - For broader citation and bibliographic data
- **Crossref API** - For DOI metadata and citation tracking
- **OpenAlex API** - For comprehensive scholarly data
- **Springer API** - For Springer Nature content
- **arXiv API** - For preprint access

## Support

- **API Documentation:** https://dev.elsevier.com/science_direct
- **Developer Portal:** https://dev.elsevier.com/
- **API Key Registration:** https://dev.elsevier.com/apikey/manage
- **Support Center:** https://service.elsevier.com/app/contact/supporthub/developer/
- **Documentation:** https://dev.elsevier.com/documentation

---

*Last updated: 2025-10-27*
