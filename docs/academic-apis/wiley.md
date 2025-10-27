# Wiley API Documentation

**Category:** Publisher Platform
**Data Type:** Articles, journals, books, reference works
**API Type:** REST API
**Authentication:** API key required
**Rate Limits:** Varies by subscription

## Overview

Wiley provides access to scientific and technical content across multiple disciplines through their Online Library platform. With over 8 million publications including peer-reviewed journals, books, reference works, and laboratory protocols, Wiley serves as a major publisher in life sciences, health sciences, physical sciences, social sciences, and humanities. The Wiley API enables programmatic access to their extensive content repository for research and data mining applications.

## Key Features

- **8+ million publications** across journals, books, and reference works
- **Comprehensive metadata** including abstracts, keywords, and citation information
- **Full-text content access** where permitted by subscriptions
- **Advanced search capabilities** with sophisticated filtering options
- **Subject classification** using controlled vocabularies
- **Citation analysis** and reference linking
- **Institutional access control** based on subscription rights
- **Real-time availability** checking for subscriptions
- **Multi-format content** including HTML, PDF, and e-book formats
- **Cross-reference linking** with DOI and external databases
- **Author and institution metadata** with affiliation information
- **Publication metrics** and usage statistics

## Documentation

- **API Documentation:** https://onlinelibrary.wiley.com/library-info/resources/text-and-datamining
- **Developer Portal:** https://onlinelibrary.wiley.com/
- **Main Site:** https://www.wiley.com/
- **API Key Registration:** https://onlinelibrary.wiley.com/library-info/resources/text-and-datamining/api-access
- **Terms of Service:** https://onlinelibrary.wiley.com/library-info/terms
- **Support Center:** https://onlinelibrary.wiley.com/page/contact-us
- **Open Access Information:** https://onlinelibrary.wiley.com/library-info/open-access

## Rate Limits

- **Free tier:** Limited access for testing and development
- **Institutional tiers:** Higher limits based on subscription level
- **Academic research:** Special rates for research projects
- **Rate limiting headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Quota management:** Monthly reset cycle for most plans
- **Burst protection:** Automatic throttling for high-frequency requests
- **Enterprise options:** Custom limits for large-scale data mining projects
- **Concurrent connections:** Typically 5-10 concurrent requests permitted
- **Request throttling:** 100-500ms delay recommended between requests

## API Endpoints

### Search Articles
```bash
# Search for articles
https://api.wiley.com/onlinelibrary/search?q=machine+learning

# Advanced search with filters
https://api.wiley.com/onlinelibrary/search?q=artificial+intelligence&date=2023&subject=Computer+Science

# Search by DOI
https://api.wiley.com/onlinelibrary/search?doi=10.1002/sml.1234

# Search by author
https://api.wiley.com/onlinelibrary/search?author=John+Smith

# Search by journal
https://api.wiley.com/onlinelibrary/search?journal=Advanced+Materials
```

### Article Metadata
```bash
# Get article metadata by DOI
https://api.wiley.com/onlinelibrary/article/10.1002/sml.1234

# Get article abstract and keywords
https://api.wiley.com/onlinelibrary/article/10.1002/sml.1234?view=abstract

# Get article references
https://api.wiley.com/onlinelibrary/article/10.1002/sml.1234?view=references

# Get cited-by information
https://api.wiley.com/onlinelibrary/article/10.1002/sml.1234?view=citations
```

### Journal Information
```bash
# Get journal details by ISSN
https://api.wiley.com/onlinelibrary/journal/1556-2724

# Get journal articles by date range
https://api.wiley.com/onlinelibrary/journal/1556-2724/articles?date=2023

# Get journal Aims & Scope
https://api.wiley.com/onlinelibrary/journal/1556-2724/info
```

### Book Content
```bash
# Search books
https://api.wiley.com/onlinelibrary/books?q=machine+learning

# Get book details
https://api.wiley.com/onlinelibrary/book/9781119468606

# Get book chapters
https://api.wiley.com/onlinelibrary/book/9781119468606/chapters
```

