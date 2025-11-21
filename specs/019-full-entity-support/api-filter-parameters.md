# OpenAlex API Filter Parameters by Entity Type

**Generated**: 2025-11-21
**Purpose**: Document valid filter parameters for all 12 OpenAlex entity types

## Overview

This document lists all valid filter parameters discovered by testing the OpenAlex API with invalid filters. These parameters can be used in queries like:

```
https://api.openalex.org/{TYPE}?filter={parameter}:{value}
```

---

## 1. Works

**Endpoint**: `/works`

### Search Parameters
- `abstract.search`, `abstract.search.no_stem`
- `default.search`
- `display_name`, `display_name.search`, `display_name.search.no_stem`
- `fulltext.search`
- `keyword.search`
- `raw_affiliation_strings.search`
- `raw_author_name.search`
- `semantic.search`
- `title.search`, `title.search.no_stem`
- `title_and_abstract.search`, `title_and_abstract.search.no_stem`

### Identifiers
- `doi`, `doi_starts_with`
- `ids.mag`, `ids.openalex`, `ids.pmcid`, `ids.pmid`
- `mag`, `mag_only`
- `openalex`, `openalex_id`
- `pmcid`, `pmid`

### Authors & Authorships
- `author.id`, `author.orcid`
- `authors_count`
- `authorships.affiliations.institution_ids`
- `authorships.author.id`, `authorships.author.orcid`
- `authorships.countries`
- `authorships.institutions.continent`, `authorships.institutions.country_code`
- `authorships.institutions.id`, `authorships.institutions.is_global_south`
- `authorships.institutions.lineage`, `authorships.institutions.ror`
- `authorships.institutions.type`
- `authorships.is_corresponding`
- `corresponding_author_ids`
- `corresponding_institution_ids`
- `has_old_authors`
- `has_orcid`
- `has_raw_affiliation_strings`
- `is_corresponding`

### Institutions
- `institution.id`
- `institution_assertions.country_code`, `institution_assertions.id`
- `institution_assertions.lineage`, `institution_assertions.ror`
- `institution_assertions.type`
- `institutions.continent`, `institutions.country_code`
- `institutions.id`, `institutions.is_global_south`
- `institutions.ror`, `institutions.type`
- `institutions_distinct_count`
- `countries_distinct_count`

### Topics & Concepts
- `concept.id`, `concepts.id`, `concepts.wikidata`
- `concepts_count`
- `primary_topic.domain.id`, `primary_topic.field.id`
- `primary_topic.id`, `primary_topic.subfield.id`
- `topics.domain.id`, `topics.field.id`
- `topics.id`, `topics.subfield.id`
- `topics_count`

### Keywords & SDGs
- `keywords.id`
- `sustainable_development_goals.id`, `sustainable_development_goals.score`

### Citations & Impact
- `cited_by`, `cited_by_count`
- `cited_by_percentile_year.max`, `cited_by_percentile_year.min`
- `citation_normalized_percentile.is_in_top_10_percent`
- `citation_normalized_percentile.is_in_top_1_percent`
- `citation_normalized_percentile.value`
- `cites`
- `fwci`
- `referenced_works`, `referenced_works_count`
- `has_references`
- `related_to`

### Open Access
- `best_oa_location.is_accepted`, `best_oa_location.is_oa`
- `best_oa_location.is_published`, `best_oa_location.landing_page_url`
- `best_oa_location.license`, `best_oa_location.license_id`
- `best_oa_location.raw_type`, `best_oa_location.version`
- `best_oa_location.source.*` (host_organization, id, issn, type, etc.)
- `best_open_version`
- `has_oa_accepted_or_published_version`
- `has_oa_submitted_version`
- `is_oa`
- `oa_status`
- `open_access.any_repository_has_fulltext`
- `open_access.is_oa`, `open_access.oa_status`
- `locations.is_accepted`, `locations.is_oa`, `locations.is_published`
- `locations.license`, `locations.license_id`
- `locations.source.*` (id, issn, is_in_doaj, type, etc.)
- `locations_count`
- `primary_location.is_accepted`, `primary_location.is_oa`
- `primary_location.license`, `primary_location.license_id`
- `primary_location.source.*` (id, issn, type, etc.)

