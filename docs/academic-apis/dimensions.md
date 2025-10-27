# Dimensions API Documentation

**Category:** Research Intelligence & Analytics
**Data Type:** Publications, citations, grants, patents, clinical trials, policy documents
**API Type:** REST API + GraphQL API
**Authentication:** API key required
**Rate Limits:** Varies by subscription (Free tier: 25,000 requests/month)

## Overview

Dimensions is a next-generation research intelligence platform that provides access to the world's largest collection of linked research data. It integrates publications, citations, grants, patents, clinical trials, and policy documents from thousands of sources worldwide, enabling comprehensive research analytics and discovery.

## Key Features

- **140+ million publications** with comprehensive metadata and citation data
- **500+ million citations** with detailed reference information
- **$5+ trillion in research funding** from global grant databases
- **150+ million patents** with citation and family information
- **1+ million clinical trials** with outcomes and status tracking
- **1+ million policy documents** linking research to policy impact
- **Advanced GraphQL API** for complex data queries
- **Real-time research trend analysis** and emerging topic identification
- **Cross-domain linking** connecting publications to grants, patents, and clinical outcomes

## Documentation

- **API Documentation:** https://docs.dimensions.ai/dsl/api.html
- **GraphQL Documentation:** https://docs.dimensions.ai/dsl/graphql.html
- **Developer Portal:** https://app.dimensions.ai/api
- **Main Site:** https://www.dimensions.ai/
- **API Explorer:** https://ds.dimensions.ai/api/explorer/
- **Support:** https://support.dimensions.ai/

## Rate Limits

- **Free tier:** 25,000 requests per month
- **Professional tier:** 100,000 requests per month
- **Enterprise tier:** Custom limits available
- **Rate limiting headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Quota management:** Monthly reset cycle
- **GraphQL query complexity limits:** 1000 complexity points per query

## API Endpoints

### Publications Search
```bash
# Search publications
https://app.dimensions.ai/api/dsl/v2/jsonql

# GraphQL endpoint
https://ds.dimensions.ai/api/graphql

# Get publication details
https://app.dimensions.ai/api/dsl/v2/publications/{id}
```

### Grants and Funding
```bash
# Search grants
https://app.dimensions.ai/api/dsl/v2/jsonql

# Get funding details
https://app.dimensions.ai/api/dsl/v2/grants/{id}
```

### Patents and Clinical Trials
```bash
# Search patents
https://app.dimensions.ai/api/dsl/v2/jsonql

# Search clinical trials
https://app.dimensions.ai/api/dsl/v2/jsonql
```

## Implementation Examples

