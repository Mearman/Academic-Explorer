# DOAJ API Documentation

**Category:** Open Access Journals
**Data Type:** Journal metadata, article metadata
**API Type:** REST API
**Authentication:** API key required for some operations
**Rate Limits:** Standard usage limits apply

## Overview

DOAJ (Directory of Open Access Journals) is a community-curated online directory that indexes and provides access to high-quality, open access, peer-reviewed journals. The API enables programmatic access to journal metadata, article information, and other data to help researchers discover and evaluate open access journals across all academic disciplines.

## Key Features

- **20,000+ open access journals** from 130+ countries
- **Quality controlled** through independent editorial board
- **Comprehensive journal metadata** including licensing, APC information, and peer review process
- **Article metadata** with DOI links and full-text access information
- **Advanced search capabilities** across journal and article data
- **Subject classification** using Library of Congress Subject Headings (LCSH)
- **Language support** for journals in multiple languages
- **Regular updates** with new journals and articles added daily

## Documentation

- **API Documentation:** https://doaj.org/api/docs
- **API Endpoint:** https://doaj.org/api/v1/
- **Main Site:** https://doaj.org/
- **Developer Guide:** https://doaj.org/api/docs#!/docs
- **GitHub Repository:** https://github.com/DOAJ/doajAPI

## Authentication

- **API key optional** for most basic read operations
- **API key required** for higher rate limits and write operations
- **API keys available** through DOAJ developer registration
- **Bearer token authentication** for premium features
- **IP whitelisting** available for institutional access

## Rate Limits

- **Public access:** 100 requests per hour per IP
- **Authenticated access:** 1,000 requests per hour per API key
- **Premium access:** 10,000+ requests per hour for institutional partners
- **Rate limit headers** included in API responses
- **Implement backoff strategies** for rate limit handling

## API Endpoints

### Journals
```bash
# Get all journals
https://doaj.org/api/v1/journals?pageSize=10&page=1

# Search journals
https://doaj.org/api/v1/search/journals?query=machine+learning&pageSize=20

# Get specific journal by ISSN
https://doaj.org/api/v1/journal/issn/1234-5678

# Get journals by subject
https://doaj.org/api/v1/search/journals?field=Computer+Science
```

### Articles
```bash
# Get recent articles
https://doaj.org/api/v1/articles?pageSize=10&page=1

# Search articles
https://doaj.org/api/v1/search/articles?q=machine+learning&pageSize=20

# Get articles by journal
https://doaj.org/api/v1/search/articles?issn=1234-5678
```

## Implementation Examples

