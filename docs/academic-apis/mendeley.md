# Mendeley API Documentation

**Category:** Reference Management & Research Collaboration
**Data Type:** Research papers, citations, annotations, groups, profiles
**API Type:** REST API
**Authentication:** OAuth 2.0 required
**Rate Limits:** 100 requests per hour (free tier)

## Overview

Mendeley is a comprehensive reference management and academic social networking platform that provides access to millions of research papers, citation data, and collaborative research features. The Mendeley API allows developers to search papers, manage bibliographic data, access user libraries, and integrate research workflows.

## Key Features

- **100+ million research papers** with comprehensive metadata
- **User library management** with personal and group collections
- **Citation analysis** and reference extraction
- **Annotation management** with highlights and notes
- **Research collaboration** through groups and sharing
- **Author profiles** with publication histories
- **Document metadata** extraction and enrichment
- **Cross-platform synchronization** across devices

## Documentation

- **API Documentation:** https://dev.mendeley.com/reference.html
- **Developer Portal:** https://dev.mendeley.com/
- **Main Site:** https://www.mendeley.com/
- **OAuth 2.0 Guide:** https://dev.mendeley.com/oauth.html
- **GitHub:** https://github.com/Mendeley/mendeley-api
- **Support:** https://support.mendeley.com/

## Rate Limits

- **Free tier:** 100 requests per hour
- **Premium tiers:** Higher limits available
- **Rate limiting headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Quota management:** Hourly reset
- **Token management:** OAuth 2.0 with refresh tokens
- **Bulk operations:** Special handling for large-scale requests

## API Endpoints

### Catalog Search
```bash
# Search catalog papers
https://api.mendeley.com/search/catalog?query=machine+learning

# Search with filters
https://api.mendeley.com/search/catalog?query=artificial+intelligence&view=3&limit=50

# Get paper details
https://api.mendeley.com/catalog/{document_id}
```

### User Libraries
```bash
# Get user's documents
https://api.mendeley.com/documents

# Get group documents
https://api.mendeley.com/groups/{group_id}/documents

# Get annotations
https://api.mendeley.com/documents/{document_id}/annotations
```

### Profiles and Groups
```bash
# Get user profile
https://api.mendeley.com/profiles/me

# Get group details
https://api.mendeley.com/groups/{group_id}
```

## Implementation Examples