### Basic Publication Search (JavaScript)
```javascript
class DimensionsAPI {
  constructor(apiKey) {
    this.baseURL = 'https://app.dimensions.ai/api/dsl/v2';
    this.graphQLURL = 'https://ds.dimensions.ai/api/graphql';
    this.apiKey = apiKey;
    this.requestDelay = 100; // Respect rate limits
    this.lastRequest = 0;
  }

  async makeRequest(url, data, method = 'POST') {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequest;
    if (timeSinceLast < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLast));
    }
    this.lastRequest = Date.now();

    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'AcademicExplorer/1.0'
    };

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (response.status === 401) {
        throw new Error('Invalid API key');
      }
      throw new Error(`Dimensions API error: ${response.status}`);
    }

    return response.json();
  }

  async searchPublications(query, options = {}) {
    const requestData = {
      query: options.dslQuery || this.buildDSLQuery(query, options),
      limit: options.limit || 50,
      skip: options.skip || 0
    };

    const url = `${this.baseURL}/jsonql`;
    const data = await this.makeRequest(url, requestData);

    return {
      total: data.stats.count,
      publications: data.data.map(pub => this.parsePublicationData(pub)),
      facets: data.facets || {}
    };
  }

  buildDSLQuery(query, options = {}) {
    let dslQuery = `search publications in title_only abstract for "${query}"`;

    // Add filters
    if (options.year) {
      dslQuery += ` where year = ${options.year}`;
    }
    if (options.fromYear && options.toYear) {
      dslQuery += ` where year >= ${options.fromYear} and year <= ${options.toYear}`;
    }
    if (options.journal) {
      dslQuery += ` where journal.title = "${options.journal}"`;
    }
    if (options.subject) {
      dslQuery += ` where category.name = "${options.subject}"`;
    }
    if (options.type) {
      dslQuery += ` where type = "${options.type}"`;
    }

    return dslQuery;
  }

  parsePublicationData(pubData) {
    return {
      id: pubData.id,
      title: pubData.title,
      authors: this.parseAuthors(pubData.authors),
      journal: this.parseJournal(pubData.journal),
      year: pubData.year,
      volume: pubData.volume,
      issue: pubData.issue,
      pages: pubData.pages,
      abstract: pubData.abstract,
      doi: pubData.doi,
      pmid: pubData.pmid,
      pmcid: pubData.pmcid,
      citations: pubData.times_cited || 0,
      recentCitations: pubData.recent_citations || 0,
      category: pubData.category,
      type: pubData.type,
      openAccess: pubData.open_access || false,
      funding: pubData.funding || [],
      concepts: pubData.concepts || [],
      keywords: pubData.keywords || [],
      dateAdded: pubData.date_added,
      dateIndexed: pubData.date_indexed
    };
  }

  parseAuthors(authors) {
    if (!authors || !Array.isArray(authors)) return [];
    return authors.map(author => ({
      name: author.first_name + ' ' + author.last_name,
      firstName: author.first_name,
      lastName: author.last_name,
      currentAffiliationId: author.current_organization_id,
      researcherId: author.researcher_id,
      orcid: author.orcid
    }));
  }

  parseJournal(journal) {
    if (!journal) return null;
    return {
      id: journal.id,
      title: journal.title,
      publisher: journal.publisher,
      issn: journal.issn,
      impactFactor: journal.impact_factor,
      sjr: journal.sjr,
      snip: journal.snip
    };
  }

  async searchGrants(query, options = {}) {
    const requestData = {
      query: options.dslQuery || this.buildGrantDSLQuery(query, options),
      limit: options.limit || 50,
      skip: options.skip || 0
    };

    const url = `${this.baseURL}/jsonql`;
    const data = await this.makeRequest(url, requestData);

    return {
      total: data.stats.count,
      grants: data.data.map(grant => this.parseGrantData(grant)),
      facets: data.facets || {}
    };
  }

  buildGrantDSLQuery(query, options = {}) {
    let dslQuery = `search grants for "${query}"`;

    if (options.fromYear && options.toYear) {
      dslQuery += ` where start_year >= ${options.fromYear} and start_year <= ${options.toYear}`;
    }
    if (options.funder) {
      dslQuery += ` where funder.name = "${options.funder}"`;
    }
    if (options.amount) {
      dslQuery += ` where amount >= ${options.amount}`;
    }

    return dslQuery;
  }

  parseGrantData(grantData) {
    return {
      id: grantData.id,
      title: grantData.title,
      abstract: grantData.abstract,
      investigators: this.parseInvestigators(grantData.investigators),
      funder: this.parseFunder(grantData.funder),
      amount: grantData.amount,
      currency: grantData.currency,
      startYear: grantData.start_year,
      endYear: grantData.end_year,
      activeYears: grantData.active_years,
      category: grantData.category,
      keywords: grantData.keywords || [],
      dateAdded: grantData.date_added
    };
  }

  parseInvestigators(investigators) {
    if (!investigators || !Array.isArray(investigators)) return [];
    return investigators.map(inv => ({
      name: inv.first_name + ' ' + inv.last_name,
      firstName: inv.first_name,
      lastName: inv.last_name,
      currentAffiliationId: inv.current_organization_id,
      researcherId: inv.researcher_id
    }));
  }

  parseFunder(funder) {
    if (!funder) return null;
    return {
      id: funder.id,
      name: funder.name,
      country: funder.country,
      city: funder.city,
      type: funder.type
    };
  }

  async analyzeResearchTrends(query, years = 5) {
    const endYear = new Date().getFullYear();
    const startYear = endYear - years;

    // Get yearly publication counts
    const yearlyCounts = {};
    for (let year = startYear; year <= endYear; year++) {
      const result = await this.searchPublications(query, {
        year,
        limit: 1
      });
      yearlyCounts[year] = result.total;
    }

    // Get funding trends
    const fundingTrends = {};
    for (let year = startYear; year <= endYear; year++) {
      const grantResult = await this.searchGrants(query, {
        fromYear: year,
        toYear: year,
        limit: 1
      });
      fundingTrends[year] = grantResult.total;
    }

    return {
      query,
      yearsAnalyzed: years,
      publicationTrends: yearlyCounts,
      fundingTrends: fundingTrends,
      totalPublications: Object.values(yearlyCounts).reduce((sum, count) => sum + count, 0),
      totalGrants: Object.values(fundingTrends).reduce((sum, count) => sum + count, 0)
    };
  }

  async searchPatents(query, options = {}) {
    const requestData = {
      query: options.dslQuery || this.buildPatentDSLQuery(query, options),
      limit: options.limit || 50,
      skip: options.skip || 0
    };

    const url = `${this.baseURL}/jsonql`;
    const data = await this.makeRequest(url, requestData);

    return {
      total: data.stats.count,
      patents: data.data.map(patent => this.parsePatentData(patent)),
      facets: data.facets || {}
    };
  }

  buildPatentDSLQuery(query, options = {}) {
    let dslQuery = `search patents in title abstract for "${query}"`;

    if (options.fromYear && options.toYear) {
      dslQuery += ` where year >= ${options.fromYear} and year <= ${options.toYear}`;
    }
    if (options.assignee) {
      dslQuery += ` where assignee.name = "${options.assignee}"`;
    }

    return dslQuery;
  }

  parsePatentData(patentData) {
    return {
      id: patentData.id,
      title: patentData.title,
      abstract: patentData.abstract,
      inventors: this.parseInventors(patentData.inventors),
      assignee: patentData.assignee,
      patentNumber: patentData.patent_number,
      familyId: patentData.family_id,
      applicationDate: patentData.date_applied,
      publicationDate: patentData.date_published,
      jurisdiction: patentData.jurisdiction,
      category: patentData.category,
      citations: patentData.times_cited || 0,
      dateAdded: patentData.date_added
    };
  }

  parseInventors(inventors) {
    if (!inventors || !Array.isArray(inventors)) return [];
    return inventors.map(inv => ({
      name: inv.first_name + ' ' + inv.last_name,
      firstName: inv.first_name,
      lastName: inv.last_name,
      currentAffiliationId: inv.current_organization_id,
      researcherId: inv.researcher_id
    }));
  }

  async getGraphQLQuery(query, variables = {}) {
    const requestData = {
      query,
      variables
    };

    const data = await this.makeRequest(this.graphQLURL, requestData);
    return data;
  }

  async analyzeFundingImpact(funderName, years = 5) {
    const query = `
      query GetFundingImpact($funder: String!, $fromYear: Int!, $toYear: Int!) {
        researchGrants(funderName: $funder, fromYear: $fromYear, toYear: $toYear) {
          totalCount
          results {
            id
            title
            amount
            startYear
            investigators {
              researcherId
              firstName
              lastName
            }
            publications {
              totalCount
              results {
                id
                title
                year
                citations
              }
            }
          }
        }
      }
    `;

    const variables = {
      funder: funderName,
      fromYear: new Date().getFullYear() - years,
      toYear: new Date().getFullYear()
    };

    const data = await this.getGraphQLQuery(query, variables);

    // Analyze impact metrics
    const grants = data.data.researchGrants.results;
    const totalFunding = grants.reduce((sum, grant) => sum + (grant.amount || 0), 0);
    const totalPublications = grants.reduce((sum, grant) => sum + grant.publications.totalCount, 0);
    const totalCitations = grants.reduce((sum, grant) => {
      return sum + grant.publications.results.reduce((pubSum, pub) => pubSum + (pub.citations || 0), 0);
    }, 0);

    return {
      funder: funderName,
      yearsAnalyzed: years,
      totalGrants: data.data.researchGrants.totalCount,
      totalFunding,
      totalPublications,
      totalCitations,
      averageCitationsPerPublication: totalPublications > 0 ? totalCitations / totalPublications : 0,
      fundingEfficiency: totalFunding > 0 ? totalCitations / (totalFunding / 1000) : 0 // citations per $1000
    };
  }
}

// Usage
const dimensions = new DimensionsAPI('your-api-key');

// Search publications
dimensions.searchPublications('artificial intelligence', {
  fromYear: 2020,
  toYear: 2023,
  limit: 10
}).then(result => {
  console.log(`Found ${result.total} publications`);
  result.publications.forEach(pub => {
    console.log(`- ${pub.title} (${pub.year}) - ${pub.citations} citations`);
  });
});

// Analyze research trends
dimensions.analyzeResearchTrends('machine learning', 5)
  .then(trends => {
    console.log('Publication trends:', trends.publicationTrends);
    console.log('Funding trends:', trends.fundingTrends);
  });
```

