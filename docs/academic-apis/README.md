# Academic APIs Documentation

*Last updated: 2025-10-27*

This directory contains comprehensive documentation for academic research APIs available in 2025, organized by provider and access level.

## Directory Structure

### Free APIs (No Authentication Required)
- [OpenAlex](openalex.md) - Comprehensive scholarly database
- [Crossref](crossref.md) - DOI metadata and citations
- [Semantic Scholar](semantic-scholar.md) - Academic paper search and analysis
- [arXiv](arxiv.md) - Scientific preprints
- [DBLP](dblp.md) - Computer science bibliography
- [Unpaywall](unpaywall.md) - Open access paper discovery
- [HAL](hal.md) - French open access archive
- [DataCite](datacite.md) - Scholarly metadata (GraphQL)
- [ORCID](orcid.md) - Researcher identity
- [DOAJ](doaj.md) - Open access journals
- [CORE](core.md) - Open access aggregator

### Authentication Required (Free Registration)
- [PubMed/NCBI](pubmed.md) - Biomedical literature

### Premium APIs with Public Signup
- [ScienceDirect](sciencedirect.md) - Academic article database
- [Mendeley](mendeley.md) - Reference management
- [Altmetric](altmetric.md) - Research impact analytics

### Institutional Premium APIs
- [Web of Science](web-of-science.md) - Comprehensive citation database
- [Dimensions](dimensions.md) - Research analytics platform
- [Scopus (Elsevier)](scopus.md) - Abstract and citation database
- [PlumX Metrics](plumx.md) - Research impact metrics

### Publisher APIs (Limited Access)
- [Springer Nature](springer-nature.md) - Publisher content
- [Wiley](wiley.md) - Publisher content
- [Taylor & Francis](taylor-francis.md) - Publisher content

## Quick Start

### For Individual Researchers
1. Start with [OpenAlex](openalex.md) - comprehensive and completely free
2. Add [Semantic Scholar](semantic-scholar.md) for citation analysis
3. Use [Crossref](crossref.md) for DOI resolution
4. Consider [Altmetric](altmetric.md) for impact tracking

### For Academic Institutions
1. Essential: OpenAlex + Crossref + Semantic Scholar (all free)
2. Enhanced: Add Altmetric + ScienceDirect APIs
3. Comprehensive: Add Web of Science + Dimensions APIs

## Comparison Tables

See the [Main Index](index.md) for comprehensive comparison tables and pricing information.

## Getting Started

1. **Define your use case** - What data do you need? Usage volume? Budget?
2. **Choose your APIs** - Start with free options, add premium as needed
3. **Register for access** - Create developer accounts, obtain API keys
4. **Implement** - Build with proper error handling and rate limiting
5. **Maintain** - Monitor usage, update authentication, check for changes

## Best Practices

- Always check rate limits before production implementation
- Include user agent information in API requests
- Cache responses to reduce server load
- Handle errors gracefully with proper HTTP status code checking
- Use appropriate time delays between requests for rate-limited APIs
- Monitor API status and respect service announcements
- Provide attribution where required by API terms of service

## Support

For questions about this documentation, please check individual provider documentation files or create an issue in the repository.

---

*This documentation is maintained for academic and research purposes. API terms and availability may change. Always check official documentation for the most current information.*