### Publication Metadata
- `biblio.first_page`, `biblio.issue`, `biblio.last_page`, `biblio.volume`
- `journal`
- `publication_date`, `publication_year`
- `type`, `type_crossref`

### APC (Article Processing Charges)
- `apc_list.currency`, `apc_list.provenance`, `apc_list.value`, `apc_list.value_usd`
- `apc_paid.currency`, `apc_paid.provenance`, `apc_paid.value`, `apc_paid.value_usd`

### Funding
- `awards.doi`, `awards.funder_award_id`, `awards.funder_display_name`
- `awards.funder_id`, `awards.id`
- `funders.id`
- `grants.award_id`, `grants.funder`

### Content Availability
- `datasets`
- `fulltext_origin`
- `has_abstract`
- `has_content.grobid_xml`, `has_content.pdf`
- `has_doi`
- `has_embeddings`
- `has_fulltext`
- `has_pdf_url`
- `has_pmcid`, `has_pmid`
- `indexed_in`

### Flags
- `is_paratext`
- `is_retracted`
- `is_xpac`
- `language`
- `repository`
- `version`

### Dates
- `from_created_date`, `to_created_date`
- `from_publication_date`, `to_publication_date`
- `to_updated_date`

---

## 2. Authors

**Endpoint**: `/authors`

### Search & Display
- `default.search`
- `display_name`, `display_name.search`

### Identifiers
- `id`, `ids.openalex`
- `openalex`, `openalex_id`
- `orcid`
- `scopus`

### Affiliations
- `affiliations.institution.country_code`
- `affiliations.institution.id`, `affiliations.institution.lineage`
- `affiliations.institution.ror`, `affiliations.institution.type`
- `last_known_institutions.continent`, `last_known_institutions.country_code`
- `last_known_institutions.id`, `last_known_institutions.is_global_south`
- `last_known_institutions.lineage`, `last_known_institutions.ror`
- `last_known_institutions.type`

### Topics & Concepts
- `concept.id`, `concepts.id`
- `topic_share.id`, `topics.id`
- `x_concepts.id`

### Metrics
- `cited_by_count`
- `summary_stats.2yr_mean_citedness`
- `summary_stats.h_index`, `summary_stats.i10_index`
- `works_count`

### Flags
- `has_orcid`

### Dates
- `from_created_date`, `to_created_date`
- `to_updated_date`

---

## 3. Sources

**Endpoint**: `/sources`

### Search & Display
- `default.search`
- `display_name`, `display_name.search`

### Identifiers
- `ids.mag`, `ids.openalex`
- `openalex`, `openalex_id`
- `issn`, `issn_l`

### Publisher & Organization
- `host_organization`, `host_organization.id`
- `host_organization_lineage`

### Geography
- `continent`, `country_code`
- `is_global_south`

### Topics & Concepts
- `concept.id`, `concepts.id`
- `topic_share.id`, `topics.id`
- `x_concepts.id`

### Open Access & Indexing
- `is_core`
- `is_high_oa_rate`, `is_high_oa_rate_since_year`
- `is_in_doaj`, `is_in_doaj_since_year`
- `is_in_jstage`, `is_in_jstage_since_year`
- `is_oa`
- `is_ojs`
- `oa_flip_year`

### APC (Article Processing Charges)
- `apc_prices.currency`, `apc_prices.price`
- `apc_usd`

### Metrics
- `cited_by_count`
- `summary_stats.2yr_mean_citedness`
- `summary_stats.h_index`, `summary_stats.i10_index`
- `works_count`

### Publication Years
- `first_publication_year`, `last_publication_year`

### Type
- `type`

