/**
 * Query Builder for OpenAlex API
 * Helps construct complex filter queries
 */

export class QueryBuilder {
  private filters: string[] = [];
  private currentGroup: string[] = [];
  private isInGroup = false;

  // Logical operators
  and(filter: string | QueryBuilder): this {
    if (this.isInGroup) {
      this.currentGroup.push(filter instanceof QueryBuilder ? filter.build() : filter);
    } else {
      this.filters.push(filter instanceof QueryBuilder ? filter.build() : filter);
    }
    return this;
  }

  or(filter: string | QueryBuilder): this {
    if (this.isInGroup) {
      const lastFilter = this.currentGroup.pop();
      if (lastFilter) {
        const orFilter = filter instanceof QueryBuilder ? filter.build() : filter;
        this.currentGroup.push(`(${lastFilter})||(${orFilter})`);
      }
    } else {
      const lastFilter = this.filters.pop();
      if (lastFilter) {
        const orFilter = filter instanceof QueryBuilder ? filter.build() : filter;
        this.filters.push(`(${lastFilter})||(${orFilter})`);
      }
    }
    return this;
  }

  not(filter: string | QueryBuilder): this {
    const notFilter = filter instanceof QueryBuilder ? filter.build() : filter;
    return this.and(`!(${notFilter})`);
  }

  // Grouping
  group(callback: (qb: QueryBuilder) => void): this {
    const groupBuilder = new QueryBuilder();
    groupBuilder.isInGroup = true;
    callback(groupBuilder);
    this.filters.push(`(${groupBuilder.currentGroup.join(',')})`);
    return this;
  }

  // Common filters
  equals(field: string, value: string | number | boolean): this {
    return this.and(`${field}:${value}`);
  }

  notEquals(field: string, value: string | number): this {
    return this.and(`${field}:!${value}`);
  }

  greaterThan(field: string, value: number): this {
    return this.and(`${field}:>${value}`);
  }

  lessThan(field: string, value: number): this {
    return this.and(`${field}:<${value}`);
  }

  between(field: string, min: number, max: number): this {
    return this.and(`${field}:${min}-${max}`);
  }

  in(field: string, values: (string | number)[]): this {
    return this.and(`${field}:${values.join('|')}`);
  }

  contains(field: string, value: string): this {
    return this.and(`${field}.search:${value}`);
  }

  startsWith(field: string, value: string): this {
    return this.and(`${field}:${value}*`);
  }

  // Date filters
  dateEquals(field: string, date: Date | string): this {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return this.and(`${field}:${dateStr}`);
  }

  dateRange(field: string, from: Date | string, to: Date | string): this {
    const fromStr = typeof from === 'string' ? from : from.toISOString().split('T')[0];
    const toStr = typeof to === 'string' ? to : to.toISOString().split('T')[0];
    return this.and(`${field}:${fromStr}-${toStr}`);
  }

  dateAfter(field: string, date: Date | string): this {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return this.and(`${field}:>${dateStr}`);
  }

  dateBefore(field: string, date: Date | string): this {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return this.and(`${field}:<${dateStr}`);
  }

  // Null checks
  isNull(field: string): this {
    return this.and(`${field}:null`);
  }

  isNotNull(field: string): this {
    return this.and(`${field}:!null`);
  }

  // Boolean fields
  isTrue(field: string): this {
    return this.and(`${field}:true`);
  }

  isFalse(field: string): this {
    return this.and(`${field}:false`);
  }

  // Build the final filter string
  build(): string {
    if (this.isInGroup) {
      return this.currentGroup.join(',');
    }
    return this.filters.join(',');
  }

  // Clear all filters
  clear(): this {
    this.filters = [];
    this.currentGroup = [];
    return this;
  }

  // Check if empty
  isEmpty(): boolean {
    return this.filters.length === 0 && this.currentGroup.length === 0;
  }
}

// Convenience factory function
export function query(): QueryBuilder {
  return new QueryBuilder();
}

