# Web of Science API Documentation

**Category:** Comprehensive Citation Database
**Data Type:** Citation networks, author profiles, research metrics
**API Type:** REST API
**Authentication:** OAuth 2.0 + Subscription required
**Rate Limits:** Based on subscription tier
**Pricing:** $5,000-$50,000+/year (Commercial), Custom academic pricing

## Overview

Web of Science API provides programmatic access to the world's leading scientific citation database. It offers comprehensive citation networks, author profiles, and advanced research analytics capabilities for institutional customers.

## Pricing and Access

### Commercial Customers
- **$5,000 - $50,000+ per year** based on usage volume and features
- Custom pricing based on specific requirements
- Priority support and service level agreements

### Academic Institutions
- **Custom pricing** based on FTE (full-time equivalent) and research needs
- Preferential pricing compared to commercial rates
- Volume discounts available for large research institutions

### Individual Researchers
- **Limited to institutional access**
- Individual subscriptions not typically available
- Must access through institutional subscription

## Access Process

1. **Developer account creation** at Clarivate Developer Portal
2. **Institution verification** and approval process
3. **API key request** and OAuth 2.0 credentials setup
4. **Subscription approval** (2-4 weeks processing time)
5. **Sandbox testing** before production deployment

## Documentation

- **Developer Portal:** https://developer.clarivate.com/apis/web-of-science
- **Registration:** https://developer.clarivate.com/register
- **Sandbox:** https://developer.clarivate.com/sandbox
- **API Reference:** Available after registration

## Authentication

- **OAuth 2.0** authentication required
- **API keys** and credentials provided after approval
- **Institutional verification** mandatory
- **Sandbox environment** available for testing

## API Endpoints

### Search Documents
```bash
# Basic search
https://api.clarivate.com/api/wos/?databaseId=WOS&usrQuery=TS=machine%20learning&count=10

# Advanced search with filters
https://api.clarivate.com/api/wos/?databaseId=WOS&usrQuery=TS=(artificial%20intelligence%20AND%20deep%20learning)&timeSpan=2020-2023&count=50
```

### Author Search
```bash
# Search by author name
https://api.clarivate.com/api/wos/?databaseId=WOS&usrQuery=AU=(Smith,%20John)&count=25

# Get author profile and publications
https://api.clarivate.com/api/wos/?databaseId=WOS&usrQuery=AU=(Smith,%20John)&firstRecord=1&count=100
```

### Citation Analysis
```bash
# Get citation network for a document
https://api.clarivate.com/api/wos/?databaseId=WOS&usrQuery=UT=WOS:000123456789&count=10

# Find citing articles
https://api.clarivate.com/api/wos/?databaseId=WOS&usrQuery=CR=WOS:000123456789&count=50
```

## Implementation Examples