### Flags
- `has_issn`

### Dates
- `from_created_date`
- `to_updated_date`

---

## 4. Institutions

**Endpoint**: `/institutions`

### Search & Display
- `default.search`
- `display_name`, `display_name.search`

### Identifiers
- `id`, `ids.openalex`
- `openalex`, `openalex_id`
- `ror`

### Geography
- `continent`, `country_code`
- `is_global_south`

### Hierarchy & Relationships
- `lineage`
- `is_super_system`
- `repositories.host_organization`, `repositories.host_organization_lineage`
- `repositories.id`
- `roles.id`

### Topics & Concepts
- `concept.id`, `concepts.id`
- `topic_share.id`, `topics.id`
- `x_concepts.id`

### Metrics
- `cited_by_count`
- `summary_stats.2yr_mean_citedness`
- `summary_stats.h_index`, `summary_stats.i10_index`
- `works_count`

### Type
- `type`

### Flags
- `has_ror`

### Dates
- `from_created_date`

---

## 5. Topics

**Endpoint**: `/topics`

### Search & Display
- `default.search`
- `description.search`
- `display_name`, `display_name.search`
- `keywords.search`

### Identifiers
- `id`, `ids.openalex`
- `openalex`

### Taxonomy Hierarchy
- `domain.id`
- `field.id`
- `subfield.id`

### Metrics
- `cited_by_count`
- `works_count`

### Dates
- `from_created_date`

---

## 6. Concepts (Legacy)

**Endpoint**: `/concepts`

### Search & Display
- `default.search`
- `display_name`, `display_name.search`

### Identifiers
- `ids.openalex`
- `openalex`, `openalex_id`
- `wikidata_id`

### Hierarchy
- `ancestors.id`
- `level`

### Metrics
- `cited_by_count`
- `summary_stats.2yr_mean_citedness`
- `summary_stats.h_index`, `summary_stats.i10_index`
- `works_count`

### Flags
- `has_wikidata`

### Dates
- `from_created_date`

---

## 7. Publishers

**Endpoint**: `/publishers`

### Search & Display
- `default.search`
- `display_name`, `display_name.search`

### Identifiers
- `ids.openalex`, `ids.ror`, `ids.wikidata`
- `openalex`, `openalex_id`
- `ror`, `wikidata`

### Geography
- `continent`, `country_codes`
- `is_global_south`

### Hierarchy
- `hierarchy_level`
- `lineage`
- `parent_publisher`

### Relationships
- `roles.id`

### Metrics
- `cited_by_count`
- `summary_stats.2yr_mean_citedness`
- `summary_stats.h_index`, `summary_stats.i10_index`
- `works_count`

### Dates
- `from_created_date`

---

## 8. Funders

**Endpoint**: `/funders`

### Search & Display
- `default.search`
- `description.search`
- `display_name`, `display_name.search`

### Identifiers
- `ids.crossref`, `ids.doi`, `ids.openalex`
- `ids.ror`, `ids.wikidata`
- `openalex`, `openalex_id`
- `ror`, `wikidata`

### Geography
- `continent`, `country_code`
- `is_global_south`

### Relationships
- `roles.id`

### Metrics
- `cited_by_count`
- `grants_count`
- `summary_stats.2yr_mean_citedness`
- `summary_stats.h_index`, `summary_stats.i10_index`
- `works_count`

### Dates
- `from_created_date`

---

## 9. Keywords

**Endpoint**: `/keywords`

### Search & Display
- `default.search`
- `display_name`, `display_name.search`

### Identifiers
- `id`

### Metrics
- `cited_by_count`
- `works_count`

### Dates
- `from_created_date`

---

## 10. Domains

**Endpoint**: `/domains`

### Search & Display
- `default.search`
- `display_name`, `display_name.search`

### Identifiers
- `id`

### Relationships
- `fields.id` (fields within this domain)

### Metrics
- `cited_by_count`
- `works_count`

