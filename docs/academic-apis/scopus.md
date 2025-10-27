# Scopus API Documentation

**Category:** Citation Database & Research Analytics
**Data Type:** Citations, abstracts, author profiles, institution metrics
**API Type:** REST API
**Authentication:** API key + Institution token required
**Rate Limits:** 20,000 requests per year (institutional)

## Overview

Scopus is Elsevier's comprehensive abstract and citation database of peer-reviewed literature, providing access to over 84 million records from 7,000+ publishers worldwide. The Scopus API enables sophisticated bibliometric analysis, citation tracking, and research performance metrics for institutions and researchers.

## Key Features

- **84+ million records** from scientific, technical, medical, and social sciences literature
- **Advanced citation analysis** with h-index, citation counts, and citation networks
- **Author profile management** with publication histories and collaboration analysis
- **Institution performance metrics** and benchmarking capabilities
- **Journal analytics** including CiteScore and SJR rankings
- **Subject classification** using ASJC (All Science Journal Classification) codes
- **Affiliation mapping** and institutional collaboration networks
- **Research trend analysis** and bibliometric indicators

## Documentation

- **API Documentation:** https://dev.elsevier.com/scopus
- **Developer Portal:** https://dev.elsevier.com/
- **Main Site:** https://www.scopus.com/
- **API Key Registration:** https://dev.elsevier.com/apikey/manage
- **Support Center:** https://service.elsevier.com/app/contact/supporthub/developer/
- **Metrics Guide:** https://www.elsevier.com/solutions/scopus/metrics

## Rate Limits

- **Institutional tier:** 20,000 requests per year
- **Rate limiting headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Quota management:** Annual reset cycle
- **Burst protection:** Automatic throttling for high-frequency requests
- **Enterprise options:** Custom limits for large-scale institutional usage
- **Concurrency limits:** Maximum 5 concurrent requests

## API Endpoints

### Search Documents
```bash
# Search for documents
https://api.elsevier.com/content/search/scopus?query=artificial+intelligence

# Advanced search with filters
https://api.elsevier.com/content/search/scopus?query=machine+learning&date=2023&subj=1700

# Search by author
https://api.elsevier.com/content/search/scopus?query=authlast(smith)+and(authfirst(john))
```

### Author Retrieval
```bash
# Get author profile
https://api.elsevier.com/content/author/author_id/12345678900

# Get author search
https://api.elsevier.com/content/search/author?query=authname(john+smith)

# Get author metrics
https://api.elsevier.com/content/author/author_id/12345678900/metrics
```

### Citation Analysis
```bash
# Get citation overview
https://api.elsevier.com/content/abstract/citation/doi/10.1016/j.joi.2023.101234

# Get cited-by count
https://api.elsevier.com/content/search/scopus?query=refeid(123456789)
```

## Implementation Examples