### Journal Discovery (JavaScript)
```javascript
class DOAJAPI {
  constructor(apiKey = null) {
    this.baseURL = 'https://doaj.org/api/v1';
    this.apiKey = apiKey;
    this.requestDelay = 3600; // 1 hour for basic, 3.6s for authenticated
    this.lastRequest = 0;
  }

  async makeRequest(url, options = {}) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLast = now - this.lastRequest;
    if (timeSinceLast < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLast));
    }
    this.lastRequest = Date.now();

    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'AcademicExplorer/1.0 (mailto:your-email@example.com)'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      headers,
      ...options
    });

    if (!response.ok) {
      throw new Error(`DOAJ API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Handle rate limit headers
    if (response.headers.get('x-ratelimit-remaining')) {
      this.remainingRequests = parseInt(response.headers.get('x-ratelimit-remaining'));
    }

    return data;
  }

  async getJournals(options = {}) {
    const params = new URLSearchParams({
      pageSize: options.pageSize || 20,
      page: options.page || 1
    });

    if (options.subject) {
      params.append('field', options.subject);
    }

    if (options.language) {
      params.append('language', options.language);
    }

    if (options.license) {
      params.append('license', options.license);
    }

    const url = `${this.baseURL}/journals?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data.total || 0,
      page: data.page || 0,
      pageSize: data.pageSize || 0,
      journals: data.journals ? data.journals.map(journal => this.parseJournal(journal)) : []
    };
  }

  parseJournal(journal) {
    return {
      id: journal.id,
      title: journal.title || '',
      url: journal.url || '',
      alternativeTitle: journal.alternative_title || '',
      pIssn: journal.pissn || null,
      eIssn: journal.eissn || null,
      languages: journal.language || [],
      country: journal.country || '',
      publisher: journal.publisher || '',
      isActive: journal.active_in_doaj === 'true',
      addedDate: journal.added_on || null,
      description: journal.description || '',
      subjects: journal.subject || [],
      keywords: journal.keywords || [],
      licenses: journal.license || [],
      fees: journal.apc || null,
      waiverAvailable: journal.waiver === 'true',
      peerReviewProcess: journal.peer_review || '',
      authorGuidelinesUrl: journal.author_guidelines || '',
      editorialReviewUrl: journal.editorial_review || '',
      copyright: journal.copyright || '',
      publicationTime: journal.publication_time || null,
      archivingPolicy: journal.archiving_policy || [],
      plagiarismScreening: journal.plagiarism_detection === 'true',
      contentHosting: journal.content_hosting || [],
      publicationFeeUrl: journal.apc_url || '',
      oaStartYear: journal.oa_start_year || null,
      seal: journal.seal === 'true',
      doajSealAwardedDate: journal.doaj_seal_awarded || null
    };
  }

  async searchJournals(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      pageSize: options.pageSize || 20,
      page: options.page || 1
    });

    const url = `${this.baseURL}/search/journals?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data.total || 0,
      page: data.page || 0,
      query: query,
      journals: data.results ? data.results.map(journal => this.parseJournal(journal)) : []
    };
  }

  async getJournalByISSN(issn) {
    const url = `${this.baseURL}/journal/issn/${encodeURIComponent(issn)}`;
    const data = await this.makeRequest(url);
    return this.parseJournal(data);
  }

  async getArticles(options = {}) {
    const params = new URLSearchParams({
      pageSize: options.pageSize || 20,
      page: options.page || 1
    });

    if (options.journalIssn) {
      params.append('issn', options.journalIssn);
    }

    if (options.language) {
      params.append('language', options.language);
    }

    if (options.license) {
      params.append('license', options.license);
    }

    const url = `${this.baseURL}/articles?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data.total || 0,
      page: data.page || 0,
      pageSize: data.pageSize || 0,
      articles: data.articles ? data.articles.map(article => this.parseArticle(article)) : []
    };
  }

  parseArticle(article) {
    return {
      id: article.id,
      title: article.title || '',
      authors: article.authors || [],
      abstract: article.abstract || '',
      keywords: article.keywords || [],
      language: article.language || '',
      journalTitle: article.journal_title || '',
      journalIssn: article.journal_issn || null,
      volume: article.volume || null,
      issue: article.issue || null,
      startPage: article.start_page || null,
      endPage: article.end_page || null,
      publicationYear: article.publication_year || null,
      publicationDate: article.publication_date || null,
      doi: article.doi || null,
      url: article.url || '',
      fullTextUrl: article.full_text_url || '',
      license: article.license || '',
      createdAt: article.created_at || null,
      updatedAt: article.updated_at || null
    };
  }

  async searchArticles(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      pageSize: options.pageSize || 20,
      page: options.page || 1
    });

    if (options.journalIssn) {
      params.append('issn', options.journalIssn);
    }

    const url = `${this.baseURL}/search/articles?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data.total || 0,
      page: data.page || 0,
      query: query,
      articles: data.results ? data.results.map(article => this.parseArticle(article)) : []
    };
  }

  async getJournalsBySubject(subject, options = {}) {
    return this.searchJournals('', { ...options, subject });
  }

  async getJournalsByLanguage(language, options = {}) {
    return this.searchJournals('', { ...options, language });
  }

  async getJournalsByLicense(license, options = {}) {
    return this.searchJournals('', { ...options, license });
  }
}

// Usage example
const doaj = new DOAJAPI(); // Add API key if available

// Search for computer science journals
doaj.searchJournals('machine learning', { pageSize: 10 }).then(result => {
  console.log(`Found ${result.total} journals`);
  result.journals.forEach(journal => {
    console.log(`- ${journal.title}`);
    console.log(`  ISSN: ${journal.pIssn || journal.eIssn}`);
    console.log(`  Country: ${journal.country}`);
    console.log(`  Languages: ${journal.languages.join(', ')}`);
    console.log(`  APC: ${journal.fees || 'Not specified'}`);
  });
});

// Get recent articles from a specific journal
doaj.searchArticles('', {
  journalIssn: '1234-5678',
  pageSize: 5
}).then(result => {
  console.log(`Found ${result.total} articles`);
  result.articles.forEach(article => {
    console.log(`- ${article.title}`);
    console.log(`  Authors: ${article.authors.join(', ')}`);
    console.log(`  Year: ${article.publicationYear}`);
    console.log(`  DOI: ${article.doi || 'Not available'}`);
  });
});
```

### Advanced Analysis (Python)
```python
import requests
import time
from typing import Dict, List, Optional
from dataclasses import dataclass
import json