### Dates
- `from_created_date`

---

## 11. Fields

**Endpoint**: `/fields`

### Search & Display
- `default.search`
- `display_name`, `display_name.search`

### Identifiers
- `id`

### Taxonomy Hierarchy
- `domain.id` (parent domain)
- `subfields.id` (child subfields)

### Metrics
- `cited_by_count`
- `works_count`

### Dates
- `from_created_date`

---

## 12. Subfields

**Endpoint**: `/subfields`

### Search & Display
- `default.search`
- `display_name`, `display_name.search`

### Identifiers
- `id`

### Taxonomy Hierarchy
- `domain.id` (grandparent domain)
- `field.id` (parent field)
- `topics.id` (child topics)

### Metrics
- `cited_by_count`
- `works_count`

### Dates
- `from_created_date`

---

## Common Patterns Across Entity Types

### Universal Parameters
Almost all entity types support:
- `default.search` - Full-text search
- `display_name`, `display_name.search` - Name filtering
- `id` - Entity identifier
- `cited_by_count` - Citation count filtering
- `works_count` - Associated works count
- `from_created_date` - Filter by creation date

### Search Parameters
Entity types with rich text content support:
- `.search` - Standard search
- `.search.no_stem` - Search without stemming

### Summary Statistics
Many entity types support:
- `summary_stats.2yr_mean_citedness`
- `summary_stats.h_index`
- `summary_stats.i10_index`

### Geography
Geographic filtering available for:
- Authors (via affiliations)
- Sources
- Institutions
- Publishers
- Funders

### Taxonomy Hierarchy
Taxonomy entities (domains, fields, subfields, topics) support hierarchical filtering:
- Domains: `fields.id`
- Fields: `domain.id`, `subfields.id`
- Subfields: `domain.id`, `field.id`, `topics.id`
- Topics: `domain.id`, `field.id`, `subfield.id`

---

## Usage Examples

### Works by Open Access Status
```
/works?filter=is_oa:true
```

### Authors by Institution
```
/authors?filter=last_known_institutions.id:I1234567
```

### Sources in DOAJ
```
/sources?filter=is_in_doaj:true
```

### Institutions by Country
```
/institutions?filter=country_code:GB
```

### Topics by Domain
```
/topics?filter=domain.id:1
```

### Publishers by Hierarchy Level
```
/publishers?filter=hierarchy_level:0
```

### Funders with High Citation Counts
```
/funders?filter=cited_by_count:>10000
```

### Keywords by Works Count
```
/keywords?filter=works_count:>1000
```

---

## Notes

1. **Parameter Naming**: Parameters can use either underscore or hyphenated versions (e.g., `cited_by_count` or `cited-by-count`)

2. **Nested Fields**: Many parameters support nested object paths using dot notation (e.g., `authorships.institutions.id`)

3. **Date Filters**: Date parameters typically accept ISO 8601 format (YYYY-MM-DD)

4. **Numeric Comparisons**: Numeric fields support operators like `>`, `<`, `>=`, `<=` (e.g., `cited_by_count:>100`)

5. **Multiple Filters**: Multiple filters can be combined with `|` (OR) or `,` (AND) separators

6. **Legacy Concepts**: The `/concepts` endpoint is deprecated in favor of `/topics` but still available for backward compatibility

7. **Taxonomy Relationships**: Domains → Fields → Subfields → Topics form a four-level hierarchy

---

## API Documentation

For complete documentation on filter syntax and operators, see:
- https://docs.openalex.org/how-to-use-the-api/get-lists-of-entities/filter-entity-lists
- https://docs.openalex.org/api-entities/works
- https://docs.openalex.org/api-entities/authors
- https://docs.openalex.org/api-entities/sources
- https://docs.openalex.org/api-entities/institutions
- https://docs.openalex.org/api-entities/topics
- https://docs.openalex.org/api-entities/publishers
- https://docs.openalex.org/api-entities/funders
