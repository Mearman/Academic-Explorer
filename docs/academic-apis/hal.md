# HAL API Documentation

**Category:** Multidisciplinary Research Archive
**Data Type:** Scholarly publications, theses, research reports
**API Type:** REST API + OAI-PMH
**Authentication:** None required
**Rate Limits:** Standard usage limits apply

## Overview

HAL (Hyper-Articles en Ligne) is the French national open archive platform that provides access to scholarly publications, theses, and research documents from French research institutions and universities. It serves as France's primary open access repository and offers comprehensive API access to millions of academic documents across all disciplines.

## Key Features

- **8+ million documents** from French research institutions
- **Multidisciplinary coverage** across all fields of research
- **Multiple document types** (articles, theses, books, conference papers, reports)
- **Full-text access** where copyright permits
- **Bilingual support** (French and English metadata)
- **OAI-PMH protocol** for standardized harvesting
- **Advanced search capabilities** with faceted navigation
- **Institution-specific collections** and thematic portals

## Documentation

- **API Documentation:** https://api.archives-ouvertes.fr/docs
- **Search API:** https://api.archives-ouvertes.fr/search
- **OAI-PMH Endpoint:** https://api.archives-ouvertes.fr/oai
- **Developer Portal:** https://api.archives-ouvertes.fr/
- **Main Site:** https://hal.science/

## Rate Limits

- **Standard usage limits** enforced
- **No hard limits** published but respectful usage required
- **Avoid excessive parallel requests**
- **Add delays** between consecutive requests
- **Use appropriate User-Agent** headers
- **Respect server capacity** during peak usage times

## API Endpoints

### Search API
```bash
# Basic search
https://api.archives-ouvertes.fr/search/?q=machine%20learning

# Search with filters
https://api.archives-ouvertes.fr/search/?q=artificial%20intelligence&fq=docType_s:ART&fq=publicationDateY_i:[2020%20TO%202023]

# Faceted search
https://api.archives-ouvertes.fr/search/?q=deep%20learning&facet=true&facet.field=authFullName_s&facet.field=labStructName_s

# Specific document lookup
https://api.archives-ouvertes.fr/search/?q=halId_s:hal-01234567
```

### Document Details
```bash
# Get document by HAL ID
https://api.archives-ouvertes.fr/search/?q=halId_s:hal-01234567&fl=*&wt=json

# Get multiple documents
https://api.archives-ouvertes.fr/search/?q=halId_s:(hal-01234567%20OR%20hal-02345678)&fl=*&wt=json
```

### OAI-PMH Harvesting
```bash
# List metadata formats
https://api.archives-ouvertes.fr/oai?verb=ListMetadataFormats

# Identify repository
https://api.archives-ouvertes.fr/oai?verb=Identify

# List records
https://api.archives-ouvertes.fr/oai?verb=ListRecords&metadataPrefix=didl&set=collection:SHS

# Get specific record
https://api.archives-ouvertes.fr/oai?verb=GetRecord&identifier=oai:HAL:hal-01234567&metadataPrefix=didl
```

## Implementation Examples