### Basic Search and Citation Analysis (JavaScript)
```javascript
class ScopusAPI {
  constructor(apiKey, institutionToken) {
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
      'X-ELS-Insttoken': this.institutionToken,
      'User-Agent': 'AcademicExplorer/1.0'
    };

    const response = await fetch(url, { headers, ...options });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (response.status === 401) {
        throw new Error('Invalid API credentials');
      }
      if (response.status === 403) {
        throw new Error('Access forbidden - check institutional subscription');
      }
      throw new Error(`Scopus API error: ${response.status}`);
    }

    return response.json();
  }

  async searchDocuments(query, options = {}) {
    const params = new URLSearchParams({
      query: query,
      count: options.pageSize || 25,
      start: (options.page - 1) * (options.pageSize || 25) + 1,
      sort: options.sort || 'relevance'
    });

    // Add filters
    if (options.date) params.append('date', options.date);
    if (options.subject) params.append('subj', options.subject);
    if (options.language) params.append('language', options.language);
    if (options.documentType) params.append('doctype', options.documentType);

    const url = `${this.baseURL}/search/scopus?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data['search-results']['opensearch:totalResults'],
      documents: data['search-results'].entry.map(doc => this.parseDocumentData(doc)),
      page: options.page || 1,
      pageSize: options.pageSize || 25
    };
  }

  parseDocumentData(docData) {
    return {
      eid: docData['eid'],
      doi: docData['prism:doi'],
      title: docData['dc:title'],
      authors: this.parseAuthors(docData['author']),
      publicationName: docData['prism:publicationName'],
      volume: docData['prism:volume'],
      issue: docData['prism:issue'],
      pageRange: docData['prism:pageRange'],
      coverDate: docData['prism:coverDate'],
      citedByCount: parseInt(docData['citedby-count']) || 0,
      sourceType: docData['srctype'],
      subjectAreas: this.parseSubjectAreas(docData['subject-area']),
      affiliation: this.parseAffiliations(docData['affiliation']),
      language: docData['language'],
      documentType: docData['subtypeDescription'],
      issn: docData['prism:issn']
    };
  }

  parseAuthors(authors) {
    if (!authors || !Array.isArray(authors)) return [];
    return authors.map(author => ({
      name: author['authname'],
      initials: author['authinitials'],
      surname: author['authsurname'],
      orcid: author['orcid'],
      affiliation: author['afid'] || []
    }));
  }

  parseSubjectAreas(subjectAreas) {
    if (!subjectAreas || !Array.isArray(subjectAreas)) return [];
    return subjectAreas.map(area => ({
      code: area['$'],
      abbreviation: area['@abbrev'],
      name: area['@name']
    }));
  }

  parseAffiliations(affiliations) {
    if (!affiliations || !Array.isArray(affiliations)) return [];
    return affiliations.map(aff => ({
      id: aff['@id'],
      name: aff['affilname'],
      city: aff['affiliation-city'],
      country: aff['affiliation-country']
    }));
  }

  async getAuthorProfile(authorId) {
    const url = `${this.baseURL}/author/author_id/${authorId}`;
    const data = await this.makeRequest(url);
    return this.parseAuthorData(data['author-retrieval-response'][0]);
  }

  parseAuthorData(authorData) {
    return {
      eid: authorData['eid'],
      name: authorData['preferred-name'],
      initialism: authorData['initialism'],
      orcid: authorData['orcid'],
      hIndex: parseInt(authorData['h-index']) || 0,
      documentCount: parseInt(authorData['document-count']) || 0,
      citedByCount: parseInt(authorData['cited-by-count']) || 0,
      coauthorCount: parseInt(authorData['coauthor-count']) || 0,
      subjectAreas: this.parseSubjectAreas(authorData['subject-area']),
      affiliationHistory: this.parseAffiliationHistory(authorData['affiliation-history']),
      publicationRange: {
        start: authorData['publication-range']['@start'],
        end: authorData['publication-range']['@end']
      }
    };
  }

  parseAffiliationHistory(affiliationHistory) {
    if (!affiliationHistory || !Array.isArray(affiliationHistory)) return [];
    return affiliationHistory.map(aff => ({
      id: aff['affiliation-id'],
      name: aff['affiliation-name'],
      city: aff['affiliation-city'],
      country: aff['affiliation-country'],
      startDate: aff['@start-date'],
      endDate: aff['@end-date']
    }));
  }

  async getCitationOverview(documentIds) {
    const params = new URLSearchParams({
      'scopus_ids': Array.isArray(documentIds) ? documentIds.join(',') : documentIds,
      'count': '1000'
    });

    const url = `${this.baseURL}/abstract/citation?${params}`;
    const data = await this.makeRequest(url);
    return this.parseCitationData(data);
  }

  parseCitationData(citationData) {
    const citations = citationData['abstract-citations-response'] || [];
    return citations.map(citation => ({
      doi: citation['doi'],
      scopusId: citation['dc:identifier'].replace('SCOPUS_ID:', ''),
      title: citation['dc:title'],
      authors: citation['authors']?.author || [],
      publicationName: citation['prism:publicationName'],
      coverDate: citation['prism:coverDate'],
      citedByCount: parseInt(citation['citedby-count']) || 0
    }));
  }

  async analyzeResearchImpact(authorId, yearRange = null) {
    // Get author profile
    const author = await this.getAuthorProfile(authorId);

    // Get author's documents
    const documents = await this.searchDocuments(`AU-ID(${authorId})`, {
      pageSize: 200
    });

    // Calculate impact metrics
    const impact = {
      author: author,
      documents: documents.documents,
      totalCitations: documents.documents.reduce((sum, doc) => sum + doc.citedByCount, 0),
      averageCitations: 0,
      topCitedPapers: documents.documents.sort((a, b) => b.citedByCount - a.citedByCount).slice(0, 5),
      publicationTrend: this.analyzePublicationTrend(documents.documents, yearRange),
      collaborationMetrics: this.analyzeCollaboration(documents.documents)
    };

    impact.averageCitations = documents.documents.length > 0
      ? impact.totalCitations / documents.documents.length
      : 0;

    return impact;
  }

  analyzePublicationTrend(documents, yearRange = null) {
    const trend = {};
    const currentYear = new Date().getFullYear();
    const startYear = yearRange?.start || currentYear - 10;
    const endYear = yearRange?.end || currentYear;

    for (let year = startYear; year <= endYear; year++) {
      trend[year] = 0;
    }

    documents.forEach(doc => {
      const year = parseInt(doc.coverDate?.substring(0, 4));
      if (year && year >= startYear && year <= endYear) {
        trend[year]++;
      }
    });

    return trend;
  }

  analyzeCollaboration(documents) {
    const collaborators = {};
    const institutions = {};

    documents.forEach(doc => {
      doc.authors.forEach(author => {
        const name = author.surname + ', ' + author.initials;
        collaborators[name] = (collaborators[name] || 0) + 1;
      });

      doc.affiliation.forEach(aff => {
        const name = aff.name;
        institutions[name] = (institutions[name] || 0) + 1;
      });
    });

    return {
      topCollaborators: Object.entries(collaborators)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      topInstitutions: Object.entries(institutions)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }))
    };
  }
}

