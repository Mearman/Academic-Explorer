# ORCID API Documentation

**Category:** Researcher Identity
**Data Type:** Researcher profiles, publications, affiliations
**API Type:** REST API
**Authentication:** OAuth 2.0 required for member API
**Rate Limits:** Public API: 24 requests per second per IP

## Overview

ORCID (Open Researcher and Contributor ID) provides persistent digital identifiers (ORCID iDs) for researchers and a comprehensive registry of researcher information. The API enables programmatic access to researcher profiles, publications, affiliations, funding, and other research outputs, serving as a crucial component in the scholarly research infrastructure.

## Key Features

- **18+ million researcher profiles** with unique ORCID iDs
- **Persistent digital identifiers** that follow researchers throughout their careers
- **Comprehensive researcher profiles** including publications, affiliations, funding, and more
- **Public API** for basic read access to public profile information
- **Member API** with OAuth 2.0 for full read/write access and integration
- **Real-time synchronization** with institutional systems
- **Cross-referencing** with other major research identifiers (DOIs, ISNIs, RORs)
- **Privacy controls** allowing researchers to manage visibility of their information

## Documentation

- **API Documentation:** https://info.orcid.org/documentation/api-tutorials/
- **Public API:** https://pub.orcid.org/v3.0/
- **Member API:** https://api.orcid.org/v3.0/
- **Developer Guide:** https://info.orcid.org/developers/
- **API Terms:** https://info.orcid.org/documentation/api-tutorials/api-terms-and-conditions/
- **GraphQL API:** https://developer.orcid.org/ (beta)

## Authentication

### Public API
- **No authentication required** for basic read access to public profiles
- **Rate limited** to 24 requests per second per IP address
- **Limited access** to public profile information only

### Member API
- **OAuth 2.0 authentication** required for full access
- **Client credentials** and **member credentials** flows supported
- **Three-legged OAuth** for user authorization
- **API keys** provided upon approval of developer application
- **Higher rate limits** for authenticated requests

## Rate Limits

- **Public API:** 24 requests per second per IP address
- **Member API:** 1,000 requests per second for production systems
- **Sandbox API:** 1,000 requests per second for testing
- **Burst requests** may be throttled during peak usage
- **Implement backoff strategies** for rate limit handling

## API Endpoints

### Public API Endpoints
```bash
# Get public profile by ORCID iD
https://pub.orcid.org/v3.0/0000-0002-1234-5678/record

# Search for researchers
https://pub.orcid.org/v3.0/search?q=family-name:Smith+given-name:John

# Get specific record sections
https://pub.orcid.org/v3.0/0000-0002-1234-5678/activities
https://pub.orcid.org/v3.0/0000-0002-1234-5678/works
```

### Member API Endpoints
```bash
# Full record access (requires OAuth)
https://api.orcid.org/v3.0/0000-0002-1234-5678/record

# Record management
https://api.orcid.org/v3.0/0000-0002-1234-5678/work
https://api.orcid.org/v3.0/0000-0002-1234-5678/employment
https://api.orcid.org/v3.0/0000-0002-1234-5678/funding

# Webhook notifications
https://api.orcid.org/v3.0/0000-0002-1234-5678/webhook
```

## Implementation Examples