### Basic Search (JavaScript)
```javascript
class HALAPI {
  constructor() {
    this.baseURL = 'https://api.archives-ouvertes.fr/search';
    this.oaiBaseURL = 'https://api.archives-ouvertes.fr/oai';
    this.requestDelay = 500; // 500ms between requests
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
      throw new Error(`HAL API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchDocuments(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      wt: 'json',
      fl: options.fields || 'halId_s,title_s,authFullName_s,docType_s,publicationDateY_i,journalTitle_s,labStructName_s,language_s',
      rows: options.rows || 20,
      start: options.start || 0,
      sort: options.sort || 'publicationDateY_i desc',
      ...options.filters
    });

    const url = `${this.baseURL}/?${params}`;
    const result = await this.makeRequest(url);

    return this.parseSearchResponse(result);
  }

  parseSearchResponse(response) {
    const docs = response.response?.docs || [];

    return {
      total: response.response?.numFound || 0,
      start: response.response?.start || 0,
      documents: docs.map(doc => this.parseDocument(doc)),
      facets: response.facet_counts?.facet_fields || {}
    };
  }

  parseDocument(doc) {
    return {
      halId: doc.halId_s,
      title: doc.title_s,
      authors: Array.isArray(doc.authFullName_s) ? doc.authFullName_s : [doc.authFullName_s].filter(Boolean),
      documentType: doc.docType_s,
      publicationYear: parseInt(doc.publicationDateY_i) || null,
      journal: doc.journalTitle_s || null,
      laboratory: doc.labStructName_s || null,
      institution: doc.instructStructName_s || null,
      language: doc.language_s || null,
      abstract: doc.abstract_s || null,
      keywords: doc.en_keyword_s || doc.fr_keyword_s || [],
      doi: doc.doiId_s || null,
      arxivId: doc.arxivId_s || null,
      halUrl: `https://hal.science/${doc.halId_s}`,
      fullTextUrl: doc.fileMain_s ? `https://hal.science${doc.fileMain_s}` : null,
      isOpenAccess: true, // HAL is open access by default
      submitDate: doc.submittedDateY_i ? parseInt(doc.submittedDateY_i) : null
    };
  }

  async getDocumentByHalId(halId) {
    const result = await this.searchDocuments(`halId_s:${halId}`, { rows: 1 });
    return result.documents.length > 0 ? result.documents[0] : null;
  }

  async searchByAuthor(authorName, options = {}) {
    const query = `authFullName_s:"${authorName}"`;
    return this.searchDocuments(query, options);
  }

  async searchByLaboratory(labName, options = {}) {
    const query = `labStructName_s:"${labName}"`;
    return this.searchDocuments(query, options);
  }

  async searchByInstitution(institutionName, options = {}) {
    const query = `instructStructName_s:"${institutionName}"`;
    return this.searchDocuments(query, options);
  }

  async searchByDocumentType(docType, options = {}) {
    const validTypes = ['ART', 'THESE', 'COMM', 'OUV', 'REPORT', 'PREPRINT', 'IMG', 'SON', 'VID'];
    if (!validTypes.includes(docType)) {
      throw new Error(`Invalid document type. Must be one of: ${validTypes.join(', ')}`);
    }

    const query = `docType_s:${docType}`;
    return this.searchDocuments(query, options);
  }

  async searchTheses(options = {}) {
    return this.searchByDocumentType('THESE', options);
  }

  async searchArticles(options = {}) {
    return this.searchByDocumentType('ART', options);
  }

  async getFacetedSearch(query, facetFields, options = {}) {
    const params = {
      q: query,
      facet: 'true',
      'facet.field': facetFields,
      'facet.limit': options.facetLimit || 10,
      'facet.mincount': options.facetMinCount || 1,
      ...options
    };

    return this.searchDocuments(query, params);
  }

  async getRecentDocuments(days = 30, options = {}) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    const query = `submittedDateY_i:[${startYear} TO ${endYear}]`;
    return this.searchDocuments(query, {
      sort: 'submittedDateY_i desc',
      ...options
    });
  }
}

// Usage example
const hal = new HALAPI();

// Search for machine learning papers
hal.searchDocuments('machine learning', { rows: 10 }).then(result => {
  console.log(`Found ${result.total} documents`);
  result.documents.forEach(doc => {
    console.log(`Title: ${doc.title}`);
    console.log(`Authors: ${doc.authors.join(', ')}`);
    console.log(`Type: ${doc.documentType} (${doc.publicationYear})`);
    console.log(`HAL URL: ${doc.halUrl}`);
    console.log('---');
  });
});

// Get recent theses from a specific laboratory
hal.searchByLaboratory('Sorbonne Université', {
  filters: { 'fq': 'docType_s:THESE' },
  sort: 'publicationDateY_i desc',
  rows: 5
}).then(result => {
  console.log(`Found ${result.total} theses`);
  result.documents.forEach(thesis => {
    console.log(`Thesis: ${thesis.title}`);
    console.log(`Author: ${thesis.authors.join(', ')}`);
    console.log(`Year: ${thesis.publicationYear}`);
  });
});
```

### Advanced Analysis (Python)
```python
import requests
import time
from typing import Dict, List, Optional
from dataclasses import dataclass
from urllib.parse import quote
from datetime import datetime