### Basic Catalog Search (JavaScript)
```javascript
class MendeleyAPI {
  constructor(clientId, clientSecret) {
    this.baseURL = 'https://api.mendeley.com';
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
    this.refreshToken = null;
    this.requestDelay = 100; // 36 requests/hour max
    this.lastRequest = 0;
  }

  async authenticate(username, password) {
    const tokenData = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: username,
      password: password,
      scope: 'all'
    });

    const response = await fetch('https://api.mendeley.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenData
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const tokens = await response.json();
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    return tokens;
  }

  async makeRequest(url, options = {}) {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequest;
    if (timeSinceLast < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLast));
    }
    this.lastRequest = Date.now();

    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const headers = {
      'Accept': 'application/vnd.mendeley-document.1+json',
      'Authorization': `Bearer ${this.accessToken}`,
      'User-Agent': 'AcademicExplorer/1.0'
    };

    const response = await fetch(url, { headers, ...options });

    if (response.status === 401 && this.refreshToken) {
      // Try to refresh token
      await this.refreshAccessToken();
      return this.makeRequest(url, options);
    }

    if (!response.ok) {
      throw new Error(`Mendeley API error: ${response.status}`);
    }

    return response.json();
  }

  async refreshAccessToken() {
    const tokenData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken
    });

    const response = await fetch('https://api.mendeley.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenData
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokens = await response.json();
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
  }

  async searchCatalog(query, options = {}) {
    const params = new URLSearchParams({
      query: query,
      limit: options.limit || 50,
      view: options.view || '3'
    });

    if (options.sort) params.append('sort', options.sort);
    if (options.order) params.append('order', options.order);

    const url = `${this.baseURL}/search/catalog?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data.length,
      papers: data.map(paper => this.parsePaperData(paper))
    };
  }

  parsePaperData(paperData) {
    return {
      id: paperData.id,
      title: paperData.title,
      authors: paperData.authors || [],
      year: paperData.year,
      source: paperData.source,
      abstract: paperData.abstract,
      doi: paperData.identifiers?.doi,
      pmid: paperData.identifiers?.pmid,
      arxiv: paperData.identifiers?.arxiv,
      type: paperData.type,
      tags: paperData.tags || [],
      keywords: paperData.keywords || [],
      added: paperData.created,
      modified: paperData.modified,
      profile_id: paperData.profile_id,
      read_flag: paperData.read_flag,
      starred_flag: paperData.starred_flag,
      confirmed_flag: paperData.confirmed_flag,
      hidden_flag: paperData.hidden_flag
    };
  }

  async getUserDocuments(options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || 100,
      view: options.view || 'all'
    });

    if (options.sort) params.append('sort', options.sort);
    if (options.order) params.append('order', options.order);

    const url = `${this.baseURL}/documents?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data.length,
      documents: data.map(doc => this.parseDocumentData(doc))
    };
  }

  parseDocumentData(docData) {
    return {
      id: docData.id,
      title: docData.title,
      type: docData.type,
      authors: docData.authors || [],
      year: docData.year,
      source: docData.source,
      abstract: docData.abstract,
      doi: docData.identifiers?.doi,
      pmid: docData.identifiers?.pmid,
      arxiv: docData.identifiers?.arxiv,
      tags: docData.tags || [],
      keywords: docData.keywords || [],
      added: docData.created,
      modified: docData.modified,
      read_flag: docData.read_flag,
      starred_flag: docData.starred_flag,
      confirmed_flag: docData.confirmed_flag,
      hidden_flag: docData.hidden_flag,
      file_attached: docData.file_attached,
      group_ids: docData.group_ids || []
    };
  }

  async getDocumentAnnotations(documentId) {
    const url = `${this.baseURL}/documents/${documentId}/annotations`;
    const data = await this.makeRequest(url);

    return data.map(annotation => ({
      id: annotation.id,
      document_id: annotation.document_id,
      type: annotation.type,
      text: annotation.text,
      note: annotation.note,
      color: annotation.color,
      positions: annotation.positions,
      created: annotation.created,
      modified: annotation.modified,
      profile_id: annotation.profile_id
    }));
  }

  async getGroupDocuments(groupId, options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || 100,
      view: options.view || 'all'
    });

    const url = `${this.baseURL}/groups/${groupId}/documents?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data.length,
      documents: data.map(doc => this.parseDocumentData(doc))
    };
  }

  async getUserProfile() {
    const url = `${this.baseURL}/profile/me`;
    const data = await this.makeRequest(url);

    return {
      id: data.id,
      display_name: data.display_name,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      created: data.created,
      verified: data.verified,
      discipline: data.discipline,
      academic_status: data.academic_status,
      link: data.link
    };
  }
}

// Usage
const mendeley = new MendeleyAPI('your-client-id', 'your-client-secret');

// First authenticate
mendeley.authenticate('your-email@example.com', 'your-password')
  .then(() => {
    // Search catalog
    return mendeley.searchCatalog('machine learning', { limit: 10 });
  })
  .then(result => {
    console.log(`Found ${result.total} papers`);
    result.papers.forEach(paper => {
      console.log(`- ${paper.title} (${paper.year})`);
    });
  });
```

### Advanced Research Management (Python)
```python
import requests
import time
from typing import List, Dict, Optional
from urllib.parse import urlencode