### OAuth 2.0 Authentication Setup
```javascript
class WebOfScienceAPI {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.baseURL = 'https://api.clarivate.com/api';
    this.accessToken = null;
  }

  async authenticate() {
    // This is a simplified example - actual OAuth flow requires redirect handling
    const authUrl = `https://api.clarivate.com/oauth/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${this.redirectUri}&scope=wos`;

    // In production, redirect user to authUrl and handle callback
    // For now, assuming you have the authorization code
    const authCode = 'AUTHORIZATION_CODE_FROM_CALLBACK';

    const tokenResponse = await fetch('https://api.clarivate.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      },
      body: `grant_type=authorization_code&code=${authCode}&redirect_uri=${this.redirectUri}`
    });

    const tokenData = await tokenResponse.json();
    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token;
  }

  async makeAuthenticatedRequest(endpoint, params = {}) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      // Token expired, refresh
      await this.refreshAccessToken();
      return this.makeAuthenticatedRequest(endpoint, params);
    }

    if (!response.ok) {
      throw new Error(`Web of Science API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async refreshAccessToken() {
    const response = await fetch('https://api.clarivate.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      },
      body: `grant_type=refresh_token&refresh_token=${this.refreshToken}`
    });

    const tokenData = await response.json();
    this.accessToken = tokenData.access_token;
  }

  async searchDocuments(query, options = {}) {
    const params = {
      databaseId: options.databaseId || 'WOS',
      usrQuery: query,
      count: options.count || 25,
      firstRecord: options.firstRecord || 1,
      ...options
    };

    return this.makeAuthenticatedRequest('/wos/', params);
  }

  async getCitationNetwork(utId, options = {}) {
    // Find citing articles
    const citingParams = {
      databaseId: options.databaseId || 'WOS',
      usrQuery: `CR=${utId}`,
      count: options.count || 50,
      firstRecord: 1
    };

    // Find cited references
    const citedParams = {
      databaseId: options.databaseId || 'WOS',
      usrQuery: `UT=${utId}`,
      count: 1,
      firstRecord: 1
    };

    const [citing, original] = await Promise.all([
      this.makeAuthenticatedRequest('/wos/', citingParams),
      this.makeAuthenticatedRequest('/wos/', citedParams)
    ]);

    return {
      original: original.QueryResult?.Records?.records?.[0] || null,
      citingArticles: citing.QueryResult?.Records?.records || [],
      totalCiting: citing.QueryResult?.RecordsMeta?.totalRecords || 0
    };
  }
}
```

### Research Impact Analysis
```javascript
async function analyzeResearchImpact(wosAPI, authorName, institution = null) {
  // Search for author's publications
  const searchQuery = institution
    ? `AU=(${authorName}) AND AFFIL=(${institution})`
    : `AU=(${authorName})`;

  const publications = await wosAPI.searchDocuments(searchQuery, {
    count: 100,
    timeSpan: '2015-2023'
  });

  const records = publications.QueryResult?.Records?.records || [];

  if (records.length === 0) {
    return { error: 'No publications found for this author' };
  }

  // Calculate impact metrics
  const totalCitations = records.reduce((sum, record) => {
    return sum + parseInt(record.static_data?.times_cited_counted_by?.times_cited || 0);
  }, 0);

  const hIndex = calculateHIndex(records);
  const averageCitations = totalCitations / records.length;

  // Analyze publication trends
  const yearlyPublications = {};
  records.forEach(record => {
    const year = record.static_data?.summary?.pub_info?.pubyear;
    if (year) {
      yearlyPublications[year] = (yearlyPublications[year] || 0) + 1;
    }
  });

  // Analyze collaboration patterns
  const collaborations = {};
  records.forEach(record => {
    const authors = record.static_data?.summary?.names?.full_names || [];
    authors.forEach(author => {
      if (author.full_name !== authorName) {
        collaborations[author.full_name] = (collaborations[author.full_name] || 0) + 1;
      }
    });
  });

  // Get top collaborators
  const topCollaborators = Object.entries(collaborations)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, collaborations: count }));

  return {
    author: authorName,
    institution,
    impact: {
      totalPublications: records.length,
      totalCitations,
      hIndex,
      averageCitations: Math.round(averageCitations * 100) / 100
    },
    trends: {
      yearlyPublications,
      firstPublicationYear: Math.min(...Object.keys(yearlyPublications).map(Number)),
      latestPublicationYear: Math.max(...Object.keys(yearlyPublications).map(Number))
    },
    collaboration: {
      topCollaborators,
      totalCollaborators: Object.keys(collaborations).length
    },
    recentWork: records
      .sort((a, b) => {
        const yearA = a.static_data?.summary?.pub_info?.pubyear || 0;
        const yearB = b.static_data?.summary?.pub_info?.pubyear || 0;
        return yearB - yearA;
      })
      .slice(0, 5)
      .map(record => ({
        title: record.static_data?.summary?.titles?.title?.[0] || 'Unknown',
        year: record.static_data?.summary?.pub_info?.pubyear,
        citations: parseInt(record.static_data?.times_cited_counted_by?.times_cited || 0),
        journal: record.static_data?.summary?.titles?.source?.[0] || 'Unknown',
        utId: record.static_data?.ut
      }))
  };
}

function calculateHIndex(records) {
  const citations = records
    .map(record => parseInt(record.static_data?.times_cited_counted_by?.times_cited || 0))
    .sort((a, b) => b - a);

  let hIndex = 0;
  for (let i = 0; i < citations.length; i++) {
    if (citations[i] >= i + 1) {
      hIndex = i + 1;
    } else {
      break;
    }
  }

  return hIndex;
}
```

## Data Models

### Document Record
```json
{
  "UID": "WOS:000123456789",
  "static_data": {
    "summary": {
      "pub_info": {
        "pubyear": "2023",
        "pubmonth": "05",
        "pubday": "15"
      },
      "titles": {
        "title": ["Machine Learning for Scientific Discovery"],
        "source": ["Nature Machine Intelligence"]
      },
      "names": {
        "full_names": [
          {
            "full_name": "Smith, John",
            "role": "author"
          }
        ]
      },
      "times_cited_counted_by": {
        "times_cited": "25"
      }
    },
    "fullrecord_metadata": {
      "identifiers": {
        "identifier": [
          {
            "type": "doi",
            "value": "10.1038/s42256-023-00645-0"
          }
        ]
      }
    }
  }
}
```

## Common Use Cases

### Institutional Research Assessment
```javascript
async function institutionalResearchAssessment(wosAPI, institution, years = 5) {
  const endYear = new Date().getFullYear();
  const startYear = endYear - years;

  const query = `AFFIL=(${institution}) AND PY=${startYear}-${endYear}`;

  const publications = await wosAPI.searchDocuments(query, {
    count: 1000,
    firstRecord: 1
  });

  const records = publications.QueryResult?.Records?.records || [];

  // Analyze by department/discipline
  const departmentAnalysis = {};
  const citationAnalysis = {};

  records.forEach(record => {
    const year = record.static_data?.summary?.pub_info?.pubyear;
    const citations = parseInt(record.static_data?.times_cited_counted_by?.times_cited || 0);
    const journal = record.static_data?.summary?.titles?.source?.[0];

    if (year && citations) {
      if (!citationAnalysis[year]) {
        citationAnalysis[year] = { publications: 0, totalCitations: 0 };
      }
      citationAnalysis[year].publications++;
      citationAnalysis[year].totalCitations += citations;
    }

    // Group by journal/discipline (simplified)
    if (journal) {
      if (!departmentAnalysis[journal]) {
        departmentAnalysis[journal] = { publications: 0, citations: 0 };
      }
      departmentAnalysis[journal].publications++;
      departmentAnalysis[journal].citations += citations;
    }
  });

  return {
    institution,
    period: `${startYear}-${endYear}`,
    summary: {
      totalPublications: records.length,
      totalCitations: records.reduce((sum, r) => sum + parseInt(r.static_data?.times_cited_counted_by?.times_cited || 0), 0),
      averageCitationsPerPublication: records.length > 0 ?
        Math.round((records.reduce((sum, r) => sum + parseInt(r.static_data?.times_cited_counted_by?.times_cited || 0), 0) / records.length) * 100) / 100 : 0
    },
    yearlyTrends: citationAnalysis,
    departmentBreakdown: departmentAnalysis
  };
}
```

## Best Practices

1. **Use OAuth 2.0 properly** with secure token storage
2. **Implement rate limiting** based on subscription limits
3. **Cache responses** to reduce API calls
4. **Handle pagination** for large result sets
5. **Use specific query syntax** for better results
6. **Monitor usage** to stay within subscription limits
7. **Test in sandbox** before production deployment

## Error Handling

```javascript
async function safeWOSRequest(wosAPI, endpoint, params, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await wosAPI.makeAuthenticatedRequest(endpoint, params);
    } catch (error) {
      if (error.message.includes('401')) {
        // Authentication error - re-authenticate
        await wosAPI.authenticate();
        continue;
      }

      if (error.message.includes('429')) {
        // Rate limited - wait and retry
        const delay = Math.pow(2, attempt) * 1000;
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

- **OpenAlex API** - Free comprehensive alternative (no authentication required)
- **Dimensions API** - Comprehensive research analytics platform
- **Scopus API** - Major competitor with similar capabilities
- **Crossref API** - For DOI metadata (free but limited scope)

## Support

- **Developer Portal:** https://developer.clarivate.com/apis/web-of-science
- **Technical Support:** Available for institutional customers
- **Documentation:** Comprehensive API documentation after registration
- **Sandbox Environment:** Available for testing and development

---

*Last updated: 2025-10-27*