@dataclass
class HALDocument:
    hal_id: str
    title: str
    authors: List[str]
    document_type: str
    publication_year: Optional[int]
    journal: Optional[str]
    laboratory: Optional[str]
    institution: Optional[str]
    language: Optional[str]
    abstract: Optional[str]
    keywords: List[str]
    doi: Optional[str]
    arxiv_id: Optional[str]
    hal_url: str
    full_text_url: Optional[str]
    submit_date: Optional[int]

class HALAPI:
    def __init__(self, request_delay: float = 0.5):
        self.base_url = "https://api.archives-ouvertes.fr/search"
        self.oai_base_url = "https://api.archives-ouvertes.fr/oai"
        self.request_delay = request_delay
        self.last_request = 0

    def _make_request(self, url: str) -> Dict:
        """Make API request with rate limiting."""
        # Rate limiting
        now = time.time()
        time_since_last = now - self.last_request
        if time_since_last < self.request_delay:
            time.sleep(self.request_delay - time_since_last)

        self.last_request = time.time()

        response = requests.get(url)
        response.raise_for_status()
        return response.json()

    def search_documents(self, query: str, **options) -> Dict:
        """Search for documents in HAL."""
        params = {
            'q': query,
            'wt': 'json',
            'fl': options.get('fields', 'halId_s,title_s,authFullName_s,docType_s,publicationDateY_i,journalTitle_s,labStructName_s,language_s'),
            'rows': options.get('rows', 20),
            'start': options.get('start', 0),
            'sort': options.get('sort', 'publicationDateY_i desc')
        }

        # Add filters
        for key, value in options.items():
            if key not in ['fields', 'rows', 'start', 'sort']:
                params[key] = value

        url = f"{self.base_url}/?" + "&".join([f"{k}={quote(str(v))}" for k, v in params.items()])
        data = self._make_request(url)
        return self._parse_search_response(data)

    def _parse_search_response(self, response: Dict) -> Dict:
        """Parse search response."""
        docs = response.get('response', {}).get('docs', [])

        return {
            'total': response.get('response', {}).get('numFound', 0),
            'start': response.get('response', {}).get('start', 0),
            'documents': [self._parse_document(doc) for doc in docs],
            'facets': response.get('facet_counts', {}).get('facet_fields', {})
        }

    def _parse_document(self, doc: Dict) -> HALDocument:
        """Parse individual document."""
        authors = doc.get('authFullName_s', [])
        if isinstance(authors, str):
            authors = [authors]
        elif not authors:
            authors = []

        keywords = doc.get('en_keyword_s', []) or doc.get('fr_keyword_s', [])
        if isinstance(keywords, str):
            keywords = [keywords]

        return HALDocument(
            hal_id=doc.get('halId_s', ''),
            title=doc.get('title_s', ''),
            authors=authors,
            document_type=doc.get('docType_s', ''),
            publication_year=int(doc.get('publicationDateY_i', 0)) or None,
            journal=doc.get('journalTitle_s'),
            laboratory=doc.get('labStructName_s'),
            institution=doc.get('instructStructName_s'),
            language=doc.get('language_s'),
            abstract=doc.get('abstract_s'),
            keywords=keywords,
            doi=doc.get('doiId_s'),
            arxiv_id=doc.get('arxivId_s'),
            hal_url=f"https://hal.science/{doc.get('halId_s', '')}",
            full_text_url=f"https://hal.science{doc.get('fileMain_s', '')}" if doc.get('fileMain_s') else None,
            submit_date=int(doc.get('submittedDateY_i', 0)) or None
        )

    def search_by_author(self, author_name: str, **options) -> Dict:
        """Search documents by author."""
        query = f'authFullName_s:"{author_name}"'
        return self.search_documents(query, **options)

    def search_by_laboratory(self, lab_name: str, **options) -> Dict:
        """Search documents by laboratory."""
        query = f'labStructName_s:"{lab_name}"'
        return self.search_documents(query, **options)

    def search_theses(self, **options) -> Dict:
        """Search for theses."""
        query = 'docType_s:THESE'
        return self.search_documents(query, **options)

    def search_articles(self, **options) -> Dict:
        """Search for articles."""
        query = 'docType_s:ART'
        return self.search_documents(query, **options)

    def analyze_laboratory_production(self, lab_name: str, years: int = 5) -> Dict:
        """Analyze research production for a laboratory."""
        end_year = datetime.now().year
        start_year = end_year - years

        query = f'labStructName_s:"{lab_name}" AND publicationDateY_i:[{start_year} TO {end_year}]'
        result = self.search_documents(query, rows=1000)

        # Analyze by document type
        doc_types = {}
        yearly_production = {}

        for doc in result['documents']:
            # Count by document type
            doc_type = doc.document_type
            doc_types[doc_type] = doc_types.get(doc_type, 0) + 1

            # Count by year
            year = doc.publication_year
            if year:
                yearly_production[year] = yearly_production.get(year, 0) + 1

        return {
            'laboratory': lab_name,
            'period': f'{start_year}-{end_year}',
            'total_documents': result['total'],
            'document_types': doc_types,
            'yearly_production': dict(sorted(yearly_production.items())),
            'recent_documents': [doc for doc in result['documents'] if doc.publication_year == end_year]
        }