### Availability Check
```bash
# Check subscription access
https://api.wiley.com/onlinelibrary/availability/10.1002/sml.1234

# Check open access status
https://api.wiley.com/onlinelibrary/openaccess/10.1002/sml.1234
```

## Implementation Examples

### Basic Search and Retrieval (JavaScript)
```javascript
class WileyAPI {
  constructor(apiKey, institutionToken = null) {
    this.baseURL = 'https://api.wiley.com/onlinelibrary';
    this.apiKey = apiKey;
    this.institutionToken = institutionToken;
    this.requestDelay = 200; // Respect rate limits
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
      'X-API-Key': this.apiKey,
      'User-Agent': 'AcademicExplorer/1.0'
    };

    if (this.institutionToken) {
      headers['X-Institution-Token'] = this.institutionToken;
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
      if (response.status === 404) {
        throw new Error('Resource not found');
      }
      throw new Error(`Wiley API error: ${response.status}`);
    }

    return response.json();
  }

  async searchArticles(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      limit: options.pageSize || 25,
      offset: (options.page - 1) * (options.pageSize || 25),
      sort: options.sort || 'relevance'
    });

    // Add filters
    if (options.date) params.append('date', options.date);
    if (options.subject) params.append('subject', options.subject);
    if (options.author) params.append('author', options.author);
    if (options.journal) params.append('journal', options.journal);
    if (options.openAccess) params.append('openAccess', 'true');

    const url = `${this.baseURL}/search?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data.totalResults,
      articles: data.articles.map(article => this.parseArticleData(article)),
      page: options.page || 1,
      pageSize: options.pageSize || 25
    };
  }

  parseArticleData(articleData) {
    return {
      doi: articleData.doi,
      title: articleData.title,
      authors: articleData.authors || [],
      publicationName: articleData.publicationName,
      volume: articleData.volume,
      issue: articleData.issue,
      pageRange: articleData.pageRange,
      publicationDate: articleData.publicationDate,
      abstract: articleData.abstract,
      keywords: articleData.keywords || [],
      subjects: articleData.subjects || [],
      openAccess: articleData.openAccess || false,
      available: articleData.available || false,
      citations: articleData.citations || 0,
      references: articleData.references || [],
      pdfUrl: articleData.pdfUrl,
      htmlUrl: articleData.htmlUrl
    };
  }

  async getArticle(doi, options = {}) {
    const params = new URLSearchParams({
      view: options.view || 'full'
    });

    const url = `${this.baseURL}/article/${encodeURIComponent(doi)}?${params}`;
    const data = await this.makeRequest(url);
    return this.parseFullArticleData(data);
  }

  parseFullArticleData(articleData) {
    return {
      doi: articleData.doi,
      title: articleData.title,
      authors: articleData.authors || [],
      affiliations: articleData.affiliations || [],
      abstract: articleData.abstract,
      keywords: articleData.keywords || [],
      publicationName: articleData.publicationName,
      volume: articleData.volume,
      issue: articleData.issue,
      pageRange: articleData.pageRange,
      publicationDate: articleData.publicationDate,
      subjects: articleData.subjects || [],
      openAccess: articleData.openAccess || false,
      available: articleData.available || false,
      citations: articleData.citations || 0,
      references: articleData.references || [],
      pdfUrl: articleData.pdfUrl,
      htmlUrl: articleData.htmlUrl,
      doiLink: articleData.doiLink,
      metrics: articleData.metrics || {},
      funding: articleData.funding || []
    };
  }

  async checkAvailability(doi) {
    const url = `${this.baseURL}/availability/${encodeURIComponent(doi)}`;
    const data = await this.makeRequest(url);
    return {
      available: data.available,
      openAccess: data.openAccess,
      subscriptionRequired: data.subscriptionRequired,
      accessLevel: data.accessLevel
    };
  }

  async getJournalInfo(issn) {
    const url = `${this.baseURL}/journal/${issn}`;
    const data = await this.makeRequest(url);
    return {
      issn: data.issn,
      title: data.title,
      publisher: data.publisher,
      subjects: data.subjects || [],
      description: data.description,
      aimsAndScope: data.aimsAndScope,
      impactFactor: data.impactFactor,
      openAccess: data.openAccess,
      articleCount: data.articleCount
    };
  }
}