class MendeleyAPI:
    def __init__(self, client_id: str, client_secret: str):
        self.base_url = "https://api.mendeley.com"
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.refresh_token = None
        self.request_delay = 36  # 100 requests per hour
        self.last_request = 0

    def authenticate(self, username: str, password: str) -> Dict:
        """Authenticate with OAuth 2.0 password flow"""
        token_data = {
            'grant_type': 'password',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'username': username,
            'password': password,
            'scope': 'all'
        }

        response = requests.post(
            'https://api.mendeley.com/oauth/token',
            data=token_data
        )

        if response.status_code != 200:
            raise Exception(f"Authentication failed: {response.text}")

        tokens = response.json()
        self.access_token = tokens['access_token']
        self.refresh_token = tokens['refresh_token']
        return tokens

    def make_request(self, url: str, params: Dict = None) -> Dict:
        """Make authenticated API request"""
        now = time.time()
        if now - self.last_request < self.request_delay:
            time.sleep(self.request_delay - (now - self.last_request))

        self.last_request = time.time()

        if not self.access_token:
            raise Exception("Not authenticated")

        headers = {
            'Accept': 'application/vnd.mendeley-document.1+json',
            'Authorization': f'Bearer {self.access_token}',
            'User-Agent': 'AcademicExplorer/1.0'
        }

        response = requests.get(url, params=params, headers=headers)

        if response.status_code == 401 and self.refresh_token:
            self._refresh_access_token()
            return self.make_request(url, params)

        response.raise_for_status()
        return response.json()

    def _refresh_access_token(self):
        """Refresh access token"""
        token_data = {
            'grant_type': 'refresh_token',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'refresh_token': self.refresh_token
        }

        response = requests.post(
            'https://api.mendeley.com/oauth/token',
            data=token_data
        )

        if response.status_code != 200:
            raise Exception("Token refresh failed")

        tokens = response.json()
        self.access_token = tokens['access_token']
        self.refresh_token = tokens['refresh_token']

    def search_catalog(self, query: str, **kwargs) -> Dict:
        """Search Mendeley catalog"""
        params = {
            'query': query,
            'limit': kwargs.get('limit', 50),
            'view': kwargs.get('view', '3')
        }

        if kwargs.get('sort'):
            params['sort'] = kwargs['sort']
        if kwargs.get('order'):
            params['order'] = kwargs['order']

        url = f"{self.base_url}/search/catalog"
        data = self.make_request(url, params)

        return {
            'total': len(data),
            'papers': [self.parse_paper_data(paper) for paper in data]
        }

    def parse_paper_data(self, paper_data: Dict) -> Dict:
        """Parse paper data from API response"""
        return {
            'id': paper_data.get('id'),
            'title': paper_data.get('title', ''),
            'authors': paper_data.get('authors', []),
            'year': paper_data.get('year'),
            'source': paper_data.get('source'),
            'abstract': paper_data.get('abstract', ''),
            'doi': paper_data.get('identifiers', {}).get('doi'),
            'pmid': paper_data.get('identifiers', {}).get('pmid'),
            'arxiv': paper_data.get('identifiers', {}).get('arxiv'),
            'type': paper_data.get('type'),
            'tags': paper_data.get('tags', []),
            'keywords': paper_data.get('keywords', []),
            'added': paper_data.get('created'),
            'modified': paper_data.get('modified'),
            'profile_id': paper_data.get('profile_id'),
            'read_flag': paper_data.get('read_flag', False),
            'starred_flag': paper_data.get('starred_flag', False),
            'confirmed_flag': paper_data.get('confirmed_flag', False),
            'hidden_flag': paper_data.get('hidden_flag', False)
        }

    def analyze_reading_patterns(self, days_back: int = 30) -> Dict:
        """Analyze user's reading patterns"""
        # Get user documents
        documents = self.make_request(f"{self.base_url}/documents")

        patterns = {
            'total_documents': len(documents),
            'read_documents': 0,
            'starred_documents': 0,
            'recent_additions': 0,
            'top_sources': {},
            'reading_by_year': {}
        }

        cutoff_date = time.time() - (days_back * 24 * 60 * 60)

        for doc in documents:
            # Count flags
            if doc.get('read_flag'):
                patterns['read_documents'] += 1
            if doc.get('starred_flag'):
                patterns['starred_documents'] += 1

            # Recent additions
            doc_time = time.mktime(time.strptime(doc.get('created', ''), '%Y-%m-%dT%H:%M:%S.%fZ'))
            if doc_time > cutoff_date:
                patterns['recent_additions'] += 1

            # Top sources
            source = doc.get('source', 'Unknown')
            patterns['top_sources'][source] = patterns['top_sources'].get(source, 0) + 1

            # Reading by year
            year = doc.get('year', 'Unknown')
            if doc.get('read_flag'):
                patterns['reading_by_year'][year] = patterns['reading_by_year'].get(year, 0) + 1

        return patterns

    def discover_collaborative_interests(self, group_id: str) -> Dict:
        """Analyze group collaborative interests"""
        # Get group documents
        url = f"{self.base_url}/groups/{group_id}/documents"
        documents = self.make_request(url)

        interests = {
            'total_documents': len(documents),
            'common_tags': {},
            'top_authors': {},
            'publication_years': {},
            'document_types': {}
        }

        for doc in documents:
            # Analyze tags
            for tag in doc.get('tags', []):
                interests['common_tags'][tag] = interests['common_tags'].get(tag, 0) + 1

            # Top authors
            for author in doc.get('authors', []):
                interests['top_authors'][author] = interests['top_authors'].get(author, 0) + 1

            # Publication years
            year = doc.get('year', 'Unknown')
            interests['publication_years'][year] = interests['publication_years'].get(year, 0) + 1

            # Document types
            doc_type = doc.get('type', 'Unknown')
            interests['document_types'][doc_type] = interests['document_types'].get(doc_type, 0) + 1

        return interests

    def get_document_insights(self, document_id: str) -> Dict:
        """Get comprehensive insights about a document"""
        # Get document details
        document = self.make_request(f"{self.base_url}/documents/{document_id}")

        # Get annotations
        annotations = self.make_request(f"{self.base_url}/documents/{document_id}/annotations")

        insights = {
            'document': self.parse_document_data(document),
            'annotations_count': len(annotations),
            'annotation_types': {},
            'highlights': [],
            'notes': []
        }

        for annotation in annotations:
            # Count annotation types
            ann_type = annotation.get('type', 'Unknown')
            insights['annotation_types'][ann_type] = insights['annotation_types'].get(ann_type, 0) + 1

            # Extract highlights and notes
            if ann_type == 'highlight':
                insights['highlights'].append({
                    'text': annotation.get('text', ''),
                    'color': annotation.get('color', 'yellow'),
                    'created': annotation.get('created')
                })
            elif ann_type == 'note':
                insights['notes'].append({
                    'text': annotation.get('text', ''),
                    'note': annotation.get('note', ''),
                    'created': annotation.get('created')
                })

        return insights

    def parse_document_data(self, doc_data: Dict) -> Dict:
        """Parse document data for insights"""
        return {
            'id': doc_data.get('id'),
            'title': doc_data.get('title', ''),
            'type': doc_data.get('type'),
            'authors': doc_data.get('authors', []),
            'year': doc_data.get('year'),
            'source': doc_data.get('source'),
            'abstract': doc_data.get('abstract', ''),
            'doi': doc_data.get('identifiers', {}).get('doi'),
            'pmid': doc_data.get('identifiers', {}).get('pmid'),
            'arxiv': doc_data.get('identifiers', {}).get('arxiv'),
            'tags': doc_data.get('tags', []),
            'keywords': doc_data.get('keywords', []),
            'added': doc_data.get('created'),
            'modified': doc_data.get('modified'),
            'read_flag': doc_data.get('read_flag', False),
            'starred_flag': doc_data.get('starred_flag', False),
            'confirmed_flag': doc_data.get('confirmed_flag', False),
            'hidden_flag': doc_data.get('hidden_flag', False),
            'file_attached': doc_data.get('file_attached', False),
            'group_ids': doc_data.get('group_ids', [])
        }