### Public API Usage (JavaScript)
```javascript
class ORCIDPublicAPI {
  constructor() {
    this.baseURL = 'https://pub.orcid.org/v3.0';
    this.requestDelay = 42; // ~24 requests per second
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

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AcademicExplorer/1.0 (mailto:your-email@example.com)',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`ORCID API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getPublicProfile(orcid) {
    const url = `${this.baseURL}/${orcid}/record`;
    const data = await this.makeRequest(url);
    return this.parseProfile(data);
  }

  parseProfile(data) {
    const person = data.person || {};
    const activities = data['activities-summary'] || {};

    return {
      orcid: data['orcid-identifier']?.path || '',
      created: data['created-date']?.value || null,
      lastModified: data['last-modified-date']?.value || null,
      name: this.parseName(person.name),
      biography: person.biography || null,
      websites: person.researcherUrls?.['researcher-url'] || [],
      emails: person.emails?.email || [],
      addresses: person.addresses?.address || [],
      keywords: person.keywords?.keyword || [],
      externalIdentifiers: person['external-identifiers']?.['external-identifier'] || [],
      employments: activities.employments?.['employment-group'] || [],
      educations: activities.educations?.['education-group'] || [],
      works: activities.works?.group || [],
      funding: activities.funding?.['funding-group'] || [],
      peerReviews: activities['peer-reviews']?.group || []
    };
  }

  parseName(name) {
    if (!name) return null;

    return {
      givenNames: name['given-names']?.value || '',
      familyName: name['family-name']?.value || '',
      creditName: name['credit-name']?.value || null,
      source: name['source'] || null
    };
  }

  async searchResearchers(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      rows: options.rows || 20,
      start: options.start || 0,
      sort: options.sort || 'relevance-score-desc'
    });

    const url = `${this.baseURL}/search?${params}`;
    const data = await this.makeRequest(url);

    return {
      total: data['num-found'] || 0,
      start: data.start || 0,
      researchers: data.result?.map(result => this.parseSearchResult(result)) || []
    };
  }

  parseSearchResult(result) {
    return {
      orcid: result['orcid-identifier']?.path || '',
      relevanceScore: result['relevance-score'] || 0,
      givenNames: result['given-names'] || '',
      familyName: result['family-names'] || '',
      creditName: result['credit-name'] || null,
      currentInstitution: result['current-institution'] || null,
      otherNames: result['other-names'] || []
    };
  }

  async getResearcherWorks(orcid) {
    const url = `${this.baseURL}/${orcid}/works`;
    const data = await this.makeRequest(url);
    return data.group?.map(work => this.parseWork(work)) || [];
  }

  parseWork(work) {
    const summary = work['work-summary'][0];

    return {
      title: summary.title?.title?.value || '',
      subtitle: summary.title?.subtitle?.value || null,
      translatedTitle: summary.title?.['translated-title']?.value || null,
      type: summary.type || null,
      publicationDate: summary['publication-date']?.year?.value || null,
      journal: summary['journal-title']?.value || null,
      doi: this.getExternalId(summary['external-ids'], 'doi'),
      url: summary.url?.value || null,
      visibility: summary.visibility || null,
      lastModified: summary['last-modified-date']?.value || null
    };
  }

  getExternalId(externalIds, type) {
    if (!externalIds || !externalIds['external-id']) return null;

    const id = externalIds['external-id'].find(id =>
      id['external-id-type']?.toLowerCase() === type.toLowerCase()
    );

    return id ? id['external-id-value'] : null;
  }

  async getResearcherEmployments(orcid) {
    const url = `${this.baseURL}/${orcid}/employments`;
    const data = await this.makeRequest(url);
    return data['employment-group']?.map(employment => this.parseEmployment(employment)) || [];
  }

  parseEmployment(employment) {
    const summary = employment['employment-summary'][0];

    return {
      organization: summary['organization']?.name || null,
      department: summary['department-name'] || null,
      role: summary['role-title'] || null,
      startDate: summary['start-date']?.year?.value || null,
      endDate: summary['end-date']?.year?.value || null,
      address: summary['organization']?.address || null,
      visibility: summary.visibility || null
    };
  }
}

// Usage example
const orcid = new ORCIDPublicAPI();

// Get researcher profile
orcid.getPublicProfile('0000-0002-1234-5678').then(profile => {
  console.log(`Name: ${profile.name?.givenNames} ${profile.name?.familyName}`);
  console.log(`Works: ${profile.works.length}`);
  console.log(`Employments: ${profile.employments.length}`);
});

// Search for researchers
orcid.searchResearchers('machine learning smith', { rows: 10 }).then(results => {
  console.log(`Found ${results.total} researchers`);
  results.researchers.forEach(researcher => {
    console.log(`- ${researcher.givenNames} ${researcher.familyName} (${researcher.orcid})`);
    console.log(`  Institution: ${researcher.currentInstitution || 'Not specified'}`);
  });
});
```

### Member API Usage with OAuth (Python)
```python
import requests
import time
from typing import Dict, List, Optional
from dataclasses import dataclass
import json

@dataclass
class ORCIDProfile:
    orcid: str
    name: Optional[Dict]
    biography: Optional[str]
    websites: List[Dict]
    emails: List[Dict]
    employments: List[Dict]
    educations: List[Dict]
    works: List[Dict]