// Usage
const wiley = new WileyAPI('your-api-key', 'your-institution-token');

wiley.searchArticles('machine learning', {
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
from urllib.parse import quote_plus

class WileyAPI:
    def __init__(self, api_key: str, institution_token: Optional[str] = None):
        self.base_url = "https://api.wiley.com/onlinelibrary"
        self.api_key = api_key
        self.institution_token = institution_token
        self.request_delay = 0.2
        self.last_request = 0

    def make_request(self, url: str, params: Dict = None) -> Dict:
        now = time.time()
        if now - self.last_request < self.request_delay:
            time.sleep(self.request_delay - (now - self.last_request))

        self.last_request = time.time()

        headers = {
            'Accept': 'application/json',
            'X-API-Key': self.api_key,
            'User-Agent': 'AcademicExplorer/1.0'
        }

        if self.institution_token:
            headers['X-Institution-Token'] = self.institution_token

        response = requests.get(url, params=params, headers=headers)

        if response.status_code == 429:
            raise Exception("Rate limit exceeded")
        elif response.status_code == 401:
            raise Exception("Invalid API credentials")
        elif response.status_code == 403:
            raise Exception("Access forbidden - check subscription")
        elif response.status_code == 404:
            raise Exception("Resource not found")

        response.raise_for_status()
        return response.json()

    def search_articles(self, query: str, **kwargs) -> Dict:
        params = {
            'q': query,
            'limit': kwargs.get('page_size', 25),
            'offset': (kwargs.get('page', 1) - 1) * kwargs.get('page_size', 25),
            'sort': kwargs.get('sort', 'relevance')
        }

        # Add optional filters
        if kwargs.get('date'):
            params['date'] = kwargs['date']
        if kwargs.get('subject'):
            params['subject'] = kwargs['subject']
        if kwargs.get('author'):
            params['author'] = kwargs['author']
        if kwargs.get('journal'):
            params['journal'] = kwargs['journal']
        if kwargs.get('open_access'):
            params['openAccess'] = 'true'

        url = f"{self.base_url}/search"
        data = self.make_request(url, params)

        return {
            'total': data.get('totalResults', 0),
            'articles': [self.parse_article_data(article) for article in data.get('articles', [])],
            'page': kwargs.get('page', 1),
            'page_size': kwargs.get('page_size', 25)
        }

    def parse_article_data(self, article_data: Dict) -> Dict:
        return {
            'doi': article_data.get('doi'),
            'title': article_data.get('title'),
            'authors': article_data.get('authors', []),
            'publication_name': article_data.get('publicationName'),
            'volume': article_data.get('volume'),
            'issue': article_data.get('issue'),
            'page_range': article_data.get('pageRange'),
            'publication_date': article_data.get('publicationDate'),
            'abstract': article_data.get('abstract'),
            'keywords': article_data.get('keywords', []),
            'subjects': article_data.get('subjects', []),
            'open_access': article_data.get('openAccess', False),
            'available': article_data.get('available', False),
            'citations': article_data.get('citations', 0),
            'references': article_data.get('references', []),
            'pdf_url': article_data.get('pdfUrl'),
            'html_url': article_data.get('htmlUrl')
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
            subject,
            page_size=200,
            sort='relevance'
        )

        journal_counts = {}
        for article in result['articles']:
            journal = article.get('publication_name', 'Unknown')
            if journal != 'Unknown':
                journal_counts[journal] = journal_counts.get(journal, 0) + 1

        # Sort by count and return top journals
        top_journals = sorted(journal_counts.items(), key=lambda x: x[1], reverse=True)[:limit]

        return [{'journal': journal, 'article_count': count} for journal, count in top_journals]

    def analyze_citation_networks(self, doi_list: List[str]) -> Dict:
        """Analyze citation networks for a list of articles"""
        citation_data = {}

        for doi in doi_list:
            try:
                # Get article with citations and references
                result = self.make_request(
                    f"{self.base_url}/article/{quote_plus(doi)}",
                    params={'view': 'full'}
                )

                article_data = self.parse_article_data(result)
                citation_data[doi] = {
                    'title': article_data['title'],
                    'citations': article_data.get('citations', 0),
                    'references_count': len(article_data.get('references', [])),
                    'open_access': article_data.get('open_access', False),
                    'subjects': article_data.get('subjects', [])
                }

                time.sleep(0.3)  # Rate limiting

            except Exception as e:
                print(f"Error analyzing citations for {doi}: {e}")
                citation_data[doi] = {'error': str(e)}

        return citation_data

    def check_open_access_availability(self, doi_list: List[str]) -> Dict:
        """Check open access status for multiple articles"""
        oa_status = {}

        for doi in doi_list:
            try:
                result = self.make_request(
                    f"{self.base_url}/openaccess/{quote_plus(doi)}"
                )

                oa_status[doi] = {
                    'open_access': result.get('openAccess', False),
                    'license': result.get('license'),
                    'available_from': result.get('availableFrom'),
                    'embargo_period': result.get('embargoPeriod')
                }

                time.sleep(0.2)  # Rate limiting

            except Exception as e:
                print(f"Error checking OA status for {doi}: {e}")
                oa_status[doi] = {
                    'open_access': False,
                    'error': str(e)
                }

        return oa_status

# Usage
wiley_api = WileyAPI('your-api-key', 'your-institution-token')

# Search for articles
result = wiley_api.search_articles('machine learning', page_size=10)
print(f"Found {result['total']} articles")

# Analyze trends
trends = wiley_api.analyze_research_trends(['machine learning', 'deep learning'], 2020, 2023)
for topic, trend_data in trends.items():
    print(f"{topic}: {trend_data}")

# Discover top journals
journals = wiley_api.discover_top_journals('Computer Science', limit=10)
for journal in journals:
    print(f"- {journal['journal']}: {journal['article_count']} articles")
```

## Data Models

### Article Object Structure
```json
{
  "doi": "10.1002/sml.1234",
  "title": "Advanced Machine Learning Applications in Environmental Science",
  "authors": [
    {
      "name": "Smith, John",
      "orcid": "0000-0002-1825-0097",
      "affiliations": ["University of Example"]
    }
  ],
  "affiliations": [
    {
      "name": "University of Example",
      "country": "USA",
      "rorId": "https://ror.org/123456789"
    }
  ],
  "publicationName": "Statistical Methods in Learning",
  "volume": "15",
  "issue": "2",
  "pageRange": "123-145",
  "publicationDate": "2023-12-01",
  "abstract": "This paper presents novel applications of machine learning...",
  "keywords": ["machine learning", "environmental science", "statistical analysis"],
  "subjects": ["Computer Science", "Environmental Science"],
  "openAccess": false,
  "available": true,
  "citations": 42,
  "references": [
    {
      "doi": "10.1002/env.5678",
      "title": "Previous related work",
      "authors": ["Doe, Jane"]
    }
  ],
  "pdfUrl": "https://onlinelibrary.wiley.com/doi/pdf/10.1002/sml.1234",
  "htmlUrl": "https://onlinelibrary.wiley.com/doi/10.1002/sml.1234",
  "doiLink": "https://doi.org/10.1002/sml.1234",
  "metrics": {
    "views": 1250,
    "downloads": 320,
    "altmetricScore": 45
  },
  "funding": [
    {
      "agency": "National Science Foundation",
      "grantNumber": "NSF-123456"
    }
  ]
}
```

### Journal Object Structure
```json
{
  "issn": "1556-2724",
  "title": "Statistical Methods in Learning",
  "publisher": "Wiley",
  "subjects": ["Computer Science", "Statistics"],
  "description": "A leading journal in machine learning and statistical methods...",
  "aimsAndScope": "The journal publishes research on theoretical and applied aspects...",
  "impactFactor": 4.234,
  "openAccess": false,
  "articleCount": 156,
  "frequency": "Monthly",
  "homepage": "https://onlinelibrary.wiley.com/journal/15562724"
}
```

## Common Use Cases

### 1. Research Trend Analysis
```javascript
// Track research trends over time
async function analyzeWileyTrends(topic, yearRange) {
  const trends = {};

  for (const year of yearRange) {
    const result = await wiley.searchArticles(topic, {
      date: year.toString(),
      pageSize: 1
    });
    trends[year] = result.total;
  }

  return trends;
}

// Usage
const trends = await analyzeWileyTrends('artificial intelligence', [2019, 2020, 2021, 2022, 2023]);
console.log('Research trends:', trends);
```

### 2. Open Access Discovery
```python
# Find open access articles on a specific topic
def find_open_access_articles(topic, limit=50):
    result = wiley_api.search_articles(
        topic,
        page_size=limit,
        open_access=True
    )

    open_access_articles = []
    for article in result['articles']:
        if article['open_access']:
            open_access_articles.append({
                'title': article['title'],
                'doi': article['doi'],
                'publication_date': article['publication_date'],
                'subjects': article['subjects']
            })

    return open_access_articles

# Usage
oa_articles = find_open_access_articles('climate change modeling', limit=20)
print(f"Found {len(oa_articles)} open access articles")
```

### 3. Journal Impact Analysis
```javascript
// Analyze journal performance in a specific field
async function analyzeJournalPerformance(subject, limit = 10) {
  const result = await wiley.searchArticles(subject, {
    pageSize: 500,
    sort: 'relevance'
  });

  const journalStats = {};

  result.articles.forEach(article => {
    const journal = article.publicationName;
    if (!journalStats[journal]) {
      journalStats[journal] = {
        count: 0,
        totalCitations: 0,
        openAccessCount: 0,
        subjects: new Set()
      };
    }

    journalStats[journal].count++;
    journalStats[journal].totalCitations += article.citations || 0;
    if (article.openAccess) journalStats[journal].openAccessCount++;
    article.subjects.forEach(s => journalStats[journal].subjects.add(s));
  });

  // Convert Sets to arrays and calculate averages
  const journals = Object.entries(journalStats).map(([journal, stats]) => ({
    journal,
    articleCount: stats.count,
    averageCitations: stats.totalCitations / stats.count,
    openAccessPercentage: (stats.openAccessCount / stats.count) * 100,
    subjects: Array.from(stats.subjects)
  }));

  return journals.sort((a, b) => b.articleCount - a.articleCount).slice(0, limit);
}
```

### 4. Citation Network Analysis
```python
# Build citation networks for research papers
def build_citation_network(doi_list, depth=1):
    network = {
        'nodes': [],
        'edges': []
    }

    processed_dois = set()

    def process_article(doi, level=0):
        if doi in processed_dois or level > depth:
            return

        processed_dois.add(doi)

        try:
            article_data = wiley_api.make_request(
                f"{wiley_api.base_url}/article/{quote_plus(doi)}",
                params={'view': 'full'}
            )

            article = wiley_api.parse_article_data(article_data)

            # Add node
            network['nodes'].append({
                'id': doi,
                'title': article['title'],
                'authors': article['authors'],
                'year': article['publication_date'][:4] if article['publication_date'] else 'Unknown',
                'subjects': article['subjects']
            })

            # Process references
            for ref in article.get('references', []):
                ref_doi = ref.get('doi')
                if ref_doi:
                    network['edges'].append({
                        'source': doi,
                        'target': ref_doi,
                        'type': 'cites'
                    })

                    if level < depth:
                        process_article(ref_doi, level + 1)

            time.sleep(0.3)  # Rate limiting

        except Exception as e:
            print(f"Error processing {doi}: {e}")

    # Start with seed DOIs
    for doi in doi_list:
        process_article(doi)

    return network

# Usage
network = build_citation_network(['10.1002/sml.1234', '10.1002/env.5678'], depth=2)
print(f"Network has {len(network['nodes'])} nodes and {len(network['edges'])} edges")
```

## Best Practices

1. **Check access rights** - Verify subscription access before requesting full text
2. **Respect rate limits** - Implement appropriate delays between requests (200-500ms)
3. **Cache results** - Store frequently accessed metadata locally to reduce API calls
4. **Handle access restrictions** - Gracefully handle permission-based denials
5. **Use specific queries** - Narrow searches for better performance and relevance
6. **Monitor quotas** - Track API usage against institutional limits
7. **Batch operations** - Group related requests to minimize overhead
8. **Implement error handling** - Handle rate limiting, timeouts, and temporary failures
9. **Use open access content** - Prioritize open access articles to maximize accessibility
10. **Document API usage** - Keep track of query patterns and success rates

## Error Handling

```javascript
async function robustWileyRequest(api, requestFunction, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await requestFunction();
    } catch (error) {
      if (error.message.includes('429')) {
        // Rate limit exceeded - implement exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (error.message.includes('403')) {
        // Access denied - may need to check subscription
        throw new Error('Subscription access required for this content');
      }
      if (error.message.includes('404')) {
        throw new Error('Resource not found - check DOI or other identifier');
      }
      if (error.message.includes('401')) {
        throw new Error('Invalid API credentials');
      }
      if (attempt === retries - 1) throw error;
      // General retry delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}
```

```python
def robust_wiley_request(wiley_api, request_func, max_retries=3):
    """Make a robust request with retry logic"""
    for attempt in range(max_retries):
        try:
            return request_func()
        except Exception as e:
            if "429" in str(e):
                # Rate limit - exponential backoff
                delay = (2 ** attempt) * 1.0
                time.sleep(delay)
                continue
            elif "403" in str(e):
                raise Exception("Subscription access required for this content")
            elif "404" in str(e):
                raise Exception("Resource not found - check DOI or identifier")
            elif "401" in str(e):
                raise Exception("Invalid API credentials")
            elif attempt == max_retries - 1:
                raise e
            time.sleep(0.5)
```

## Alternatives

- **ScienceDirect API** - For Elsevier content access
- **Springer Nature API** - For Springer Nature publications
- **Taylor & Francis API** - For Taylor & Francis content
- **OpenAlex API** - For comprehensive scholarly data
- **Crossref API** - For DOI metadata and citation tracking
- **PubMed API** - For biomedical literature
- **arXiv API** - For preprint access
- **Scopus API** - For citation and bibliographic data
- **Web of Science API** - For comprehensive citation analysis

## Support

- **API Documentation:** https://onlinelibrary.wiley.com/library-info/resources/text-and-datamining
- **Developer Portal:** https://onlinelibrary.wiley.com/
- **API Key Registration:** https://onlinelibrary.wiley.com/library-info/resources/text-and-datamining/api-access
- **Terms of Service:** https://onlinelibrary.wiley.com/library-info/terms
- **Support Center:** https://onlinelibrary.wiley.com/page/contact-us
- **Open Access Information:** https://onlinelibrary.wiley.com/library-info/open-access
- **FAQ:** https://onlinelibrary.wiley.com/library-info/faq
- **Documentation Portal:** https://onlinelibrary.wiley.com/library-info/resources

---

*Last updated: 2025-10-27*
