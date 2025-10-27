# Taylor & Francis API Documentation

**Category:** Publisher Platform
**Data Type:** Articles, journals, books, metadata
**API Type:** REST API
**Authentication:** API key required (institutional subscription)
**Rate Limits:** Varies by subscription level

## Overview

Taylor & Francis is one of the world's leading academic publishers, providing access to over 5 million publications across humanities, social sciences, science, technology, engineering, and medicine (STEM). Their API provides programmatic access to scholarly metadata, search capabilities, and content retrieval for institutional researchers and developers.

## Key Features

- **Comprehensive metadata** for 5+ million scholarly works
- **Cross-disciplinary coverage** from humanities to STEM
- **Advanced search capabilities** with faceted filtering
- **Content access** through institutional subscriptions
- **Full-text retrieval** for subscribed content
- **Citation metadata** and reference linking
- **Author and affiliation information**
- **Journal and book series metadata**

## Statistics

- **5+ million publications** across all disciplines
- **2,700+ journals** in humanities, social sciences, and STEM
- **150,000+ books** and reference works
- **100+ subject areas** covered
- **200+ countries** represented in authorship

## Documentation

- **API Documentation:** https://taylorandfrancis.com/partners/apis/
- **Developer Portal:** https://taylorandfrancis.com/partners/
- **Main Platform:** https://taylorandfrancis.com/
- **Support Center:** https://taylorandfrancis.com/help/contact/
- **Content Guidelines:** https://taylorandfrancis.com/policies/open-access-policies/

## Authentication

Taylor & Francis API requires authentication through institutional subscription:

- **API Key:** Required for all requests
- **Institutional Access:** Most functionality requires institutional subscription
- **OAuth 2.0:** Available for enterprise integrations
- **IP-based Authentication:** Alternative for institutional access

### API Key Setup

1. Register through Taylor & Francis developer portal
2. Provide institutional affiliation details
3. Receive API key and documentation
4. Configure API key in request headers

## Rate Limits

Rate limits vary by subscription type:

- **Basic Access:** 1,000 requests per day
- **Premium Access:** 10,000 requests per day
- **Enterprise Access:** Custom limits available
- **Rate Limit Headers:** Included in API responses
- **Burst Limits:** Additional restrictions apply

**Important:** Rate limits are shared across all API endpoints for your institution.

## API Endpoints

### Content Search
```bash
# Search articles
GET https://api.tandfonline.com/content/articles
?query=machine%20learning&subject=Computer%20Science&rows=20

# Search by DOI
GET https://api.tandfonline.com/content/doi/10.1080/02699206.2021.1872345

# Advanced search with filters
GET https://api.tandfonline.com/content/search
?query=artificial%20intelligence&publication-year=2023&article-type=Research%20Article
```

### Journal Information
```bash
# Get journal details
GET https://api.tandfonline.com/content/journals/14679965

# List journal issues
GET https://api.tandfonline.com/content/journals/14679965/issues

# Get issue contents
GET https://api.tandfonline.com/content/journals/14679965/volume-23/issue-4
```

### Author and Affiliation Data
```bash
# Search authors
GET https://api.tandfonline.com/content/authors?name=John%20Smith&institution=University

# Get author publications
GET https://api.tandfonline.com/content/authors/123456/publications
```

### Citation Metadata
```bash
# Get article references
GET https://api.tandfonline.com/content/references/10.1080/02699206.2021.1872345

# Get citing articles
GET https://api.tandfonline.com/content/citing/10.1080/02699206.2021.1872345
```

## Implementation Examples