class ORCIDMemberAPI:
    def __init__(self, client_id: str, client_secret: str, sandbox: bool = False):
        self.base_url = "https://api.sandbox.orcid.org/v3.0" if sandbox else "https://api.orcid.org/v3.0"
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.request_delay = 0.001  # ~1000 requests per second
        self.last_request = 0

    def get_access_token(self) -> str:
        """Get OAuth 2.0 access token using client credentials flow."""
        url = f"{self.base_url}/oauth/token"

        auth = (self.client_id, self.client_secret)
        data = {
            'grant_type': 'client_credentials',
            'scope': '/read-limited'
        }

        response = requests.post(url, auth=auth, data=data)
        response.raise_for_status()

        token_data = response.json()
        self.access_token = token_data['access_token']
        return self.access_token

    def _make_request(self, url: str, method: str = 'GET', **kwargs) -> Dict:
        """Make authenticated API request with rate limiting."""
        if not self.access_token:
            self.get_access_token()

        # Rate limiting
        now = time.time()
        time_since_last = now - self.last_request
        if time_since_last < self.request_delay:
            time.sleep(self.request_delay - time_since_last)
        self.last_request = time.time()

        headers = kwargs.pop('headers', {})
        headers.update({
            'Authorization': f'Bearer {self.access_token}',
            'Accept': 'application/json',
            'User-Agent': 'AcademicExplorer/1.0 (mailto:your-email@example.com)'
        })

        response = requests.request(method, url, headers=headers, **kwargs)
        response.raise_for_status()
        return response.json()

    def get_full_record(self, orcid: str) -> ORCIDProfile:
        """Get complete researcher record."""
        url = f"{self.base_url}/{orcid}/record"
        data = self._make_request(url)
        return self._parse_profile(data)

    def _parse_profile(self, data: Dict) -> ORCIDProfile:
        """Parse researcher profile data."""
        person = data.get('person', {})
        activities = data.get('activities-summary', {})

        return ORCIDProfile(
            orcid=data.get('orcid-identifier', {}).get('path', ''),
            name=self._parse_name(person.get('name')),
            biography=person.get('biography', {}).get('value') if person.get('biography') else None,
            websites=person.get('researcher-urls', {}).get('researcher-url', []) if person.get('researcher-urls') else [],
            emails=person.get('emails', {}).get('email', []) if person.get('emails') else [],
            employments=activities.get('employments', {}).get('employment-group', []) if activities.get('employments') else [],
            educations=activities.get('educations', {}).get('education-group', []) if activities.get('educations') else [],
            works=activities.get('works', {}).get('group', []) if activities.get('works') else []
        )

    def _parse_name(self, name_data: Dict) -> Optional[Dict]:
        """Parse name data."""
        if not name_data:
            return None
        return {
            'given_names': name_data.get('given-names', {}).get('value', ''),
            'family_name': name_data.get('family-name', {}).get('value', ''),
            'credit_name': name_data.get('credit-name', {}).get('value') if name_data.get('credit-name') else None
        }

    def add_work(self, orcid: str, work_data: Dict) -> Dict:
        """Add a new work to researcher profile."""
        url = f"{self.base_url}/{orcid}/work"

        work_payload = {
            'title': {
                'title': {
                    'value': work_data['title']
                }
            },
            'type': work_data.get('type', 'JOURNAL_ARTICLE'),
            'external-ids': {
                'external-id': []
            }
        }

        # Add DOI if provided
        if work_data.get('doi'):
            work_payload['external-ids']['external-id'].append({
                'external-id-type': 'doi',
                'external-id-value': work_data['doi'],
                'external-id-relationship': 'SELF'
            })

        # Add URL if provided
        if work_data.get('url'):
            work_payload['url'] = {
                'value': work_data['url']
            }

        data = self._make_request(url, method='POST', json=work_payload)
        return data

    def add_employment(self, orcid: str, employment_data: Dict) -> Dict:
        """Add employment information."""
        url = f"{self.baseURL}/{orcid}/employment"

        employment_payload = {
            'department-name': employment_data.get('department', ''),
            'role-title': employment_data.get('title', ''),
            'organization': {
                'name': employment_data['organization'],
                'address': employment_data.get('address', {})
            }
        }

        if employment_data.get('start_date'):
            employment_payload['start-date'] = {
                'year': {'value': employment_data['start_date']}
            }

        data = self._make_request(url, method='POST', json=employment_payload)
        return data

    def search_with_full_access(self, query: str, rows: int = 20) -> Dict:
        """Search with member API access."""
        params = {
            'q': query,
            'rows': rows
        }

        url = f"{self.base_url}/search"
        data = self._make_request(url, params=params)

        return {
            'total': data.get('num-found', 0),
            'results': data.get('result', [])
        }