@dataclass
class DOAJJournal:
    id: str
    title: str
    url: str
    p_issn: Optional[str]
    e_issn: Optional[str]
    languages: List[str]
    country: str
    publisher: str
    is_active: bool
    description: str
    subjects: List[str]
    licenses: List[str]
    fees: Optional[str]
    waiver_available: bool
    peer_review_process: str

@dataclass
class DOAJArticle:
    id: str
    title: str
    authors: List[str]
    abstract: str
    keywords: List[str]
    language: str
    journal_title: str
    journal_issn: Optional[str]
    publication_year: Optional[int]
    doi: Optional[str]
    url: str
    license: str

class DOAJAPI:
    def __init__(self, api_key: Optional[str] = None):
        self.base_url = "https://doaj.org/api/v1"
        self.api_key = api_key
        self.request_delay = 3600  # 1 hour for basic access
        self.last_request = 0
        self.session = requests.Session()

        if api_key:
            self.session.headers.update({
                'Authorization': f'Bearer {api_key}',
                'User-Agent': 'AcademicExplorer/1.0 (mailto:your-email@example.com)'
            })

    def _make_request(self, url: str, params: Dict = None) -> Dict:
        """Make API request with rate limiting."""
        # Rate limiting
        now = time.time()
        time_since_last = now - self.last_request
        if time_since_last < self.request_delay:
            time.sleep(self.request_delay - time_since_last)
        self.last_request = time.time()

        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()

    def get_journals(self, page_size: int = 20, page: int = 1,
                     subject: Optional[str] = None,
                     language: Optional[str] = None) -> Dict:
        """Get journals from DOAJ."""
        params = {
            'pageSize': page_size,
            'page': page
        }

        if subject:
            params['field'] = subject
        if language:
            params['language'] = language

        url = f"{self.base_url}/journals"
        data = self._make_request(url, params)

        return {
            'total': data.get('total', 0),
            'page': data.get('page', 0),
            'page_size': data.get('pageSize', 0),
            'journals': [self._parse_journal(j) for j in data.get('journals', [])]
        }

    def _parse_journal(self, journal_data: Dict) -> DOAJJournal:
        """Parse journal data."""
        return DOAJJournal(
            id=journal_data.get('id', ''),
            title=journal_data.get('title', ''),
            url=journal_data.get('url', ''),
            p_issn=journal_data.get('pissn'),
            e_issn=journal_data.get('eissn'),
            languages=journal_data.get('language', []),
            country=journal_data.get('country', ''),
            publisher=journal_data.get('publisher', ''),
            is_active=journal_data.get('active_in_doaj') == 'true',
            description=journal_data.get('description', ''),
            subjects=journal_data.get('subject', []),
            licenses=journal_data.get('license', []),
            fees=journal_data.get('apc'),
            waiver_available=journal_data.get('waiver') == 'true',
            peer_review_process=journal_data.get('peer_review', '')
        )

    def search_journals(self, query: str, page_size: int = 20, page: int = 1) -> Dict:
        """Search for journals."""
        params = {
            'q': query,
            'pageSize': page_size,
            'page': page
        }

        url = f"{self.base_url}/search/journals"
        data = self._make_request(url, params)

        return {
            'total': data.get('total', 0),
            'query': query,
            'page': data.get('page', 0),
            'journals': [self._parse_journal(j) for j in data.get('results', [])]
        }

    def get_articles(self, page_size: int = 20, page: int = 1,
                     journal_issn: Optional[str] = None) -> Dict:
        """Get articles from DOAJ."""
        params = {
            'pageSize': page_size,
            'page': page
        }

        if journal_issn:
            params['issn'] = journal_issn

        url = f"{self.base_url}/articles"
        data = self._make_request(url, params)

        return {
            'total': data.get('total', 0),
            'page': data.get('page', 0),
            'page_size': data.get('pageSize', 0),
            'articles': [self._parse_article(a) for a in data.get('articles', [])]
        }

    def _parse_article(self, article_data: Dict) -> DOAJArticle:
        """Parse article data."""
        return DOAJArticle(
            id=article_data.get('id', ''),
            title=article_data.get('title', ''),
            authors=article_data.get('authors', []),
            abstract=article_data.get('abstract', ''),
            keywords=article_data.get('keywords', []),
            language=article_data.get('language', ''),
            journal_title=article_data.get('journal_title', ''),
            journal_issn=article_data.get('journal_issn'),
            publication_year=int(article_data.get('publication_year', 0)) or None,
            doi=article_data.get('doi'),
            url=article_data.get('url', ''),
            license=article_data.get('license', '')
        )

    def analyze_journal_landscape(self, subject: Optional[str] = None) -> Dict:
        """Analyze the journal landscape."""
        all_journals = []
        page = 1

        while True:
            result = self.get_journals(page_size=100, page=page, subject=subject)
            if not result['journals']:
                break

            all_journals.extend(result['journals'])
            page += 1

            if len(all_journals) >= 1000:  # Limit to avoid API overuse
                break

        analysis = {
            'total_journals': len(all_journals),
            'countries': {},
            'languages': {},
            'publishers': {},
            'licenses': {},
            'apc_analysis': {
                'has_apc': 0,
                'no_apc': 0,
                'waiver_available': 0
            },
            'peer_review_analysis': {},
            'subjects': set()
        }

        for journal in all_journals:
            # Country distribution
            if journal.country:
                analysis['countries'][journal.country] = analysis['countries'].get(journal.country, 0) + 1

            # Language distribution
            for lang in journal.languages:
                analysis['languages'][lang] = analysis['languages'].get(lang, 0) + 1

            # Publisher distribution
            if journal.publisher:
                analysis['publishers'][journal.publisher] = analysis['publishers'].get(journal.publisher, 0) + 1

            # License distribution
            for license in journal.licenses:
                analysis['licenses'][license] = analysis['licenses'].get(license, 0) + 1

            # APC analysis
            if journal.fees:
                analysis['apc_analysis']['has_apc'] += 1
            else:
                analysis['apc_analysis']['no_apc'] += 1

            if journal.waiver_available:
                analysis['apc_analysis']['waiver_available'] += 1

            # Peer review analysis
            peer_review = journal.peer_review_process.lower()
            if peer_review:
                if 'single' in peer_review:
                    analysis['peer_review_analysis']['single'] = analysis['peer_review_analysis'].get('single', 0) + 1
                elif 'double' in peer_review:
                    analysis['peer_review_analysis']['double'] = analysis['peer_review_analysis'].get('double', 0) + 1
                elif 'triple' in peer_review:
                    analysis['peer_review_analysis']['triple'] = analysis['peer_review_analysis'].get('triple', 0) + 1

            # Subjects
            for subject in journal.subjects:
                analysis['subjects'].add(subject)

        analysis['subjects'] = list(analysis['subjects'])

        return analysis