### Basic Article Search (JavaScript)
```javascript
class TaylorFrancisAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.tandfonline.com/content';
    this.rateLimitDelay = 100; // 100ms between requests
    this.lastRequest = 0;
  }

  async makeRequest(endpoint, params = {}) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLast = now - this.lastRequest;

    if (timeSinceLast < this.rateLimitDelay) {
      await new Promise(resolve =>
        setTimeout(resolve, this.rateLimitDelay - timeSinceLast)
      );
    }

    this.lastRequest = Date.now();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.keys(params).forEach(key =>
      url.searchParams.append(key, params[key])
    );

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'AcademicExplorer/1.0 (mailto:your-email@institution.edu)'
      }
    });

    if (!response.ok) {
      throw new Error(`Taylor & Francis API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchArticles(query, options = {}) {
    const params = {
      query,
      rows: 20,
      ...options
    };

    return this.makeRequest('/articles', params);
  }

  async getArticleByDOI(doi) {
    return this.makeRequest(`/doi/${encodeURIComponent(doi)}`);
  }

  async getJournalDetails(journalId) {
    return this.makeRequest(`/journals/${journalId}`);
  }
}

// Usage example
const api = new TaylorFrancisAPI('your-api-key-here');

api.searchArticles('machine learning in education', {
  subject: 'Education',
  'publication-year': 2023,
  'article-type': 'Research Article'
}).then(results => {
  console.log(`Found ${results.total} articles`);
  results.articles.forEach(article => {
    console.log(`${article.title} - ${article.journal}`);
    console.log(`Authors: ${article.authors.map(a => a.name).join(', ')}`);
    console.log(`DOI: ${article.doi}`);
    console.log('---');
  });
});
```

### Advanced Content Analysis (Python)
```python
import requests
import time
from typing import Dict, List, Optional

class TaylorFrancisAPI:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.tandfonline.com/content"
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Accept': 'application/json',
            'User-Agent': 'AcademicExplorer/1.0 (mailto:your-email@institution.edu)'
        })
        self.last_request = 0
        self.min_interval = 0.1  # 100ms between requests

    def _rate_limit(self):
        """Implement rate limiting"""
        now = time.time()
        time_since_last = now - self.last_request

        if time_since_last < self.min_interval:
            time.sleep(self.min_interval - time_since_last)

        self.last_request = time.time()

    def search_articles(self, query: str, **kwargs) -> Dict:
        """Search for articles with advanced filtering"""
        self._rate_limit()

        params = {'query': query, **kwargs}
        response = self.session.get(f"{self.base_url}/articles", params=params)
        response.raise_for_status()

        return response.json()

    def get_article_metadata(self, doi: str) -> Dict:
        """Get complete metadata for a specific article"""
        self._rate_limit()

        response = self.session.get(f"{self.base_url}/doi/{doi}")
        response.raise_for_status()

        return response.json()

    def get_journal_issues(self, journal_id: str, year: Optional[int] = None) -> List[Dict]:
        """Get journal issues, optionally filtered by year"""
        self._rate_limit()

        params = {}
        if year:
            params['year'] = year

        response = self.session.get(f"{self.base_url}/journals/{journal_id}/issues", params=params)
        response.raise_for_status()

        return response.json()['issues']

    def analyze_subject_coverage(self, subject: str, years: List[int]) -> Dict:
        """Analyze publication trends for a subject over time"""
        coverage_data = {}

        for year in years:
            try:
                results = self.search_articles(
                    query="",  # Empty query to get all content
                    subject=subject,
                    'publication-year': year,
                    rows=1000
                )

                coverage_data[year] = {
                    'total_articles': results.get('total', 0),
                    'open_access': len([a for a in results.get('articles', []) if a.get('open_access')]),
                    'article_types': {}
                }

                # Analyze article types
                for article in results.get('articles', []):
                    article_type = article.get('article_type', 'Unknown')
                    coverage_data[year]['article_types'][article_type] = \
                        coverage_data[year]['article_types'].get(article_type, 0) + 1

            except Exception as e:
                print(f"Error analyzing {subject} for {year}: {e}")
                coverage_data[year] = {'error': str(e)}

        return coverage_data

# Usage example
api = TaylorFrancisAPI('your-api-key-here')

# Analyze computer science publication trends
cs_trends = api.analyze_subject_coverage(
    subject='Computer Science',
    years=[2020, 2021, 2022, 2023]
)