# Usage
mendeley = MendeleyAPI('your-client-id', 'your-client-secret')

# Authenticate
mendeley.authenticate('your-email@example.com', 'your-password')

# Search catalog
result = mendeley.search_catalog('machine learning', limit=10)
print(f"Found {result['total']} papers")

# Analyze reading patterns
patterns = mendeley.analyze_reading_patterns(days_back=30)
print(f"Reading patterns: {patterns}")

# Get document insights
if result['papers']:
    insights = mendeley.get_document_insights(result['papers'][0]['id'])
    print(f"Document insights: {insights}")
```

## Data Models

### Document Object Structure
```json
{
  "id": "12345678-1234-1234-1234-123456789012",
  "title": "Machine Learning Applications in Scientific Research",
  "type": "journal",
  "authors": ["Smith, John", "Doe, Jane"],
  "year": 2023,
  "source": "Nature Machine Intelligence",
  "abstract": "This paper explores novel applications of machine learning...",
  "identifiers": {
    "doi": "10.1038/s42256-023-00123",
    "pmid": "12345678",
    "arxiv": "2301.12345"
  },
  "tags": ["machine learning", "artificial intelligence", "scientific research"],
  "keywords": ["ML", "AI", "research"],
  "created": "2023-01-15T10:30:00.000Z",
  "modified": "2023-01-16T15:45:00.000Z",
  "read_flag": true,
  "starred_flag": false,
  "confirmed_flag": true,
  "hidden_flag": false,
  "file_attached": true,
  "group_ids": ["87654321-4321-4321-4321-210987654321"]
}
```

### Annotation Object Structure
```json
{
  "id": "87654321-4321-4321-4321-210987654321",
  "document_id": "12345678-1234-1234-1234-123456789012",
  "type": "highlight",
  "text": "novel applications of machine learning",
  "note": "Important concept for research",
  "color": "yellow",
  "positions": [
    {
      "page": 1,
      "rect": [100, 200, 300, 50]
    }
  ],
  "created": "2023-01-16T14:20:00.000Z",
  "modified": "2023-01-16T14:25:00.000Z",
  "profile_id": "98765432-1234-1234-1234-123456789012"
}
```

## Common Use Cases

### 1. Bibliographic Management
```javascript
// Organize papers by tags and reading status
async function organizeLibrary(mendeleyAPI) {
  const documents = await mendeleyAPI.getUserDocuments();

  const library = {
    unread: [],
    starred: [],
    byTags: {},
    recent: []
  };

  documents.documents.forEach(doc => {
    if (!doc.read_flag) library.unread.push(doc);
    if (doc.starred_flag) library.starred.push(doc);

    doc.tags.forEach(tag => {
      if (!library.byTags[tag]) library.byTags[tag] = [];
      library.byTags[tag].push(doc);
    });

    const addedDate = new Date(doc.added);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    if (addedDate > monthAgo) {
      library.recent.push(doc);
    }
  });

  return library;
}
```

### 2. Research Collaboration Analysis
```python
# Analyze group collaboration patterns
def analyze_group_collaboration(mendeley_api, group_id):
    interests = mendeley_api.discover_collaborative_interests(group_id)

    # Get top contributors by document count
    top_authors = dict(sorted(interests['top_authors'].items(),
                           key=lambda x: x[1], reverse=True)[:10])

    # Identify emerging topics from recent tags
    common_tags = dict(sorted(interests['common_tags'].items(),
                            key=lambda x: x[1], reverse=True)[:20])

    return {
        'group_size': len(interests),
        'top_authors': top_authors,
        'emerging_topics': common_tags,
        'research_focus': interests['document_types'],
        'timeline': interests['publication_years']
    }