# Usage example
doaj_api = DOAJAPI()

# Analyze computer science journals landscape
landscape = doaj_api.analyze_journal_landscape('Computer Science')
print(f"Total journals: {landscape['total_journals']}")
print(f"Top countries: {dict(sorted(landscape['countries'].items(), key=lambda x: x[1], reverse=True)[:5])}")
print(f"APC analysis: {landscape['apc_analysis']}")

# Search for specific journals
result = doaj_api.search_journals('machine learning', page_size=10)
print(f"Found {result['total']} journals matching 'machine learning'")
```

### Open Access Publishing Analysis
```javascript
class OpenAccessAnalyzer {
  constructor(doajAPI) {
    this.doaj = doajAPI;
  }

  async analyzeOpenAccessTrends(years = 5) {
    const trends = {
      period: years,
      yearlyJournalGrowth: {},
      articleVolumeByYear: {},
      subjectTrends: {},
      geographicTrends: {},
      licensingTrends: {},
      apcTrends: {
        withAPC: 0,
        withoutAPC: 0,
        withWaiver: 0
      }
    };

    // This is a simplified analysis - in practice, you'd need historical data
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < years; i++) {
      const targetYear = currentYear - i;

      // Get recent articles as a proxy for volume
      const articles = await this.doaj.getArticles({ pageSize: 100 });

      // Simulate yearly data (this would need actual historical data in practice)
      trends.articleVolumeByYear[targetYear] = articles.total * (years - i) / years;
    }

    // Analyze current journal distribution
    const journals = await this.doaj.getJournals({ pageSize: 500 });

