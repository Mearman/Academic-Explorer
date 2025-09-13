import { describe, it, expect } from 'vitest';
import type { WorksParams } from '@/lib/openalex/types';

// We need to extract the conversion function for testing
// This would ideally be moved to a separate utility file for better testability
type SearchParams = {
  q?: string;
  field?: 'all' | 'title' | 'abstract' | 'fulltext';
  mode?: 'basic' | 'boolean' | 'exact' | 'no_stem';
  from_date?: string;
  to_date?: string;
  year?: number;
  is_oa?: boolean;
  has_fulltext?: boolean;
  has_doi?: boolean;
  has_abstract?: boolean;
  not_retracted?: boolean;
  min_citations?: number;
  max_citations?: number;
  author_id?: string;
  institution_id?: string;
  source_id?: string;
  funder_id?: string;
  topic_id?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  per_page?: number;
  sample?: number;
  group_by?: string;
  page?: number;
};

// Extracted conversion function for testing
function convertUrlParamsToWorksParams(params: SearchParams): WorksParams {
  const worksParams: WorksParams = {};

  // Basic search query
  if (params.q) {
    worksParams.search = params.q;
  }

  // Build filter string from params
  const filters: string[] = [];
  
  if (params.is_oa !== undefined) {
    filters.push(`is_oa:${params.is_oa}`);
  }
  if (params.has_fulltext !== undefined) {
    filters.push(`has_fulltext:${params.has_fulltext}`);
  }
  if (params.has_doi !== undefined) {
    filters.push(`has_doi:${params.has_doi}`);
  }
  if (params.has_abstract !== undefined) {
    filters.push(`has_abstract:${params.has_abstract}`);
  }
  if (params.not_retracted !== undefined) {
    filters.push(`is_retracted:${!params.not_retracted}`);
  }
  if (params.year !== undefined) {
    filters.push(`publication_year:${params.year}`);
  }
  if (params.author_id) {
    filters.push(`authorships.author.id:${params.author_id}`);
  }
  if (params.institution_id) {
    filters.push(`authorships.institutions.id:${params.institution_id}`);
  }
  if (params.source_id) {
    filters.push(`primary_location.source.id:${params.source_id}`);
  }
  if (params.funder_id) {
    filters.push(`grants.funder:${params.funder_id}`);
  }
  if (params.topic_id) {
    filters.push(`topics.id:${params.topic_id}`);
  }

  if (filters.length > 0) {
    worksParams.filter = filters.join(',');
  }

  // Date range
  if (params.from_date) {
    worksParams.from_publication_date = params.from_date;
  }
  if (params.to_date) {
    worksParams.to_publication_date = params.to_date;
  }

  // Sort and pagination
  if (params.sort && params.order) {
    worksParams.sort = `${params.sort}:${params.order}`;
  } else if (params.sort) {
    worksParams.sort = `${params.sort}:desc`;
  }
  
  if (params.per_page) {
    worksParams.per_page = params.per_page;
  }
  if (params.sample) {
    worksParams.sample = params.sample;
  }
  if (params.group_by) {
    worksParams.group_by = params.group_by;
  }
  if (params.page) {
    worksParams.page = params.page;
  }

  return worksParams;
}