for year, data in cs_trends.items():
    if 'error' not in data:
        print(f"{year}: {data['total_articles']} articles, {data['open_access']} open access")
```

### Content Access and Text Mining
```javascript
class ContentAnalyzer {
  constructor(api) {
    this.api = api;
  }

  async performTextMining(doi, analysisType = 'keywords') {
    // Get article metadata and abstract
    const article = await this.api.getArticleByDOI(doi);

    if (!article.abstract) {
      throw new Error('No abstract available for text mining');
    }

    switch (analysisType) {
      case 'keywords':
        return this.extractKeywords(article);
      case 'entities':
        return this.extractEntities(article);
      case 'topics':
        return this.extractTopics(article);
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
  }

  extractKeywords(article) {
    // Simple keyword extraction from title and abstract
    const text = `${article.title} ${article.abstract}`.toLowerCase();

    // Common academic stop words
    const stopWords = new Set([
      'the', 'and', 'of', 'in', 'to', 'a', 'is', 'for', 'are', 'with',
      'as', 'by', 'at', 'on', 'or', 'that', 'this', 'it', 'from', 'be',
      'an', 'will', 'can', 'have', 'has', 'had', 'was', 'were', 'been'
    ]);

    // Extract phrases (2-3 words) and single words
    const words = text.match(/\b[a-z]+\b/g) || [];
    const phrases = [];

    // Extract 3-word phrases
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = `${words[i]} ${words[i+1]} ${words[i+2]}`;
      if (!stopWords.has(words[i]) && !stopWords.has(words[i+1]) && !stopWords.has(words[i+2])) {
        phrases.push(phrase);
      }
    }

    // Count frequency
    const frequency = {};
    phrases.forEach(phrase => {
      frequency[phrase] = (frequency[phrase] || 0) + 1;
    });

    // Sort by frequency and return top keywords
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([phrase, count]) => ({ keyword: phrase, frequency: count }));
  }

  async analyzeJournalTrends(journalId, years = 3) {
    const currentYear = new Date().getFullYear();
    const trends = {};

    for (let year = currentYear - years; year <= currentYear; year++) {
      try {
        const issues = await this.api.makeRequest(`/journals/${journalId}/issues`, { year });

        let totalArticles = 0;
        let openAccessCount = 0;
        const subjectAreas = {};

        for (const issue of issues.issues || []) {
          const issueContent = await this.api.makeRequest(`/journals/${journalId}/issues/${issue.id}`);

          for (const article of issueContent.articles || []) {
            totalArticles++;
            if (article.open_access) openAccessCount++;

            const subject = article.subject_area || 'Unknown';
            subjectAreas[subject] = (subjectAreas[subject] || 0) + 1;
          }
        }

        trends[year] = {
          totalArticles,
          openAccessCount,
          openAccessPercentage: totalArticles > 0 ? (openAccessCount / totalArticles * 100).toFixed(1) : 0,
          subjectAreas
        };

      } catch (error) {
        console.error(`Error analyzing ${journalId} for ${year}:`, error);
        trends[year] = { error: error.message };
      }
    }

    return trends;
  }
}

// Usage example
const analyzer = new ContentAnalyzer(api);

// Extract keywords from an article
analyzer.performTextMining('10.1080/02699206.2021.1872345', 'keywords')
  .then(keywords => {
    console.log('Top keywords:');
    keywords.forEach(({ keyword, frequency }) => {
      console.log(`${keyword}: ${frequency}`);
    });
  });