### Advanced Research Analytics (Python)
```python
import requests
import time
from typing import List, Dict, Optional
from collections import defaultdict

class DimensionsAPI:
    def __init__(self, api_key: str):
        self.base_url = "https://app.dimensions.ai/api/dsl/v2"
        self.graphql_url = "https://ds.dimensions.ai/api/graphql"
        self.api_key = api_key
        self.request_delay = 0.1
        self.last_request = 0

    def make_request(self, url: str, data: Dict) -> Dict:
        """Make authenticated API request"""
        now = time.time()
        if now - self.last_request < self.request_delay:
            time.sleep(self.request_delay - (now - self.last_request))

        self.last_request = time.time()

        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'AcademicExplorer/1.0'
        }

        response = requests.post(url, json=data, headers=headers)

        if response.status_code == 429:
            raise Exception("Rate limit exceeded")
        elif response.status_code == 401:
            raise Exception("Invalid API key")

        response.raise_for_status()
        return response.json()

    def search_publications(self, query: str, **kwargs) -> Dict:
        """Search for publications"""
        dsl_query = self._build_dsl_query(query, **kwargs)

        request_data = {
            'query': dsl_query,
            'limit': kwargs.get('limit', 50),
            'skip': kwargs.get('skip', 0)
        }

        url = f"{self.base_url}/jsonql"
        data = self.make_request(url, request_data)

        return {
            'total': data['stats']['count'],
            'publications': [self._parse_publication_data(pub) for pub in data['data']],
            'facets': data.get('facets', {})
        }

    def _build_dsl_query(self, query: str, **kwargs) -> str:
        """Build DSL query string"""
        dsl_query = f'search publications in title_only abstract for "{query}"'

        # Add filters
        if kwargs.get('year'):
            dsl_query += f" where year = {kwargs['year']}"
        if kwargs.get('from_year') and kwargs.get('to_year'):
            dsl_query += f" where year >= {kwargs['from_year']} and year <= {kwargs['to_year']}"
        if kwargs.get('journal'):
            dsl_query += f" where journal.title = \"{kwargs['journal']}\""
        if kwargs.get('subject'):
            dsl_query += f" where category.name = \"{kwargs['subject']}\""
        if kwargs.get('type'):
            dsl_query += f" where type = \"{kwargs['type']}\""

        return dsl_query

    def _parse_publication_data(self, pub_data: Dict) -> Dict:
        """Parse publication data"""
        return {
            'id': pub_data.get('id'),
            'title': pub_data.get('title', ''),
            'authors': self._parse_authors(pub_data.get('authors', [])),
            'journal': self._parse_journal(pub_data.get('journal')),
            'year': pub_data.get('year'),
            'volume': pub_data.get('volume'),
            'issue': pub_data.get('issue'),
            'pages': pub_data.get('pages'),
            'abstract': pub_data.get('abstract', ''),
            'doi': pub_data.get('doi'),
            'pmid': pub_data.get('pmid'),
            'pmcid': pub_data.get('pmcid'),
            'citations': pub_data.get('times_cited', 0),
            'recent_citations': pub_data.get('recent_citations', 0),
            'category': pub_data.get('category'),
            'type': pub_data.get('type'),
            'open_access': pub_data.get('open_access', False),
            'funding': pub_data.get('funding', []),
            'concepts': pub_data.get('concepts', []),
            'keywords': pub_data.get('keywords', []),
            'date_added': pub_data.get('date_added'),
            'date_indexed': pub_data.get('date_indexed')
        }

    def _parse_authors(self, authors: List[Dict]) -> List[Dict]:
        """Parse author information"""
        if not authors:
            return []
        return [{
            'name': f"{author.get('first_name', '')} {author.get('last_name', '')}",
            'first_name': author.get('first_name'),
            'last_name': author.get('last_name'),
            'current_affiliation_id': author.get('current_organization_id'),
            'researcher_id': author.get('researcher_id'),
            'orcid': author.get('orcid')
        } for author in authors]

    def _parse_journal(self, journal: Dict) -> Optional[Dict]:
        """Parse journal information"""
        if not journal:
            return None
        return {
            'id': journal.get('id'),
            'title': journal.get('title'),
            'publisher': journal.get('publisher'),
            'issn': journal.get('issn'),
            'impact_factor': journal.get('impact_factor'),
            'sjr': journal.get('sjr'),
            'snip': journal.get('snip')
        }

    def analyze_collaboration_networks(self, institution_name: str, years: int = 5) -> Dict:
        """Analyze research collaboration networks for an institution"""
        end_year = time.gmtime().tm_year
        start_year = end_year - years

        # Search for publications from the institution
        query = f'research organizations where name = "{institution_name}"'
        result = self.search_publications(query, from_year=start_year, to_year=end_year, limit=500)

        # Build collaboration network
        collaboration_network = defaultdict(lambda: defaultdict(int))
        author_publications = defaultdict(int)
        subject_areas = defaultdict(int)

        for pub in result['publications']:
            # Track author collaborations
            for i, author1 in enumerate(pub['authors']):
                author1_name = author1['name']
                author_publications[author1_name] += 1

                for author2 in pub['authors'][i+1:]:
                    author2_name = author2['name']
                    collaboration_network[author1_name][author2_name] += 1
                    collaboration_network[author2_name][author1_name] += 1

            # Track subject areas
            if pub.get('category'):
                subject_areas[pub['category']] += 1

        # Identify top collaborators
        top_collaborators = {}
        for author, collaborators in collaboration_network.items():
            top_collaborators[author] = dict(sorted(collaborators.items(), key=lambda x: x[1], reverse=True)[:5])

        return {
            'institution': institution_name,
            'years_analyzed': years,
            'total_publications': len(result['publications']),
            'total_authors': len(author_publications),
            'collaboration_network': top_collaborators,
            'top_authors_by_publications': dict(sorted(author_publications.items(), key=lambda x: x[1], reverse=True)[:20]),
            'top_subject_areas': dict(sorted(subject_areas.items(), key=lambda x: x[1], reverse=True)[:10]),
            'average_citations_per_paper': sum(pub['citations'] for pub in result['publications']) / len(result['publications']) if result['publications'] else 0
        }

    def analyze_research_funding_patterns(self, topic: str, years: int = 10) -> Dict:
        """Analyze funding patterns for a research topic"""
        end_year = time.gmtime().tm_year
        start_year = end_year - years

        # Get funding data
        funding_by_year = {}
        funding_by_country = defaultdict(float)
        funding_by_category = defaultdict(float)

        for year in range(start_year, end_year + 1):
            grant_query = f'search grants in title abstract for "{topic}" where start_year = {year}'
            grant_data = {
                'query': grant_query,
                'limit': 500
            }

            url = f"{self.base_url}/jsonql"
            grant_result = self.make_request(url, grant_data)

            year_total = 0
            for grant in grant_result.get('data', []):
                amount = grant.get('amount', 0) or 0
                year_total += amount

                # Track by country
                funder = grant.get('funder', {})
                country = funder.get('country')
                if country:
                    funding_by_country[country] += amount

                # Track by category
                category = grant.get('category')
                if category:
                    funding_by_category[category] += amount

            funding_by_year[year] = year_total
            time.sleep(0.5)  # Rate limiting

        return {
            'topic': topic,
            'years_analyzed': years,
            'funding_by_year': funding_by_year,
            'total_funding': sum(funding_by_year.values()),
            'top_funding_countries': dict(sorted(funding_by_country.items(), key=lambda x: x[1], reverse=True)[:10]),
            'top_funding_categories': dict(sorted(funding_by_category.items(), key=lambda x: x[1], reverse=True)[:10]),
            'average_annual_funding': sum(funding_by_year.values()) / len(funding_by_year) if funding_by_year else 0
        }

    def discover_cross_domain_impact(self, publication_id: str) -> Dict:
        """Discover cross-domain impact of a publication"""
        # Get publication details
        pub_query = f'search publications where id = "{publication_id}"'
        pub_result = self.search_publications(pub_query, limit=1)

        if not pub_result['publications']:
            return {'error': 'Publication not found'}

        publication = pub_result['publications'][0]
        title_words = publication['title'].lower().split()

        # Find patents citing similar research
        patent_query = ' '.join(title_words[:3])  # Use first 3 words for patent search
        patent_result = self.search_patents(patent_query, limit=50)

        # Find clinical trials related to the research
        clinical_query = patent_query
        clinical_data = {
            'query': f'search clinical_trials in title description for "{clinical_query}"',
            'limit': 20
        }

        url = f"{self.base_url}/jsonql"
        clinical_result = self.make_request(url, clinical_data)

        # Find policy documents
        policy_query = f'search policy_documents in title abstract for "{clinical_query}"'
        policy_data = {
            'query': policy_query,
            'limit': 20
        }

        policy_result = self.make_request(url, policy_data)

        return {
            'publication': {
                'id': publication['id'],
                'title': publication['title'],
                'citations': publication['citations'],
                'category': publication['category']
            },
            'related_patents': {
                'total': patent_result['total'],
                'patents': patent_result['patents'][:5]
            },
            'related_clinical_trials': {
                'total': len(clinical_result.get('data', [])),
                'trials': clinical_result.get('data', [])[:5]
            },
            'related_policy_documents': {
                'total': len(policy_result.get('data', [])),
                'documents': policy_result.get('data', [])[:5]
            },
            'cross_domain_score': self._calculate_cross_domain_score(
                patent_result['total'],
                len(clinical_result.get('data', [])),
                len(policy_result.get('data', []))
            )
        }

    def _calculate_cross_domain_score(self, patents: int, clinical: int, policy: int) -> float:
        """Calculate cross-domain impact score"""
        # Weighted scoring for different domains
        weights = {'patents': 0.4, 'clinical': 0.4, 'policy': 0.2}

        # Normalize scores (assuming maximum reasonable values)
        max_patents = 100
        max_clinical = 50
        max_policy = 20

        patent_score = min(patents / max_patents, 1.0) * weights['patents']
        clinical_score = min(clinical / max_clinical, 1.0) * weights['clinical']
        policy_score = min(policy / max_policy, 1.0) * weights['policy']

        return patent_score + clinical_score + policy_score

    def search_patents(self, query: str, **kwargs) -> Dict:
        """Search for patents"""
        dsl_query = self._build_patent_dsl_query(query, **kwargs)

        request_data = {
            'query': dsl_query,
            'limit': kwargs.get('limit', 50),
            'skip': kwargs.get('skip', 0)
        }

        url = f"{self.base_url}/jsonql"
        data = self.make_request(url, request_data)

        return {
            'total': data['stats']['count'],
            'patents': [self._parse_patent_data(patent) for patent in data['data']],
            'facets': data.get('facets', {})
        }

    def _build_patent_dsl_query(self, query: str, **kwargs) -> str:
        """Build patent DSL query"""
        dsl_query = f'search patents in title abstract for "{query}"'

        if kwargs.get('from_year') and kwargs.get('to_year'):
            dsl_query += f" where year >= {kwargs['from_year']} and year <= {kwargs['to_year']}"
        if kwargs.get('assignee'):
            dsl_query += f" where assignee.name = \"{kwargs['assignee']}\""

        return dsl_query

    def _parse_patent_data(self, patent_data: Dict) -> Dict:
        """Parse patent data"""
        return {
            'id': patent_data.get('id'),
            'title': patent_data.get('title', ''),
            'abstract': patent_data.get('abstract', ''),
            'inventors': self._parse_inventors(patent_data.get('inventors', [])),
            'assignee': patent_data.get('assignee'),
            'patent_number': patent_data.get('patent_number'),
            'family_id': patent_data.get('family_id'),
            'date_applied': patent_data.get('date_applied'),
            'date_published': patent_data.get('date_published'),
            'jurisdiction': patent_data.get('jurisdiction'),
            'category': patent_data.get('category'),
            'citations': patent_data.get('times_cited', 0),
            'date_added': patent_data.get('date_added')
        }

    def _parse_inventors(self, inventors: List[Dict]) -> List[Dict]:
        """Parse inventor information"""
        if not inventors:
            return []
        return [{
            'name': f"{inv.get('first_name', '')} {inv.get('last_name', '')}",
            'first_name': inv.get('first_name'),
            'last_name': inv.get('last_name'),
            'current_affiliation_id': inv.get('current_organization_id'),
            'researcher_id': inv.get('researcher_id')
        } for inv in inventors]

    def get_graphql_query(self, query: str, variables: Dict = None) -> Dict:
        """Execute GraphQL query"""
        request_data = {
            'query': query,
            'variables': variables or {}
        }

        return self.make_request(self.graphql_url, request_data)

# Usage
dimensions = DimensionsAPI('your-api-key')

# Search publications
result = dimensions.search_publications('machine learning', from_year=2020, to_year=2023)
print(f"Found {result['total']} publications")

# Analyze collaboration networks
network = dimensions.analyze_collaboration_networks('Stanford University', years=5)
print(f"Collaboration network for Stanford: {len(network['collaboration_network'])} authors")

# Analyze funding patterns
funding = dimensions.analyze_research_funding_patterns('artificial intelligence', years=10)
print(f"Funding analysis: {funding['total_funding']} total funding")

# Discover cross-domain impact
if result['publications']:
    impact = dimensions.discover_cross_domain_impact(result['publications'][0]['id'])
    print(f"Cross-domain impact score: {impact['cross_domain_score']}")
```