// Predefined filter builders for common use cases
export const filters = {
  // Works filters
  works: {
    openAccess: () => query().isTrue('is_oa'),
    notOpenAccess: () => query().isFalse('is_oa'),
    hasFulltext: () => query().isTrue('has_fulltext'),
    hasDoi: () => query().isNotNull('doi'),
    hasOrcid: () => query().isNotNull('authorships.author.orcid'),
    isRetracted: () => query().isTrue('is_retracted'),
    notRetracted: () => query().isFalse('is_retracted'),
    
    byYear: (year: number) => query().equals('publication_year', year),
    byYearRange: (from: number, to: number) => query().between('publication_year', from, to),
    afterYear: (year: number) => query().greaterThan('publication_year', year),
    beforeYear: (year: number) => query().lessThan('publication_year', year),
    
    byType: (type: string) => query().equals('type', type),
    byTypes: (types: string[]) => query().in('type', types),
    
    byAuthor: (authorId: string) => query().equals('authorships.author.id', authorId),
    byAuthors: (authorIds: string[]) => query().in('authorships.author.id', authorIds),
    
    byInstitution: (institutionId: string) => query().equals('authorships.institutions.id', institutionId),
    byInstitutions: (institutionIds: string[]) => query().in('authorships.institutions.id', institutionIds),
    
    bySource: (sourceId: string) => query().equals('primary_location.source.id', sourceId),
    bySources: (sourceIds: string[]) => query().in('primary_location.source.id', sourceIds),
    
    byFunder: (funderId: string) => query().equals('grants.funder', funderId),
    byFunders: (funderIds: string[]) => query().in('grants.funder', funderIds),
    
    byTopic: (topicId: string) => query().equals('topics.id', topicId),
    byTopics: (topicIds: string[]) => query().in('topics.id', topicIds),
    
    byCitationCount: (min: number, max?: number) => 
      max ? query().between('cited_by_count', min, max) : query().greaterThan('cited_by_count', min),
    
    cites: (workId: string) => query().equals('cites', workId),
    citedBy: (workId: string) => query().equals('cited_by', workId),
    
    titleContains: (text: string) => query().contains('title', text),
    abstractContains: (text: string) => query().contains('abstract', text),
    fulltextContains: (text: string) => query().contains('fulltext', text),
  },
  
  // Authors filters
  authors: {
    hasOrcid: () => query().isNotNull('orcid'),
    byOrcid: (orcid: string) => query().equals('orcid', orcid),
    
    byInstitution: (institutionId: string) => query().equals('last_known_institutions.id', institutionId),
    byCountry: (countryCode: string) => query().equals('last_known_institutions.country_code', countryCode),
    
    byWorksCount: (min: number, max?: number) =>
      max ? query().between('works_count', min, max) : query().greaterThan('works_count', min),
    
    byCitationCount: (min: number, max?: number) =>
      max ? query().between('cited_by_count', min, max) : query().greaterThan('cited_by_count', min),
    
    byHIndex: (min: number, max?: number) =>
      max ? query().between('summary_stats.h_index', min, max) : query().greaterThan('summary_stats.h_index', min),
    
    nameContains: (text: string) => query().contains('display_name', text),
  },
  
  // Sources filters
  sources: {
    isOpenAccess: () => query().isTrue('is_oa'),
    isInDoaj: () => query().isTrue('is_in_doaj'),
    isCore: () => query().isTrue('is_core'),
    
    byIssn: (issn: string) => query().equals('issn', issn),
    byPublisher: (publisher: string) => query().equals('publisher', publisher),
    byType: (type: string) => query().equals('type', type),
    byCountry: (countryCode: string) => query().equals('country_code', countryCode),
    
    hasApc: () => query().isNotNull('apc_usd'),
    apcRange: (min: number, max: number) => query().between('apc_usd', min, max),
    
    nameContains: (text: string) => query().contains('display_name', text),
  },
  
  // Institutions filters
  institutions: {
    hasRor: () => query().isNotNull('ror'),
    byRor: (ror: string) => query().equals('ror', ror),
    
    byType: (type: string) => query().equals('type', type),
    byCountry: (countryCode: string) => query().equals('country_code', countryCode),
    byContinent: (continent: string) => query().equals('continent', continent),
    isGlobalSouth: () => query().isTrue('is_global_south'),
    
    byWorksCount: (min: number, max?: number) =>
      max ? query().between('works_count', min, max) : query().greaterThan('works_count', min),
    
    nameContains: (text: string) => query().contains('display_name', text),
  },
};

// Export helper to combine multiple filters
export function combineFilters(...filters: (QueryBuilder | string)[]): string {
  const qb = new QueryBuilder();
  filters.forEach(filter => {
    if (filter instanceof QueryBuilder) {
      qb.and(filter);
    } else if (filter) {
      qb.and(filter);
    }
  });
  return qb.build();
}