// Usage
const scopus = new ScopusAPI('your-api-key', 'your-institution-token');

scopus.searchDocuments('artificial intelligence', {
  pageSize: 10,
  date: '2023',
  subject: '1700' // Computer Science
}).then(result => {
  console.log(`Found ${result.total} documents`);
  result.documents.forEach(doc => {
    console.log(`- ${doc.title} (${doc.publicationName}) - ${doc.citedByCount} citations`);
  });
});

scopus.analyzeResearchImpact('12345678900')
  .then(impact => {
    console.log(`Author h-index: ${impact.author.hIndex}`);
    console.log(`Total citations: ${impact.totalCitations}`);
    console.log(`Top cited papers:`, impact.topCitedPapers);
  });
```

### Advanced Bibliometric Analysis (Python)
```python
import requests
import time
from typing import List, Dict, Optional
from collections import defaultdict

class ScopusAPI:
    def __init__(self, api_key: str, institution_token: str):
        self.base_url = "https://api.elsevier.com/content"
        self.api_key = api_key
        self.institution_token = institution_token
        self.request_delay = 0.1
        self.last_request = 0

    def make_request(self, url: str, params: Dict = None) -> Dict:
        """Make authenticated API request"""
        now = time.time()
        if now - self.last_request < self.request_delay:
            time.sleep(self.request_delay - (now - self.last_request))

        self.last_request = time.time()

        headers = {
            'Accept': 'application/json',
            'X-ELS-APIKey': self.api_key,
            'X-ELS-Insttoken': self.institution_token,
            'User-Agent': 'AcademicExplorer/1.0'
        }

        response = requests.get(url, params=params, headers=headers)

        if response.status_code == 429:
            raise Exception("Rate limit exceeded")
        elif response.status_code == 401:
            raise Exception("Invalid API credentials")
        elif response.status_code == 403:
            raise Exception("Access forbidden - check institutional subscription")

        response.raise_for_status()
        return response.json()

    def search_documents(self, query: str, **kwargs) -> Dict:
        """Search for documents in Scopus"""
        params = {
            'query': query,
            'count': kwargs.get('page_size', 25),
            'start': (kwargs.get('page', 1) - 1) * kwargs.get('page_size', 25) + 1,
            'sort': kwargs.get('sort', 'relevance')
        }

        # Add optional filters
        if kwargs.get('date'):
            params['date'] = kwargs['date']
        if kwargs.get('subject'):
            params['subj'] = kwargs['subject']
        if kwargs.get('language'):
            params['language'] = kwargs['language']
        if kwargs.get('document_type'):
            params['doctype'] = kwargs['document_type']

        url = f"{self.base_url}/search/scopus"
        data = self.make_request(url, params)

        return {
            'total': int(data['search-results']['opensearch:totalResults']),
            'documents': [self.parse_document_data(doc) for doc in data['search-results'].get('entry', [])],
            'page': kwargs.get('page', 1),
            'page_size': kwargs.get('page_size', 25)
        }

    def parse_document_data(self, doc_data: Dict) -> Dict:
        """Parse document data from API response"""
        return {
            'eid': doc_data.get('eid'),
            'doi': doc_data.get('prism:doi'),
            'title': doc_data.get('dc:title', ''),
            'authors': self._parse_authors(doc_data.get('author', [])),
            'publication_name': doc_data.get('prism:publicationName'),
            'volume': doc_data.get('prism:volume'),
            'issue': doc_data.get('prism:issue'),
            'page_range': doc_data.get('prism:pageRange'),
            'cover_date': doc_data.get('prism:coverDate'),
            'cited_by_count': int(doc_data.get('citedby-count', 0)),
            'source_type': doc_data.get('srctype'),
            'subject_areas': self._parse_subject_areas(doc_data.get('subject-area', [])),
            'affiliation': self._parse_affiliations(doc_data.get('affiliation', [])),
            'language': doc_data.get('language'),
            'document_type': doc_data.get('subtypeDescription'),
            'issn': doc_data.get('prism:issn')
        }

    def _parse_authors(self, authors: List[Dict]) -> List[Dict]:
        """Parse author information"""
        if not authors:
            return []
        return [{
            'name': author.get('authname', ''),
            'initials': author.get('authinitials', ''),
            'surname': author.get('authsurname', ''),
            'orcid': author.get('orcid'),
            'affiliation': author.get('afid', [])
        } for author in authors]

    def _parse_subject_areas(self, subject_areas: List[Dict]) -> List[Dict]:
        """Parse subject area information"""
        if not subject_areas:
            return []
        return [{
            'code': area.get('$'),
            'abbreviation': area.get('@abbrev'),
            'name': area.get('@name')
        } for area in subject_areas]

    def _parse_affiliations(self, affiliations: List[Dict]) -> List[Dict]:
        """Parse affiliation information"""
        if not affiliations:
            return []
        return [{
            'id': aff.get('@id'),
            'name': aff.get('affilname'),
            'city': aff.get('affiliation-city'),
            'country': aff.get('affiliation-country')
        } for aff in affiliations]

    def get_author_profile(self, author_id: str) -> Dict:
        """Get detailed author profile"""
        url = f"{self.base_url}/author/author_id/{author_id}"
        data = self.make_request(url)
        return self._parse_author_data(data['author-retrieval-response'][0])

    def _parse_author_data(self, author_data: Dict) -> Dict:
        """Parse author profile data"""
        return {
            'eid': author_data.get('eid'),
            'name': author_data.get('preferred-name'),
            'initialism': author_data.get('initialism'),
            'orcid': author_data.get('orcid'),
            'h_index': int(author_data.get('h-index', 0)),
            'document_count': int(author_data.get('document-count', 0)),
            'cited_by_count': int(author_data.get('cited-by-count', 0)),
            'coauthor_count': int(author_data.get('coauthor-count', 0)),
            'subject_areas': self._parse_subject_areas(author_data.get('subject-area', [])),
            'affiliation_history': self._parse_affiliation_history(author_data.get('affiliation-history', [])),
            'publication_range': {
                'start': author_data['publication-range']['@start'],
                'end': author_data['publication-range']['@end']
            }
        }

    def _parse_affiliation_history(self, affiliation_history: List[Dict]) -> List[Dict]:
        """Parse author affiliation history"""
        if not affiliation_history:
            return []
        return [{
            'id': aff.get('affiliation-id'),
            'name': aff.get('affiliation-name'),
            'city': aff.get('affiliation-city'),
            'country': aff.get('affiliation-country'),
            'start_date': aff.get('@start-date'),
            'end_date': aff.get('@end-date')
        } for aff in affiliation_history]

    def analyze_field_bibliometrics(self, subject_code: str, years: int = 5) -> Dict:
        """Analyze bibliometric trends for a specific field"""
        end_year = time.gmtime().tm_year
        start_year = end_year - years

        # Get publications by year
        publications_by_year = {}
        citations_by_year = {}
        top_journals = defaultdict(int)
        top_countries = defaultdict(int)

        for year in range(start_year, end_year + 1):
            query = f"SUBJAREA({subject_code}) AND PUBYEAR IS {year}"
            result = self.search_documents(query, page_size=200)

            publications_by_year[year] = result['total']

            # Analyze citations and journals
            for doc in result['documents']:
                citations_by_year[year] = citations_by_year.get(year, 0) + doc['cited_by_count']
                if doc['publication_name']:
                    top_journals[doc['publication_name']] += 1

                for aff in doc['affiliation']:
                    if aff['country']:
                        top_countries[aff['country']] += 1

            time.sleep(0.5)  # Rate limiting

        return {
            'field_code': subject_code,
            'years_analyzed': years,
            'publications_by_year': publications_by_year,
            'citations_by_year': citations_by_year,
            'top_journals': dict(sorted(top_journals.items(), key=lambda x: x[1], reverse=True)[:10]),
            'top_countries': dict(sorted(top_countries.items(), key=lambda x: x[1], reverse=True)[:10]),
            'total_publications': sum(publications_by_year.values()),
            'total_citations': sum(citations_by_year.values())
        }

    def compare_institutional_performance(self, institution_ids: List[str], years: int = 5) -> Dict:
        """Compare research performance across institutions"""
        performance = {}

        for inst_id in institution_ids:
            query = f"AF-ID({inst_id})"
            end_year = time.gmtime().tm_year
            start_year = end_year - years

            total_pubs = 0
            total_cites = 0
            subject_areas = defaultdict(int)

            for year in range(start_year, end_year + 1):
                query_with_year = f"{query} AND PUBYEAR IS {year}"
                result = self.search_documents(query_with_year, page_size=200)

                total_pubs += result['total']

                for doc in result['documents']:
                    total_cites += doc['cited_by_count']
                    for area in doc['subject_areas']:
                        subject_areas[area['name']] += 1

                time.sleep(0.5)  # Rate limiting

            performance[inst_id] = {
                'total_publications': total_pubs,
                'total_citations': total_cites,
                'average_citations_per_paper': total_cites / total_pubs if total_pubs > 0 else 0,
                'top_subject_areas': dict(sorted(subject_areas.items(), key=lambda x: x[1], reverse=True)[:5])
            }

        return performance

    def identify_emerging_topics(self, subject_code: str, recent_years: int = 3) -> Dict:
        """Identify emerging research topics using keyword analysis"""
        end_year = time.gmtime().tm_year
        start_year = end_year - recent_years

        # Get recent publications
        query = f"SUBJAREA({subject_code}) AND PUBYEAR > {start_year}"
        result = self.search_documents(query, page_size=500)

        # Extract keywords from titles and abstracts
        keyword_frequency = defaultdict(int)
        recent_growth = defaultdict(lambda: defaultdict(int))

        for doc in result['documents']:
            # Simple keyword extraction from title
            title_words = doc['title'].lower().split()
            for word in title_words:
                if len(word) > 4 and word.isalpha():  # Filter short words and non-words
                    keyword_frequency[word] += 1

                    # Track year-wise growth
                    year = int(doc['cover_date'][:4]) if doc['cover_date'] else end_year
                    recent_growth[word][year] += 1

        # Calculate growth rates
        emerging_topics = []
        for keyword, total_freq in keyword_frequency.items():
            if total_freq < 5:  # Filter very low frequency keywords
                continue

            years_data = recent_growth[keyword]
            if len(years_data) >= 2:
                years = sorted(years_data.keys())
                counts = [years_data[year] for year in years]

                # Simple growth rate calculation
                if counts[-1] > counts[0]:
                    growth_rate = ((counts[-1] - counts[0]) / counts[0]) * 100 if counts[0] > 0 else 100
                    emerging_topics.append({
                        'keyword': keyword,
                        'total_frequency': total_freq,
                        'growth_rate': growth_rate,
                        'recent_counts': counts
                    })

        # Sort by growth rate and frequency
        emerging_topics.sort(key=lambda x: (x['growth_rate'], x['total_frequency']), reverse=True)

        return {
            'subject_code': subject_code,
            'analysis_period': f"{start_year}-{end_year}",
            'emerging_topics': emerging_topics[:20],  # Top 20 emerging topics
            'total_documents_analyzed': len(result['documents'])
        }