```

## Data Models

### Article Object
```json
{
  "doi": "10.1080/02699206.2021.1872345",
  "title": "Machine Learning Applications in Speech-Language Pathology",
  "abstract": "This paper explores the integration of machine learning techniques...",
  "authors": [
    {
      "name": "John Smith",
      "orcid": "0000-0002-1234-5678",
      "affiliation": "University of Technology",
      "corresponding": true
    }
  ],
  "journal": {
    "id": "14679965",
    "title": "International Journal of Speech-Language Pathology",
    "issn": "1467-9965",
    "publisher": "Taylor & Francis"
  },
  "publication_date": "2021-02-15",
  "volume": "23",
  "issue": "4",
  "pages": "345-356",
  "article_type": "Research Article",
  "subject_areas": ["Health Sciences", "Computer Science"],
  "keywords": ["machine learning", "speech pathology", "clinical applications"],
  "open_access": false,
  "license": null,
  "references_count": 42,
  "citations_count": 15,
  "download_url": "https://www.tandfonline.com/doi/pdf/10.1080/02699206.2021.1872345"
}
```

### Journal Object
```json
{
  "id": "14679965",
  "title": "International Journal of Speech-Language Pathology",
  "issn_print": "1467-9965",
  "issn_electronic": "1740-7350",
  "publisher": "Taylor & Francis",
  "subject_areas": ["Health Sciences", "Medicine"],
  "description": "A leading journal in speech-language pathology research...",
  "open_access_options": {
    "hybrid": true,
    "fully_open_access": false
  },
  "aims_scope": "The journal publishes original research on...",
  "editorial_board": [
    {
      "name": "Dr. Jane Johnson",
      "role": "Editor-in-Chief",
      "affiliation": "University Medical Center"
    }
  ],
  "metrics": {
    "impact_factor": 2.456,
    "citescore": 3.2,
    "acceptance_rate": 0.25
  }
}
```

### Author Object
```json
{
  "id": "author_123456",
  "name": "John Smith",
  "orcid": "0000-0002-1234-5678",
  "affiliations": [
    {
      "name": "University of Technology",
      "department": "Computer Science",
      "country": "USA"
    }
  ],
  "publication_count": 15,
  "citations_count": 245,
  "h_index": 8,
  "research_interests": ["Machine Learning", "Natural Language Processing", "Healthcare"],
  "profile_url": "https://www.tandfonline.com/action/journalInformation?show=authorDetails"
}
```

## Common Use Cases

### Bibliometric Analysis
```javascript
async function performBibliometricAnalysis(subject, years = 5) {
  const api = new TaylorFrancisAPI('your-api-key');
  const analysis = {
    totalPublications: 0,
    yearlyTrends: {},
    topJournals: {},
    authorCollaboration: {},
    openAccessTrends: {}
  };

  const currentYear = new Date().getFullYear();

  for (let year = currentYear - years; year <= currentYear; year++) {
    const results = await api.searchArticles('', {
      subject: subject,
      'publication-year': year,
      rows: 1000
    });

    const yearData = {
      publications: results.total || 0,
      openAccess: 0,
      journals: {},
      authors: {}
    };

    results.articles?.forEach(article => {
      // Count open access
      if (article.open_access) yearData.openAccess++;

      // Track journals
      const journal = article.journal?.title || 'Unknown';
      yearData.journals[journal] = (yearData.journals[journal] || 0) + 1;

      // Track authors
      article.authors?.forEach(author => {
        const authorName = author.name;
        yearData.authors[authorName] = (yearData.authors[authorName] || 0) + 1;
      });
    });

    analysis.yearlyTrends[year] = yearData;
    analysis.totalPublications += yearData.publications;
  }

  // Calculate top journals across all years
  const allJournals = {};
  Object.values(analysis.yearlyTrends).forEach(yearData => {
    Object.entries(yearData.journals).forEach(([journal, count]) => {
      allJournals[journal] = (allJournals[journal] || 0) + count;
    });
  });

  analysis.topJournals = Object.entries(allJournals)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([journal, count]) => ({ journal, count }));

  return analysis;
}

// Usage example
performBibliometricAnalysis('Computer Science', 5).then(analysis => {
  console.log(`Total publications: ${analysis.totalPublications}`);
  console.log('Top journals:');
  analysis.topJournals.forEach(({ journal, count }) => {
    console.log(`${journal}: ${count} publications`);
  });
});
```

### Content Recommendation System
```javascript
class ContentRecommender {
  constructor(api) {
    this.api = api;
    this.userHistory = new Map();
  }