## Data Models

### Publication Object Structure
```json
{
  "id": "pub.1234567890",
  "title": "Advanced Machine Learning for Scientific Discovery",
  "authors": [
    {
      "name": "John Smith",
      "firstName": "John",
      "lastName": "Smith",
      "currentAffiliationId": "org.12345",
      "researcherId": "res.12345",
      "orcid": "0000-0002-1234-5678"
    }
  ],
  "journal": {
    "id": "jour.12345",
    "title": "Nature Machine Intelligence",
    "publisher": "Nature Publishing Group",
    "issn": "1567-5645",
    "impactFactor": 25.8
  },
  "year": 2023,
  "volume": "6",
  "issue": "4",
  "pages": "321-335",
  "abstract": "This paper presents novel machine learning approaches...",
  "doi": "10.1038/s42256-023-00678",
  "pmid": "12345678",
  "pmcid": "PMC12345678",
  "citations": 156,
  "recentCitations": 42,
  "category": "Computer Science",
  "type": "article",
  "openAccess": true,
  "funding": [
    {
      "id": "grant.12345",
      "funderName": "National Science Foundation",
      "awardId": "NSF-12345"
    }
  ],
  "concepts": ["Machine Learning", "Scientific Discovery", "Neural Networks"],
  "keywords": ["ML", "AI", "research"],
  "dateAdded": "2023-06-15T00:00:00.000Z",
  "dateIndexed": "2023-06-16T00:00:00.000Z"
}
```