    journals.journals.forEach(journal => {
      // Subject trends
      journal.subjects.forEach(subject => {
        trends.subjectTrends[subject] = (trends.subjectTrends[subject] || 0) + 1;
      });

      // Geographic trends
      trends.geographicTrends[journal.country] = (trends.geographicTrends[journal.country] || 0) + 1;

      // Licensing trends
      journal.licenses.forEach(license => {
        trends.licensingTrends[license] = (trends.licensingTrends[license] || 0) + 1;
      });

      // APC trends
      if (journal.fees) {
        trends.apcTrends.withAPC++;
      } else {
        trends.apcTrends.withoutAPC++;
      }

      if (journal.waiverAvailable) {
        trends.apcTrends.withWaiver++;
      }
    });

    return trends;
  }

  async findHighQualityJournals(subject = null, minLanguages = 2) {
    let journals = [];
    let page = 1;

    try {
      while (journals.length < 100) {
        const result = await this.doaj.getJournals({
          pageSize: 100,
          page,
          subject
        });

        if (!result.journals.length) break;
        journals = journals.concat(result.journals);
        page++;
      }
    } catch (error) {
      console.warn('Error fetching journals:', error.message);
    }

    // Filter for high-quality indicators
    const qualityFilters = {
      hasDescription: journal => journal.description && journal.description.length > 100,
      hasMultipleLanguages: journal => journal.languages && journal.languages.length >= minLanguages,
      hasPeerReview: journal => journal.peerReviewProcess && journal.peerReviewProcess.length > 10,
      isActive: journal => journal.isActive,
      hasURL: journal => journal.url && journal.url.length > 0,
      hasLicense: journal => journal.licenses && journal.licenses.length > 0
    };

    const highQualityJournals = journals.filter(journal => {
      return Object.values(qualityFilters).every(filter => filter(journal));
    });

    // Score journals based on quality indicators
    const scoredJournals = highQualityJournals.map(journal => {
      let score = 0;

      if (journal.description && journal.description.length > 500) score += 10;
      if (journal.languages.length > 3) score += 5;
      if (journal.peerReviewProcess.includes('double') || journal.peerReviewProcess.includes('triple')) score += 15;
      if (journal.seal) score += 20;
      if (!journal.fees) score += 10;
      if (journal.waiverAvailable) score += 5;
      if (journal.subjects.length > 5) score += 5;

      return {
        ...journal,
        qualityScore: score,
        qualityFactors: this.getQualityFactors(journal)
      };
    });

    return scoredJournals.sort((a, b) => b.qualityScore - a.qualityScore);
  }

  getQualityFactors(journal) {
    const factors = [];

    if (journal.description && journal.description.length > 100) {
      factors.push('Detailed description');
    }

    if (journal.languages.length > 1) {
      factors.push(`Multilingual (${journal.languages.length} languages)`);
    }

    if (journal.peerReviewProcess.includes('double')) {
      factors.push('Double-blind peer review');
    }

    if (journal.seal) {
      factors.push('DOAJ Seal (high quality)');
    }

    if (!journal.fees) {
      factors.push('No APCs');
    }

    if (journal.waiverAvailable) {
      factors.push('APC waivers available');
    }

    return factors;
  }

  generateRecommendations(researcherProfile) {
    const recommendations = {
      preferredLicenses: [],
      avoidAPCs: researcherProfile.budgetConstraints || false,
      languages: researcherProfile.preferredLanguages || ['en'],
      subjects: researcherProfile.researchInterests || [],
      qualityThreshold: 50
    };

    // Generate search strategy
    const searchStrategy = {
      filters: {},
      sort: 'relevance',
      recommendations: []
    };

    if (recommendations.subjects.length > 0) {
      searchStrategy.filters.subjects = recommendations.subjects;
    }

    if (recommendations.languages.length > 0) {
      searchStrategy.filters.languages = recommendations.languages;
    }

    if (recommendations.avoidAPCs) {
      searchStrategy.recommendations.push('Focus on journals without APCs');
    }

    return searchStrategy;
  }
}

// Usage example
const analyzer = new OpenAccessAnalyzer(doaj);

// Find high-quality computer science journals
analyzer.findHighQualityJournals('Computer Science', 2).then(journals => {
  console.log(`Found ${journals.length} high-quality journals`);

  journals.slice(0, 10).forEach(journal => {
    console.log(`- ${journal.title} (Score: ${journal.qualityScore})`);
    console.log(`  ISSN: ${journal.pIssn || journal.eIssn}`);
    console.log(`  Country: ${journal.country}`);
    console.log(`  APC: ${journal.fees || 'None'}`);
    console.log(`  Quality factors: ${journal.qualityFactors.join(', ')}`);
  });
});