  async getRecommendations(userInterests, limit = 10) {
    const recommendations = [];

    // Search for articles in each interest area
    for (const interest of userInterests) {
      try {
        const results = await this.api.searchArticles(interest, {
          rows: Math.ceil(limit / userInterests.length),
          'publication-year': 2023,
          'article-type': 'Research Article'
        });

        results.articles?.forEach(article => {
          recommendations.push({
            ...article,
            relevanceScore: this.calculateRelevanceScore(article, interest),
            matchedInterest: interest
          });
        });
      } catch (error) {
        console.error(`Error searching for ${interest}:`, error);
      }
    }

    // Sort by relevance score and return top recommendations
    return recommendations
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  calculateRelevanceScore(article, interest) {
    let score = 0;
    const interestTerms = interest.toLowerCase().split(' ');

    // Check title match
    const title = article.title?.toLowerCase() || '';
    interestTerms.forEach(term => {
      if (title.includes(term)) score += 3;
    });

    // Check abstract match
    const abstract = article.abstract?.toLowerCase() || '';
    interestTerms.forEach(term => {
      const matches = (abstract.match(new RegExp(term, 'g')) || []).length;
      score += matches;
    });

    // Check keywords match
    article.keywords?.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      interestTerms.forEach(term => {
        if (keywordLower.includes(term)) score += 2;
      });
    });

    // Boost for recent publications
    const pubYear = parseInt(article.publication_date?.split('-')[0] || 2020);
    const currentYear = new Date().getFullYear();
    const recencyBoost = Math.max(0, currentYear - pubYear) / 5;
    score += recencyBoost;

    // Boost for open access
    if (article.open_access) score += 1;

    return score;
  }

  async updateUserFeedback(userId, articleId, feedback) {
    // Record user feedback to improve future recommendations
    if (!this.userHistory.has(userId)) {
      this.userHistory.set(userId, []);
    }

    this.userHistory.get(userId).push({
      articleId,
      feedback, // 'like', 'dislike', 'view'
      timestamp: new Date().toISOString()
    });
  }
}

// Usage example
const recommender = new ContentRecommender(api);

recommender.getRecommendations([
  'machine learning',
  'natural language processing',
  'artificial intelligence ethics'
]).then(recommendations => {
  console.log('Recommended articles:');
  recommendations.forEach((article, index) => {
    console.log(`${index + 1}. ${article.title}`);
    console.log(`   Relevance Score: ${article.relevanceScore.toFixed(2)}`);
    console.log(`   Matched Interest: ${article.matchedInterest}`);
    console.log('---');
  });
});
```

## Best Practices

1. **Always include API key** in request headers
2. **Implement rate limiting** with appropriate delays between requests
3. **Cache responses** to reduce API calls and improve performance
4. **Handle authentication errors** gracefully (expired keys, access issues)
5. **Use specific query parameters** to filter results and reduce response sizes
6. **Respect copyright** when accessing and using content
7. **Monitor usage quotas** to avoid hitting rate limits
8. **Implement retry logic** for network failures and temporary errors

## Error Handling

```javascript
class TaylorFrancisAPIHandler {
  constructor(apiKey) {
    this.api = new TaylorFrancisAPI(apiKey);
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  async safeApiCall(apiFunction, ...args) {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await apiFunction.call(this.api, ...args);
        return { success: true, data: result };
      } catch (error) {
        if (this.isRetryableError(error) && attempt < this.maxRetries - 1) {
          console.log(`Attempt ${attempt + 1} failed, retrying...`);
          await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
          continue;
        }

        return {
          success: false,
          error: {
            message: error.message,
            type: this.getErrorType(error),
            attempt: attempt + 1
          }
        };
      }
    }
  }

  isRetryableError(error) {
    // Retry on network errors and rate limiting
    return error.message.includes('rate limit') ||
           error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.status >= 500; // Server errors
  }

  getErrorType(error) {
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      return 'AUTHENTICATION_ERROR';
    } else if (error.message.includes('403') || error.message.includes('forbidden')) {
      return 'AUTHORIZATION_ERROR';
    } else if (error.message.includes('429') || error.message.includes('rate limit')) {
      return 'RATE_LIMIT_ERROR';
    } else if (error.message.includes('404')) {
      return 'NOT_FOUND_ERROR';
    } else {
      return 'UNKNOWN_ERROR';
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async batchRequest(requests) {
    const results = [];

    for (const request of requests) {
      const result = await this.safeApiCall(
        this.api[request.method],
        ...request.args
      );

      results.push({
        id: request.id,
        ...result
      });

      // Add delay between requests to respect rate limits
      await this.delay(100);
    }

    return results;
  }
}