### Grant Object Structure
```json
{
  "id": "grant.1234567890",
  "title": "Machine Learning for Climate Science Research",
  "abstract": "This project aims to develop novel machine learning...",
  "investigators": [
    {
      "name": "Jane Doe",
      "firstName": "Jane",
      "lastName": "Doe",
      "currentAffiliationId": "org.67890",
      "researcherId": "res.67890"
    }
  ],
  "funder": {
    "id": "funder.12345",
    "name": "National Science Foundation",
    "country": "United States",
    "city": "Arlington",
    "type": "Government"
  },
  "amount": 1500000,
  "currency": "USD",
  "startYear": 2020,
  "endYear": 2025,
  "activeYears": [2020, 2021, 2022, 2023, 2024, 2025],
  "category": "Computer Science",
  "keywords": ["machine learning", "climate science", "artificial intelligence"],
  "dateAdded": "2020-01-15T00:00:00.000Z"
}
```

## Common Use Cases

### 1. Research Impact Assessment
```javascript
// Comprehensive research impact analysis
async function assessResearchImpact(topic, institution, years = 5) {
  const endYear = new Date().getFullYear();
  const startYear = endYear - years;

  // Get publications
  const pubResult = await dimensions.searchPublications(topic, {
    fromYear: startYear,
    toYear: endYear,
    limit: 500
  });

  // Get patents
  const patentResult = await dimensions.searchPatents(topic, {
    fromYear: startYear,
    toYear: endYear,
    limit: 100
  });

  // Get grants
  const grantResult = await dimensions.searchGrants(topic, {
    fromYear: startYear,
    toYear: endYear,
    limit: 100
  });

  return {
    topic,
    institution,
    yearsAnalyzed: years,
    publications: {
      total: pubResult.total,
      totalCitations: pubResult.publications.reduce((sum, pub) => sum + pub.citations, 0),
      openAccessRate: pubResult.publications.filter(pub => pub.openAccess).length / pubResult.publications.length
    },
    patents: {
      total: patentResult.total,
      averageCitations: patentResult.patents.reduce((sum, pat) => sum + pat.citations, 0) / patentResult.patents.length
    },
    grants: {
      total: grantResult.total,
      totalFunding: grantResult.grants.reduce((sum, grant) => sum + (grant.amount || 0), 0),
      fundingPerPublication: grantResult.grants.reduce((sum, grant) => sum + (grant.amount || 0), 0) / pubResult.total
    }
  };
}
```