# Usage example
# Initialize with your ORCID member API credentials
orcid_api = ORCIDMemberAPI(
    client_id='your-client-id',
    client_secret='your-client-secret',
    sandbox=True  # Use sandbox for testing
)

# Get full researcher record
profile = orcid_api.get_full_record('0000-0002-1234-5678')
print(f"Researcher: {profile.name}")

# Add a new work
new_work = {
    'title': 'Machine Learning for Climate Science',
    'doi': '10.1038/s41586-023-01234-x',
    'type': 'JOURNAL_ARTICLE',
    'url': 'https://nature.com/articles/...'
}

try:
    result = orcid_api.add_work('0000-0002-1234-5678', new_work)
    print("Work added successfully")
except Exception as e:
    print(f"Error adding work: {e}")
```

### Research Collaboration Network Analysis
```javascript
class ORCIDNetworkAnalyzer {
  constructor(orcidAPI) {
    this.orcid = orcidAPI;
  }

  async buildCollaborationNetwork(seedORCIDs, maxDepth = 2) {
    const network = {
      nodes: new Map(),
      edges: [],
      metadata: {
        totalResearchers: 0,
        totalConnections: 0,
        maxDepth: maxDepth
      }
    };

    const visited = new Set();
    const queue = seedORCIDs.map(orcid => ({ orcid, depth: 0 }));

    while (queue.length > 0) {
      const { orcid, depth } = queue.shift();

      if (visited.has(orcid) || depth > maxDepth) continue;
      visited.add(orcid);

      try {
        const profile = await this.orcid.getPublicProfile(orcid);

        // Add node to network
        network.nodes.set(orcid, {
          orcid,
          name: profile.name ? `${profile.name.givenNames} ${profile.name.familyName}` : 'Unknown',
          worksCount: profile.works.length,
          employmentsCount: profile.employments.length,
          depth
        });

        // Process co-authors from works
        for (const work of profile.works.slice(0, 10)) { // Limit to avoid API overuse
          if (depth < maxDepth) {
            // This would need additional logic to extract co-authors
            // For now, we'll add placeholder connections
            const collaborators = await this.extractCoAuthors(work);

            for (const collaborator of collaborators) {
              if (!visited.has(collaborator.orcid)) {
                queue.push({ orcid: collaborator.orcid, depth: depth + 1 });
              }

              // Add edge
              if (!network.edges.some(edge =>
                (edge.source === orcid && edge.target === collaborator.orcid) ||
                (edge.target === orcid && edge.source === collaborator.orcid)
              )) {
                network.edges.push({
                  source: orcid,
                  target: collaborator.orcid,
                  type: 'coauthorship',
                  weight: 1,
                  work: work.title
                });
              }
            }
          }
        }

      } catch (error) {
        console.warn(`Failed to fetch profile for ${orcid}: ${error.message}`);
      }
    }

    network.metadata.totalResearchers = network.nodes.size;
    network.metadata.totalConnections = network.edges.length;

    return network;
  }

  async extractCoAuthors(work) {
    // This is a simplified implementation
    // In practice, you'd need to cross-reference with other APIs
    // to find co-authors from work metadata
    return [];
  }

  async analyzeInstitutionCollaborations(orcid) {
    const profile = await this.orcid.getPublicProfile(orcid);
    const collaborations = {
      researcher: {
        orcid,
        name: profile.name ? `${profile.name.givenNames} ${profile.name.familyName}` : 'Unknown'
      },
      institutions: {},
      collaborations: []
    };

    // Analyze employment history
    profile.employments.forEach(employment => {
      const institution = employment.organization;
      if (institution) {
        if (!collaborations.institutions[institution]) {
          collaborations.institutions[institution] = {
            name: institution,
            employments: [],
            works: []
          };
        }
        collaborations.institutions[institution].employments.push({
          role: employment.role,
          startDate: employment.startDate,
          endDate: employment.endDate
        });
      }
    });

    // Analyze works by institution
    profile.works.forEach(work => {
      // This would require additional data to match works to institutions
      // For demonstration, we'll add a placeholder
      const institution = work.journal || 'Unknown Institution';
      if (collaborations.institutions[institution]) {
        collaborations.institutions[institution].works.push({
          title: work.title,
          year: work.publicationDate,
          type: work.type
        });
      }
    });

    return collaborations;
  }