// Usage example
const handler = new TaylorFrancisAPIHandler('your-api-key');

const batchRequests = [
  {
    id: 'search1',
    method: 'searchArticles',
    args: ['machine learning', { rows: 10 }]
  },
  {
    id: 'article1',
    method: 'getArticleByDOI',
    args: ['10.1080/02699206.2021.1872345']
  }
];

handler.batchRequest(batchRequests).then(results => {
  results.forEach(result => {
    if (result.success) {
      console.log(`Success for ${result.id}:`, result.data);
    } else {
      console.error(`Error for ${result.id}:`, result.error);
    }
  });
});
```

## Rate Limit Optimization

```javascript
class RateLimitedAPI extends TaylorFrancisAPI {
  constructor(apiKey, requestsPerSecond = 10) {
    super(apiKey);
    this.requestsPerSecond = requestsPerSecond;
    this.requestQueue = [];
    this.processing = false;
  }

  async makeRequest(endpoint, params = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        endpoint,
        params,
        resolve,
        reject
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    this.processing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();

      try {
        const result = await super.makeRequest(request.endpoint, request.params);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }

      // Wait before next request
      await new Promise(resolve => setTimeout(resolve, 1000 / this.requestsPerSecond));
    }

    this.processing = false;
  }

  async burstRequest(requests) {
    // For small batches, allow burst requests within limits
    const batchSize = Math.min(requests.length, this.requestsPerSecond);
    const batch = requests.slice(0, batchSize);

    const promises = batch.map(req =>
      super.makeRequest(req.endpoint, req.params)
    );

    try {
      const results = await Promise.all(promises);

      // If there are more requests, wait before processing them
      if (requests.length > batchSize) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const remainingResults = await this.burstRequest(requests.slice(batchSize));
        return [...results, ...remainingResults];
      }

      return results;
    } catch (error) {
      console.error('Batch request failed:', error);
      throw error;
    }
  }
}
```

## Alternatives

- **Springer Nature API** - Similar publisher platform with strong STEM coverage
- **Wiley API** - Another major academic publisher
- **Elsevier APIs** - Comprehensive science and medical content
- **OpenAlex API** - Free, comprehensive scholarly metadata across all publishers
- **Crossref API** - DOI metadata and citation linking
- **Semantic Scholar API** - AI-powered academic search and recommendations

## Support and Resources

- **Developer Portal:** https://taylorandfrancis.com/partners/apis/
- **Technical Support:** api-support@taylorandfrancis.com
- **Institutional Access:** Contact your library for API access
- **Documentation:** Available after developer registration
- **Sample Code:** GitHub repositories and documentation examples
- **API Status:** Available through developer portal
- **Community Forums:** Taylor & Francis developer community

## Content Access Policies

- **Copyright Compliance:** All API usage must respect copyright
- **Text Mining:** Specific agreements required for large-scale text mining
- **Institutional Licenses:** Most content requires institutional subscription
- **Fair Use:** Research use typically falls under fair use provisions
- **Commercial Use:** Additional licensing may be required

---

*Last updated: 2025-10-27*