# Usage example
hal = HALAPI()

# Search for machine learning papers
result = hal.search_documents('machine learning', rows=10)
print(f"Found {result['total']} documents")

# Analyze laboratory production
lab_analysis = hal.analyze_laboratory_production('CNRS', years=5)
print(f"CNRS production: {lab_analysis['total_documents']} documents in {lab_analysis['period']}")
print(f"By type: {lab_analysis['document_types']}")
```

### Research Output Analysis
```javascript
class HALResearchAnalyzer {
  constructor(halAPI) {
    this.hal = halAPI;
  }

  async analyzeInstitutionOutput(institutionName, years = 5) {
    const endYear = new Date().getFullYear();
    const startYear = endYear - years;

    const query = `instructStructName_s:"${institutionName}" AND publicationDateY_i:[${startYear} TO ${endYear}]`;
    const result = await this.hal.searchDocuments(query, { rows: 1000 });

    const analysis = {
      institution: institutionName,
      period: `${startYear}-${endYear}`,
      totalDocuments: result.total,
      documentTypes: {},
      yearlyTrends: {},
      topAuthors: {},
      topLaboratories: {},
      topJournals: {},
      languageDistribution: {}
    };

    result.documents.forEach(doc => {
      // Document type distribution
      const docType = doc.documentType;
      analysis.documentTypes[docType] = (analysis.documentTypes[docType] || 0) + 1;

      // Yearly trends
      const year = doc.publicationYear;
      if (year) {
        analysis.yearlyTrends[year] = (analysis.yearlyTrends[year] || 0) + 1;
      }

      // Author analysis
      doc.authors.forEach(author => {
        analysis.topAuthors[author] = (analysis.topAuthors[author] || 0) + 1;
      });

      // Laboratory analysis
      if (doc.laboratory) {
        analysis.topLaboratories[doc.laboratory] = (analysis.topLaboratories[doc.laboratory] || 0) + 1;
      }

      // Journal analysis
      if (doc.journal) {
        analysis.topJournals[doc.journal] = (analysis.topJournals[doc.journal] || 0) + 1;
      }

      // Language distribution
      const language = doc.language || 'unknown';
      analysis.languageDistribution[language] = (analysis.languageDistribution[language] || 0) + 1;
    });

    // Sort and limit results
    analysis.topAuthors = Object.entries(analysis.topAuthors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    analysis.topLaboratories = Object.entries(analysis.topLaboratories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    analysis.topJournals = Object.entries(analysis.topJournals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return analysis;
  }

  async compareInstitutions(institutions, years = 5) {
    const comparisons = await Promise.all(
      institutions.map(institution => this.analyzeInstitutionOutput(institution, years))
    );

    const comparison = {
      period: comparisons[0].period,
      institutions: institutions,
      metrics: {}
    };

    institutions.forEach(institution => {
      const data = comparisons.find(c => c.institution === institution);
      comparison.metrics[institution] = {
        totalDocuments: data.totalDocuments,
        averagePerYear: Math.round(data.totalDocuments / years),
        topDocumentType: Object.entries(data.documentTypes)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
        diversity: Object.keys(data.topLaboratories).length,
        languages: Object.keys(data.languageDistribution).length
      };
    });

    return comparison;
  }

  async trackResearchTrends(field, years = 10) {
    const endYear = new Date().getFullYear();
    const startYear = endYear - years;

    const query = `title_s:"${field}" OR abstract_s:"${field}" AND publicationDateY_i:[${startYear} TO ${endYear}]`;
    const result = await this.hal.searchDocuments(query, { rows: 2000 });

    const trends = {
      field,
      period: `${startYear}-${endYear}`,
      totalPapers: result.total,
      yearlyTrends: {},
      evolvingKeywords: {},
      emergingAuthors: {},
      topDocumentTypes: {}
    };

    result.documents.forEach(doc => {
      const year = doc.publicationYear;
      if (year) {
        trends.yearlyTrends[year] = (trends.yearlyTrends[year] || 0) + 1;
      }

      // Track keywords
      doc.keywords.forEach(keyword => {
        if (!trends.evolvingKeywords[keyword]) {
          trends.evolvingKeywords[keyword] = { count: 0, years: new Set() };
        }
        trends.evolvingKeywords[keyword].count++;
        if (year) trends.evolvingKeywords[keyword].years.add(year);
      });

      // Track emerging authors (recent publications)
      if (year && year >= endYear - 3) {
        doc.authors.forEach(author => {
          trends.emergingAuthors[author] = (trends.emergingAuthors[author] || 0) + 1;
        });
      }

      // Document type trends
      const docType = doc.documentType;
      trends.topDocumentTypes[docType] = (trends.topDocumentTypes[docType] || 0) + 1;
    });

    // Process keyword evolution
    trends.evolvingKeywords = Object.entries(trends.evolvingKeywords)
      .map(([keyword, data]) => ({
        keyword,
        count: data.count,
        yearSpan: data.years.size,
        recent: Array.from(data.years).some(y => y >= endYear - 2)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    trends.emergingAuthors = Object.entries(trends.emergingAuthors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));

    return trends;
  }
}

// Usage example
const analyzer = new HALResearchAnalyzer(hal);

// Analyze CNRS research output
analyzer.analyzeInstitutionOutput('CNRS', 5).then(analysis => {
  console.log(`CNRS Analysis (${analysis.period}):`);
  console.log(`Total documents: ${analysis.totalDocuments}`);
  console.log(`Top document types:`, analysis.documentTypes);
  console.log(`Top authors:`, analysis.topAuthors.slice(0, 5));
});

// Compare institutions
analyzer.compareInstitutions(['CNRS', 'Sorbonne Université', 'Université Paris-Saclay'], 3)
  .then(comparison => {
    console.log('Institution comparison:');
    Object.entries(comparison.metrics).forEach(([inst, metrics]) => {
      console.log(`${inst}: ${metrics.totalDocuments} papers, ${metrics.averagePerYear}/year`);
    });
  });
```

## Data Models

### Document Types
- **`ART`** - Journal articles
- **`THESE`** - PhD theses
- **`COMM`** - Conference papers
- **`OUV`** - Books and book chapters
- **`REPORT`** - Research reports
- **`PREPRINT`** - Preprints
- **`IMG`** - Images and figures
- **`SON`** - Audio recordings
- **`VID`** - Video recordings

### Document Object Structure
```json
{
  "halId": "hal-01234567",
  "title": "Machine Learning for Scientific Discovery",
  "authors": ["John Smith", "Jane Doe"],
  "documentType": "ART",
  "publicationYear": 2023,
  "journal": "Nature Machine Intelligence",
  "laboratory": "Laboratoire d'Informatique",
  "institution": "Sorbonne Université",
  "language": "en",
  "abstract": "Abstract content...",
  "keywords": ["machine learning", "scientific discovery"],
  "doi": "10.1038/s42256-023-00645-0",
  "arxivId": "2301.00000",
  "halUrl": "https://hal.science/hal-01234567",
  "fullTextUrl": "https://hal.science/hal-01234567/file/filename.pdf",
  "submitDate": 2023,
  "isOpenAccess": true
}
```

### Search Response Structure
```json
{
  "response": {
    "numFound": 1234,
    "start": 0,
    "docs": [...]
  },
  "facet_counts": {
    "facet_fields": {
      "docType_s": ["ART", 567, "THESE", 234, ...],
      "authFullName_s": ["Smith John", 23, "Doe Jane", 18, ...],
      "labStructName_s": ["CNRS", 156, "Sorbonne", 89, ...]
    }
  }
}
```

## Common Use Cases

### French Research Landscape Analysis
```javascript
async function analyzeFrenchResearchLandscape(halAPI, years = 5) {
  const endYear = new Date().getFullYear();
  const startYear = endYear - years;

  // Get all documents in the period
  const query = `publicationDateY_i:[${startYear} TO ${endYear}]`;
  const result = await halAPI.searchDocuments(query, { rows: 5000 });

  const landscape = {
    period: `${startYear}-${endYear}`,
    totalDocuments: result.total,
    topInstitutions: {},
    topLaboratories: {},
    documentTypeDistribution: {},
    languageDistribution: {},
    yearlyGrowth: {},
    topJournals: {}
  };

  result.documents.forEach(doc => {
    // Institution analysis
    if (doc.institution) {
      landscape.topInstitutions[doc.institution] = (landscape.topInstitutions[doc.institution] || 0) + 1;
    }

    // Laboratory analysis
    if (doc.laboratory) {
      landscape.topLaboratories[doc.laboratory] = (landscape.topLaboratories[doc.laboratory] || 0) + 1;
    }

    // Document type distribution
    landscape.documentTypeDistribution[doc.documentType] = (landscape.documentTypeDistribution[doc.documentType] || 0) + 1;

    // Language distribution
    const language = doc.language || 'unknown';
    landscape.languageDistribution[language] = (landscape.languageDistribution[language] || 0) + 1;

    // Yearly growth
    const year = doc.publicationYear;
    if (year) {
      landscape.yearlyGrowth[year] = (landscape.yearlyGrowth[year] || 0) + 1;
    }

    // Journal analysis
    if (doc.journal && doc.documentType === 'ART') {
      landscape.topJournals[doc.journal] = (landscape.topJournals[doc.journal] || 0) + 1;
    }
  });

  // Sort and limit results
  landscape.topInstitutions = Object.entries(landscape.topInstitutions)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }));

  landscape.topLaboratories = Object.entries(landscape.topLaboratories)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }));

  return landscape;
}