// Analyze open access trends
analyzer.analyzeOpenAccessTrends(5).then(trends => {
  console.log('Open Access Trends:');
  console.log(`- Article volume (latest year): ${Object.values(trends.articleVolumeByYear)[0] || 'N/A'}`);
  console.log(`- Countries with most journals:`, Object.entries(trends.geographicTrends)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([country, count]) => `${country}: ${count}`));
  console.log(`- APC breakdown: ${JSON.stringify(trends.apcTrends)}`);
});
```

## Data Models

### Journal Object Structure
```json
{
  "id": "journal-id",
  "title": "Journal of Machine Learning Research",
  "url": "https://jmlr.org/",
  "alternative_title": "JMLR",
  "pissn": "1234-5678",
  "eissn": "2345-6789",
  "language": ["en"],
  "country": "US",
  "publisher": "MIT Press",
  "active_in_doaj": "true",
  "added_on": "2020-01-15",
  "description": "An international journal...",
  "subject": ["Computer Science", "Artificial Intelligence"],
  "keywords": ["machine learning", "artificial intelligence"],
  "license": ["CC BY", "CC BY-SA"],
  "apc": "$1000",
  "waiver": "true",
  "peer_review": "Double blind",
  "author_guidelines": "https://jmlr.org/author-guidelines",
  "editorial_review": "https://jmlr.org/editorial-review",
  "copyright": "Authors retain copyright",
  "publication_time": "0",
  "archiving_policy": ["CLOCKSS", "Portico"],
  "plagiarism_detection": "true",
  "content_hosting": ["DOAJ"],
  "apc_url": "https://jmlr.org/apc",
  "oa_start_year": "2020",
  "seal": "true",
  "doaj_seal_awarded": "2021-06-15"
}
```

### Article Object Structure
```json
{
  "id": "article-id",
  "title": "Deep Learning for Natural Language Processing",
  "authors": ["John Smith", "Jane Doe"],
  "abstract": "This paper presents...",
  "keywords": ["deep learning", "nlp", "neural networks"],
  "language": "en",
  "journal_title": "Journal of Machine Learning Research",
  "journal_issn": "1234-5678",
  "volume": "23",
  "issue": "4",
  "start_page": "123",
  "end_page": "145",
  "publication_year": 2023,
  "publication_date": "2023-06-15",
  "doi": "10.1234/jmlr.2023.123",
  "url": "https://jmlr.org/papers/v23/123-456.html",
  "full_text_url": "https://jmlr.org/papers/v23/123-456.pdf",
  "license": "CC BY",
  "created_at": "2023-06-15T10:30:00Z",
  "updated_at": "2023-06-15T10:30:00Z"
}
```

## Common License Types

- **CC BY** - Creative Commons Attribution
- **CC BY-SA** - Creative Commons Attribution-ShareAlike
- **CC BY-NC** - Creative Commons Attribution-NonCommercial
- **CC BY-ND** - Creative Commons Attribution-NoDerivatives
- **CC0** - Creative Commons Public Domain Dedication

## Best Practices

1. **Check rate limits** and implement proper backoff strategies
2. **Cache responses** to reduce redundant API calls
3. **Use specific search queries** to get more relevant results
4. **Validate ISSN formats** before making API calls (ISSN-L format: 1234-5678)
5. **Handle pagination** properly for large result sets
6. **Monitor API status** for service availability
7. **Respect copyright** and licensing terms when using content
8. **Use appropriate filters** to narrow search results

## Error Handling

```javascript
async function robustDOAJRequest(doajAPI, requestFunction, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await requestFunction();
    } catch (error) {
      if (error.message.includes('429') || error.message.includes('503')) {
        // Rate limited - exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (error.message.includes('404')) {
        // Resource not found - don't retry
        throw new Error('Resource not found');
      }

      if (error.message.includes('400')) {
        // Bad request - don't retry
        throw new Error('Invalid request parameters');
      }

      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Alternatives

- **OpenAlex API** - For comprehensive journal and article metadata
- **Crossref API** - For DOI metadata and publication information
- **ROAD Directory** - For Open Access journals and repositories
- **Ulrichsweb API** - For comprehensive journal information
- **Scopus API** - For premium journal and article data

## Support

- **API Documentation:** https://doaj.org/api/docs
- **Developer Guide:** https://doaj.org/api/docs#!/docs
- **Support Email:** support@doaj.org
- **Community Forum:** https://doaj.org/feedback
- **GitHub Repository:** https://github.com/DOAJ/doajAPI

---

*Last updated: 2025-10-27*