```

## Best Practices

1. **Manage tokens carefully** - Implement secure token storage and refresh logic
2. **Respect rate limits** - The API is limited to 100 requests/hour
3. **Cache catalog data** - Catalog searches don't change frequently
4. **Use specific queries** - Narrow searches to reduce API calls
5. **Handle pagination** - Process large result sets efficiently
6. **Validate document types** - Check document format before processing

## Error Handling

```javascript
async function robustMendeleyRequest(mendeleyAPI, requestFunction, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await requestFunction();
    } catch (error) {
      if (error.message.includes('401')) {
        // Authentication error - try refreshing token
        try {
          await mendeleyAPI.refreshAccessToken();
          continue;
        } catch (refreshError) {
          throw new Error('Authentication failed - please re-authenticate');
        }
      }
      if (error.message.includes('429')) {
        // Rate limit exceeded
        const delay = Math.pow(2, attempt) * 5000; // Longer delays
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

- **Zotero API** - For reference management and annotation
- **Papers API** - For literature management
- **ReadCube Papers API** - For reference organization
- **Semantic Scholar API** - For paper recommendations
- **OpenAlex API** - For comprehensive scholarly data

## Support

- **API Documentation:** https://dev.mendeley.com/reference.html
- **Developer Portal:** https://dev.mendeley.com/
- **OAuth 2.0 Guide:** https://dev.mendeley.com/oauth.html
- **GitHub:** https://github.com/Mendeley/mendeley-api
- **Support:** https://support.mendeley.com/

---

*Last updated: 2025-10-27*