### 2. Emerging Technology Detection
```python
# Detect emerging research technologies
def detect_emerging_technologies(field_keywords, years=3):
    """Identify emerging technologies within a research field"""
    end_year = time.gmtime().tm_year
    start_year = end_year - years

    emerging_terms = defaultdict(lambda: defaultdict(int))
    term_growth = {}

    # Analyze publication titles and abstracts
    for keyword in field_keywords:
        query = f'search publications in title abstract for "{keyword}" where year >= {start_year}'

        for year in range(start_year, end_year + 1):
            year_query = f'{query} and year = {year}'
            pub_data = {
                'query': year_query,
                'limit': 200
            }

            url = f"{dimensions.base_url}/jsonql"
            result = dimensions.make_request(url, pub_data)

            # Extract emerging terms
            for pub in result.get('data', []):
                title_terms = pub.get('title', '').lower().split()
                abstract_terms = pub.get('abstract', '').lower().split()

                all_terms = title_terms + abstract_terms
                for term in set(all_terms):
                    if len(term) > 3 and term not in field_keywords:
                        emerging_terms[term][year] += 1

            time.sleep(0.5)  # Rate limiting

    # Calculate growth rates
    for term, year_counts in emerging_terms.items():
        if len(year_counts) >= 2:
            years_sorted = sorted(year_counts.keys())
            counts = [year_counts[year] for year in years_sorted]

            if counts[-1] > counts[0]:
                growth_rate = ((counts[-1] - counts[0]) / counts[0]) * 100 if counts[0] > 0 else 100
                if growth_rate > 50:  # Filter for significant growth
                    term_growth[term] = {
                        'growth_rate': growth_rate,
                        'total_mentions': sum(counts),
                        'recent_counts': counts,
                        'trend': 'increasing'
                    }

    # Sort by growth rate and total mentions
    emerging_tech = sorted(
        term_growth.items(),
        key=lambda x: (x[1]['growth_rate'], x[1]['total_mentions']),
        reverse=True
    )

    return {
        'field_keywords': field_keywords,
        'analysis_period': f"{start_year}-{end_year}",
        'emerging_technologies': emerging_tech[:20],  # Top 20 emerging terms
        'total_terms_analyzed': len(emerging_terms)
    }
```

## Best Practices

1. **Use GraphQL for complex queries** - More efficient than multiple REST calls
2. **Cache funding data** - Grant information doesn't change frequently
3. **Batch requests** - Combine multiple queries when possible
4. **Monitor query complexity** - GraphQL queries have complexity limits
5. **Handle pagination** - Process large result sets efficiently
6. **Use specific search terms** - Improve relevance and reduce noise

## Error Handling

```javascript
async function robustDimensionsRequest(dimensionsAPI, requestFunction, retries = 3) {
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
      if (error.message.includes('401')) {
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
- **Scopus API** - For citation and bibliographic analysis
- **Crossref API** - For DOI metadata and citation tracking
- **Semantic Scholar API** - For paper metadata and citations
- **ORCID API** - For researcher identity management

## Support

- **API Documentation:** https://docs.dimensions.ai/dsl/api.html
- **GraphQL Documentation:** https://docs.dimensions.ai/dsl/graphql.html
- **Developer Portal:** https://app.dimensions.ai/api
- **API Explorer:** https://ds.dimensions.ai/api/explorer/
- **Support:** https://support.dimensions.ai/

---

*Last updated: 2025-10-27*