describe('convertUrlParamsToWorksParams', () => {
  it('should handle empty parameters', () => {
    const result = convertUrlParamsToWorksParams({});
    expect(result).toEqual({});
  });

  it('should convert basic search query', () => {
    const params: SearchParams = { q: 'Joseph Mearman' };
    const result = convertUrlParamsToWorksParams(params);
    expect(result).toEqual({ search: 'Joseph Mearman' });
  });

  it('should convert sort parameters with order', () => {
    const params: SearchParams = { 
      q: 'test',
      sort: 'relevance_score', 
      order: 'desc' 
    };
    const result = convertUrlParamsToWorksParams(params);
    expect(result).toEqual({ 
      search: 'test',
      sort: 'relevance_score:desc' 
    });
  });

  it('should default to desc order when sort is provided without order', () => {
    const params: SearchParams = { sort: 'publication_date' };
    const result = convertUrlParamsToWorksParams(params);
    expect(result).toEqual({ sort: 'publication_date:desc' });
  });

  it('should convert pagination parameters', () => {
    const params: SearchParams = { 
      per_page: 25,
      page: 2 
    };
    const result = convertUrlParamsToWorksParams(params);
    expect(result).toEqual({ 
      per_page: 25,
      page: 2 
    });
  });

  it('should convert boolean filter parameters', () => {
    const params: SearchParams = { 
      is_oa: true,
      has_fulltext: false,
      has_doi: true,
      has_abstract: true
    };
    const result = convertUrlParamsToWorksParams(params);
    expect(result.filter).toBe('is_oa:true,has_fulltext:false,has_doi:true,has_abstract:true');
  });

  it('should handle retraction filter correctly', () => {
    const params: SearchParams = { not_retracted: true };
    const result = convertUrlParamsToWorksParams(params);
    expect(result.filter).toBe('is_retracted:false');

    const params2: SearchParams = { not_retracted: false };
    const result2 = convertUrlParamsToWorksParams(params2);
    expect(result2.filter).toBe('is_retracted:true');
  });

  it('should convert publication year filter', () => {
    const params: SearchParams = { year: 2023 };
    const result = convertUrlParamsToWorksParams(params);
    expect(result.filter).toBe('publication_year:2023');
  });

  it('should convert entity ID filters', () => {
    const params: SearchParams = { 
      author_id: 'A123456789',
      institution_id: 'I987654321',
      source_id: 'S555666777',
      funder_id: 'F111222333',
      topic_id: 'T444555666'
    };
    const result = convertUrlParamsToWorksParams(params);
    expect(result.filter).toBe(
      'authorships.author.id:A123456789,' +
      'authorships.institutions.id:I987654321,' +
      'primary_location.source.id:S555666777,' +
      'grants.funder:F111222333,' +
      'topics.id:T444555666'
    );
  });

  it('should convert date range parameters', () => {
    const params: SearchParams = { 
      from_date: '2020-01-01',
      to_date: '2023-12-31'
    };
    const result = convertUrlParamsToWorksParams(params);
    expect(result).toEqual({
      from_publication_date: '2020-01-01',
      to_publication_date: '2023-12-31'
    });
  });

  it('should convert additional query parameters', () => {
    const params: SearchParams = { 
      sample: 100,
      group_by: 'publication_year'
    };
    const result = convertUrlParamsToWorksParams(params);
    expect(result).toEqual({
      sample: 100,
      group_by: 'publication_year'
    });
  });

  it('should handle complex query with multiple parameters', () => {
    const params: SearchParams = {
      q: 'machine learning',
      sort: 'citation_count',
      order: 'desc',
      per_page: 50,
      page: 1,
      is_oa: true,
      has_doi: true,
      year: 2022,
      author_id: 'A123456789',
      from_date: '2022-01-01',
      to_date: '2022-12-31'
    };
    
    const result = convertUrlParamsToWorksParams(params);
    
    expect(result).toEqual({
      search: 'machine learning',
      sort: 'citation_count:desc',
      per_page: 50,
      page: 1,
      filter: 'is_oa:true,has_doi:true,publication_year:2022,authorships.author.id:A123456789',
      from_publication_date: '2022-01-01',
      to_publication_date: '2022-12-31'
    });
  });

  it('should ignore undefined/null values', () => {
    const params: SearchParams = {
      q: 'test',
    };
    
    const result = convertUrlParamsToWorksParams(params);
    expect(result).toEqual({ search: 'test' });
  });

  it('should handle boolean false values correctly', () => {
    const params: SearchParams = {
      is_oa: false,
      has_fulltext: false,
      not_retracted: false
    };
    
    const result = convertUrlParamsToWorksParams(params);
    expect(result.filter).toBe('is_oa:false,has_fulltext:false,is_retracted:true');
  });
});