  generateNetworkStatistics(network) {
    const stats = {
      totalResearchers: network.nodes.size,
      totalConnections: network.edges.length,
      averageConnections: 0,
      mostConnectedResearchers: [],
      institutionDistribution: {},
      depthDistribution: {}
    };

    if (network.nodes.size > 0) {
      stats.averageConnections = network.edges.length / network.nodes.size;

      // Calculate connection counts per researcher
      const connectionCounts = new Map();
      network.edges.forEach(edge => {
        connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
        connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
      });

      // Find most connected researchers
      stats.mostConnectedResearchers = Array.from(connectionCounts.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([orcid, count]) => {
          const node = network.nodes.get(orcid);
          return {
            orcid,
            name: node.name,
            connections: count
          };
        });
    }

    // Calculate depth distribution
    network.nodes.forEach(node => {
      const depth = node.depth;
      stats.depthDistribution[depth] = (stats.depthDistribution[depth] || 0) + 1;
    });

    return stats;
  }
}

// Usage example
const analyzer = new ORCIDNetworkAnalyzer(orcid);

// Build collaboration network
const seedORCIDs = ['0000-0002-1234-5678', '0000-0002-9876-5432'];
analyzer.buildCollaborationNetwork(seedORCIDs, 2).then(network => {
  const stats = analyzer.generateNetworkStatistics(network);

  console.log(`Network Analysis:`);
  console.log(`- Total researchers: ${stats.totalResearchers}`);
  console.log(`- Total connections: ${stats.totalConnections}`);
  console.log(`- Average connections: ${stats.averageConnections.toFixed(2)}`);
  console.log(`- Top connected researchers:`, stats.mostConnectedResearchers.slice(0, 5));
});
```

## Data Models

### ORCID iD Structure
```json
{
  "orcid-identifier": {
    "uri": "https://orcid.org/0000-0002-1234-5678",
    "path": "0000-0002-1234-5678",
    "host": "orcid.org"
  }
}
```

### Profile Object Structure
```json
{
  "orcid-identifier": {
    "path": "0000-0002-1234-5678"
  },
  "person": {
    "name": {
      "given-names": {"value": "John"},
      "family-name": {"value": "Smith"},
      "credit-name": {"value": "John Smith"}
    },
    "biography": {
      "value": "Researcher in machine learning...",
      "visibility": "public"
    },
    "emails": {
      "email": [
        {
          "email": "john.smith@university.edu",
          "verified": true,
          "visibility": "public"
        }
      ]
    },
    "researcher-urls": {
      "researcher-url": [
        {
          "url-name": "Personal Website",
          "url": {"value": "https://johnsmith.university.edu"},
          "visibility": "public"
        }
      ]
    }
  },
  "activities-summary": {
    "employments": {
      "employment-group": [
        {
          "employment-summary": [
            {
              "organization": {
                "name": "University of Example",
                "address": {
                  "city": "Cambridge",
                  "country": "GB"
                }
              },
              "role-title": "Professor of Computer Science",
              "start-date": {"year": {"value": "2018"}},
              "visibility": "public"
            }
          ]
        }
      ]
    },
    "works": {
      "group": [
        {
          "work-summary": [
            {
              "title": {
                "title": {"value": "Machine Learning for Climate Science"}
              },
              "type": "JOURNAL_ARTICLE",
              "publication-date": {"year": {"value": "2023"}},
              "journal-title": {"value": "Nature Climate Change"},
              "external-ids": {
                "external-id": [
                  {
                    "external-id-type": "doi",
                    "external-id-value": "10.1038/s41586-023-01234-x",
                    "external-id-relationship": "SELF"
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  }
}
```

### Visibility Levels
- **`public`** - Visible to everyone
- **`trusted`** - Visible to trusted parties
- **`limited`** - Visible only to the researcher
- **`private`** - Hidden from all external access

## Common Use Cases

### Researcher Profile Management
```javascript
class ResearcherProfileManager {
  constructor(orcidAPI) {
    this.orcid = orcidAPI;
  }

  async createResearcherSummary(orcid) {
    const profile = await this.orcid.getPublicProfile(orcid);

    return {
      orcid,
      name: profile.name ? `${profile.name.givenNames} ${profile.name.familyName}` : 'Unknown',
      biography: profile.biography || 'No biography available',
      websites: profile.websites.length > 0 ? profile.websites.map(w => ({
        name: w['url-name'],
        url: w.url.value
      })) : [],
      statistics: {
        totalWorks: profile.works.length,
        totalEmployments: profile.employments.length,
        totalEducations: profile.educations.length
      },
      recentActivity: this.getRecentActivity(profile),
      expertise: this.extractExpertise(profile)
    };
  }

  getRecentActivity(profile) {
    const recentWorks = profile.works
      .filter(work => work.publicationDate)
      .sort((a, b) => (b.publicationDate || 0) - (a.publicationDate || 0))
      .slice(0, 5);

    return recentWorks.map(work => ({
      title: work.title,
      year: work.publicationDate,
      type: work.type,
      journal: work.journal
    }));
  }

  extractExpertise(profile) {
    const expertise = new Set();

    // Extract from work titles
    profile.works.forEach(work => {
      const title = work.title.toLowerCase();
      if (title.includes('machine learning')) expertise.add('Machine Learning');
      if (title.includes('climate')) expertise.add('Climate Science');
      // Add more pattern matching as needed
    });

    return Array.from(expertise);
  }

  async compareResearchers(orcid1, orcid2) {
    const [profile1, profile2] = await Promise.all([
      this.createResearcherSummary(orcid1),
      this.createResearcherSummary(orcid2)
    ]);

    return {
      researcher1: profile1,
      researcher2: profile2,
      comparison: {
        commonInstitutions: this.findCommonInstitutions(profile1, profile2),
        collaborationPotential: this.assessCollaborationPotential(profile1, profile2),
        sharedExpertise: this.findSharedExpertise(profile1, profile2)
      }
    };
  }

  findCommonInstitutions(profile1, profile2) {
    const institutions1 = new Set(profile1.employments.map(e => e.organization));
    const institutions2 = new Set(profile2.employments.map(e => e.organization));

    return Array.from(institutions1).filter(inst => institutions2.has(inst));
  }

  assessCollaborationPotential(profile1, profile2) {
    const score = 0;
    const reasons = [];

    // Check shared institutions
    const sharedInstitutions = this.findCommonInstitutions(profile1, profile2);
    if (sharedInstitutions.length > 0) {
      score += 30;
      reasons.push(`Shared institution(s): ${sharedInstitutions.join(', ')}`);
    }

    // Check shared expertise
    const sharedExpertise = this.findSharedExpertise(profile1, profile2);
    if (sharedExpertise.length > 0) {
      score += 20 * sharedExpertise.length;
      reasons.push(`Shared expertise: ${sharedExpertise.join(', ')}`);
    }

    return { score: Math.min(100, score), reasons };
  }

  findSharedExpertise(profile1, profile2) {
    const expertise1 = new Set(profile1.expertise);
    const expertise2 = new Set(profile2.expertise);

    return Array.from(expertise1).filter(exp => expertise2.has(exp));
  }
}

// Usage example
const profileManager = new ResearcherProfileManager(orcid);

profileManager.createResearcherSummary('0000-0002-1234-5678').then(summary => {
  console.log(`Researcher: ${summary.name}`);
  console.log(`Publications: ${summary.statistics.totalWorks}`);
  console.log(`Recent activity:`, summary.recentActivity);
  console.log(`Expertise:`, summary.expertise.join(', '));
});
```

## Best Practices

1. **Always check visibility levels** before accessing or displaying information
2. **Implement proper rate limiting** for both public and member APIs
3. **Cache public profile data** to reduce API calls
4. **Use sandbox environment** for development and testing
5. **Handle OAuth token expiration** and refresh logic
6. **Resect researcher privacy settings** and data visibility preferences
7. **Implement webhooks** for real-time updates when using member API
8. **Validate ORCID iDs** format before making API calls (16-digit format: 0000-0000-0000-0000)

## Error Handling

```javascript
async function robustORCIDRequest(orcidAPI, requestFunction, retries = 3) {
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
        // Profile not found - don't retry
        throw new Error('ORCID profile not found');
      }

      if (error.message.includes('401') || error.message.includes('403')) {
        // Authentication/authorization error
        throw new Error('Authentication failed. Check API credentials.');
      }

      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Alternatives

- **Scopus Author API** - For author profiles with citation metrics
- **Web of Science ResearcherID** - For researcher identification and profiling
- **OpenAlex Authors API** - For comprehensive author profiles
- **Crossref Metadata** - For author information in publication metadata

## Support

- **API Documentation:** https://info.orcid.org/documentation/api-tutorials/
- **Developer Portal:** https://info.orcid.org/developers/
- **Support Tickets:** https://orcid.org/help/contact-us
- **GitHub:** https://github.com/ORCID
- **Status Page:** https://status.orcid.org/

---

*Last updated: 2025-10-27*