# Usage
scopus = ScopusAPI('your-api-key', 'your-institution-token')

# Search for documents
result = scopus.search_documents('machine learning', page_size=10)
print(f"Found {result['total']} documents")

# Analyze field bibliometrics
bibliometrics = scopus.analyze_field_bibliometrics('1700', years=5)  # Computer Science
print(f"Field bibliometrics: {bibliometrics}")

# Identify emerging topics
emerging = scopus.identify_emerging_topics('1700', recent_years=3)
print(f"Emerging topics: {emerging['emerging_topics'][:5]}")
```

## Data Models

### Document Object Structure
```json
{
  "eid": "2-s2.0-1234567890",
  "doi": "10.1016/j.joi.2023.101234",
  "title": "Advanced Machine Learning Techniques in Scientific Research",
  "authors": [
    {
      "name": "Smith, John",
      "initials": "J.",
      "surname": "Smith",
      "orcid": "0000-0002-1234-5678",
      "affiliation": ["60000001"]
    }
  ],
  "publicationName": "Journal of Informetrics",
  "volume": "15",
  "issue": "2",
  "pageRange": "123-145",
  "coverDate": "2023-06-01",
  "citedByCount": 42,
  "sourceType": "Journal",
  "subjectAreas": [
    {
      "code": "1700",
      "abbreviation": "COMP",
      "name": "Computer Science"
    }
  ],
  "affiliation": [
    {
      "id": "60000001",
      "name": "University of Technology",
      "city": "London",
      "country": "United Kingdom"
    }
  ],
  "language": "eng",
  "documentType": "Article",
  "issn": "1751-1557"
}
```

### Author Profile Object Structure
```json
{
  "eid": "9-s2.0-12345678900",
  "name": "Smith, John",
  "initialism": "SJ",
  "orcid": "0000-0002-1234-5678",
  "hIndex": 15,
  "documentCount": 45,
  "citedByCount": 678,
  "coauthorCount": 23,
  "subjectAreas": [
    {
      "code": "1700",
      "abbreviation": "COMP",
      "name": "Computer Science"
    }
  ],
  "affiliationHistory": [
    {
      "id": "60000001",
      "name": "University of Technology",
      "city": "London",
      "country": "United Kingdom",
      "startDate": "2018-01-01",
      "endDate": "2023-12-31"
    }
  ],
  "publicationRange": {
    "start": "2015",
    "end": "2023"
  }
}
```

## Common Use Cases

### 1. Research Impact Assessment
```javascript
// Comprehensive research impact analysis
async function assessResearchImpact(authorId, institutionId) {
  const authorProfile = await scopus.getAuthorProfile(authorId);
  const documents = await scopus.searchDocuments(`AU-ID(${authorId})`, {
    pageSize: 200
  });

  const impact = {
    bibliometric_indicators: {
      h_index: authorProfile.hIndex,
      total_publications: authorProfile.documentCount,
      total_citations: authorProfile.citedByCount,
      average_citations_per_paper: authorProfile.citedByCount / authorProfile.documentCount
    },
    collaboration_metrics: calculateCollaborationMetrics(documents.documents),
    subject_distribution: analyzeSubjectDistribution(documents.documents),
    temporal_trends: analyzeTemporalTrends(documents.documents),
    top_cited_works: documents.documents
      .sort((a, b) => b.citedByCount - a.citedByCount)
      .slice(0, 10)
  };

  return impact;
}
```

### 2. Institutional Benchmarking
```python
# Institutional performance benchmarking
def benchmark_institutions(institution_list, field_code):
    """Benchmark research performance across institutions"""
    benchmark_results = {}

    for inst_id in institution_list:
        query = f"AF-ID({inst_id}) AND SUBJAREA({field_code})"
        result = scopus.search_documents(query, page_size=200)

        # Calculate metrics
        publications = len(result['documents'])
        total_citations = sum(doc['cited_by_count'] for doc in result['documents'])

        # Analyze collaboration patterns
        collaborator_network = analyze_collaboration_network(result['documents'])

        benchmark_results[inst_id] = {
            'publication_count': publications,
            'total_citations': total_citations,
            'average_citations': total_citations / publications if publications > 0 else 0,
            'collaborator_count': len(collaborator_network),
            'international_collaboration_rate': calculate_international_collab_rate(result['documents'])
        }

    return benchmark_results