// Usage example
analyzeFrenchResearchLandscape(hal).then(landscape => {
  console.log(`French Research Landscape (${landscape.period}):`);
  console.log(`Total documents: ${landscape.totalDocuments}`);
  console.log(`Top institutions:`, landscape.topInstitutions.slice(0, 5));
  console.log(`Language distribution:`, landscape.languageDistribution);
});
```

## Best Practices

1. **Add delays between requests** - at least 500ms recommended
2. **Use specific queries** to get more relevant results
3. **Filter by document type** for targeted searches
4. **Use faceted search** for analytical purposes
5. **Cache responses** when working with large datasets
6. **Respect rate limits** and server capacity
7. **Use appropriate field selection** to minimize data transfer
8. **Handle French characters** properly in searches

## Error Handling

```javascript
async function robustHALSearch(halAPI, query, options = {}, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await halAPI.searchDocuments(query, options);
    } catch (error) {
      if (error.message.includes('429') || error.message.includes('503')) {
        // Server overloaded - exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (error.message.includes('400')) {
        // Bad query - try to fix common issues
        if (query.includes('"') && !query.includes('\\"')) {
          query = query.replace(/"/g, '\\"');
          continue;
        }
      }

      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Alternatives

- **OpenAlex API** - For comprehensive global scholarly data
- **arXiv API** - For preprints in physics/math/CS
- **PubMed API** - For biomedical literature
- **CORE API** - For aggregated open access content
- **Institutional repositories** - For specific university outputs

## Support

- **API Documentation:** https://api.archives-ouvertes.fr/docs
- **Developer Portal:** https://api.archives-ouvertes.fr/
- **Main Site:** https://hal.science/
- **Contact:** Available through HAL website
- **User Support:** Support@ccsd.cnrs.fr

---

*Last updated: 2025-10-27*