```

## Best Practices

1. **Monitor quotas carefully** - Track usage against annual limits
2. **Use efficient queries** - Combine multiple criteria in single searches
3. **Cache author profiles** - Author data doesn't change frequently
4. **Handle pagination** - Process large result sets efficiently
5. **Validate data** - Check for missing or malformed API responses
6. **Implement error handling** - Handle institutional access restrictions gracefully

## Error Handling

```javascript
async function robustScopusRequest(scopusAPI, requestFunction, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await requestFunction();
    } catch (error) {
      if (error.message.includes('429')) {
        // Rate limit exceeded
        const delay = Math.pow(2, attempt) * 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (error.message.includes('403')) {
        // Institutional access issue
        throw new Error('Institutional subscription required');
      }
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Alternatives

- **Web of Science API** - Alternative citation database
- **Crossref API** - For DOI metadata and citation tracking
- **OpenAlex API** - For comprehensive scholarly data
- **Dimensions API** - For research analytics and funding data
- **Semantic Scholar API** - For paper metadata and citations

## Support

- **API Documentation:** https://dev.elsevier.com/scopus
- **Developer Portal:** https://dev.elsevier.com/
- **API Key Registration:** https://dev.elsevier.com/apikey/manage
- **Support Center:** https://service.elsevier.com/app/contact/supporthub/developer/
- **Metrics Guide:** https://www.elsevier.com/solutions/scopus/metrics

---

*Last updated: 2025-10-27*
