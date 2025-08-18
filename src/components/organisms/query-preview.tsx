'use client';

import { useState, useEffect, useMemo } from 'react';
import { Code, Text, Badge, Card, Group, Stack, Divider, Alert, ScrollArea } from '@mantine/core';
import { IconInfoCircle, IconAlertTriangle, IconCheck, IconEye } from '@tabler/icons-react';

import type { WorksParams, Work, ApiResponse } from '@/lib/openalex/types';
import { useWorks } from '@/lib/react-query';
import { SearchResultItem } from '@/components/molecules/search-result-item/SearchResultItem';
import { LoadingSkeleton } from '@/components/atoms/loading-skeleton';

import * as styles from './query-preview.css';

interface QueryPreviewProps {
  /** Current search parameters */
  searchParams: WorksParams;
  /** Whether to show live preview results */
  showResults?: boolean;
  /** Maximum number of preview results to show */
  maxResults?: number;
}

export function QueryPreview({ 
  searchParams, 
  showResults = true, 
  maxResults = 3 
}: QueryPreviewProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Check if we have meaningful search parameters
  const hasSearch = searchParams.search && searchParams.search.trim() !== '';
  const hasFilter = searchParams.filter && (
    typeof searchParams.filter === 'string' 
      ? searchParams.filter.trim() !== ''
      : Object.keys(searchParams.filter).length > 0
  );
  const hasValidParams = hasSearch || hasFilter;
  
  // Create preview search params with limited results
  const previewParams = useMemo(() => {
    if (!hasValidParams) return null;
    
    return {
      ...searchParams,
      per_page: Math.min(maxResults, 10), // Limit for preview
      page: 1, // Always show first page in preview
    };
  }, [searchParams, hasValidParams, maxResults]);
  
  // Only run query if we have valid params
  const worksQuery = useWorks(previewParams || {}, {
    enabled: Boolean(previewParams && hasValidParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const data = worksQuery.data as ApiResponse<Work> | undefined;
  
  // Validate query parameters
  useEffect(() => {
    const errors: string[] = [];
    
    // Check for common issues
    if (searchParams.search) {
      const query = searchParams.search.trim();
      if (query.length < 2) {
        errors.push('Search query must be at least 2 characters long');
      }
      if (query.length > 1000) {
        errors.push('Search query is too long (maximum 1000 characters)');
      }
    }
    
    if (searchParams.per_page && (searchParams.per_page < 1 || searchParams.per_page > 200)) {
      errors.push('Results per page must be between 1 and 200');
    }
    
    if (searchParams.page && searchParams.page < 1) {
      errors.push('Page number must be 1 or greater');
    }
    
    setValidationErrors(errors);
  }, [searchParams]);
  
  // Format filter string for display
  const formatFilter = (filter: string) => {
    return filter.split(',').map(f => {
      const [key, value] = f.split(':');
      return `${key}: ${value}`;
    }).join('\n');
  };
  
  // Generate API request URL for display
  const generateApiUrl = () => {
    if (!hasValidParams) return null;
    
    const baseUrl = 'https://api.openalex.org/works';
    const params = new URLSearchParams();
    
    if (searchParams.search) {
      params.append('search', searchParams.search);
    }
    if (searchParams.filter) {
      params.append('filter', typeof searchParams.filter === 'string' ? searchParams.filter : JSON.stringify(searchParams.filter));
    }
    if (searchParams.sort) {
      params.append('sort', searchParams.sort);
    }
    if (searchParams.per_page) {
      params.append('per-page', searchParams.per_page.toString());
    }
    if (searchParams.page) {
      params.append('page', searchParams.page.toString());
    }
    
    return `${baseUrl}?${params.toString()}`;
  };
  
  const apiUrl = generateApiUrl();
  
  if (!hasValidParams) {
    return (
      <div className={styles.container}>
        <Alert 
          icon={<IconInfoCircle size={16} />} 
          title="Query Preview" 
          color="blue"
          variant="light"
        >
          <Text size="sm">
            Start building your query to see a live preview of the results and API request.
          </Text>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <Stack gap="md">
        {/* Validation Status */}
        {validationErrors.length > 0 ? (
          <Alert 
            icon={<IconAlertTriangle size={16} />} 
            title="Query Validation" 
            color="red"
            variant="light"
          >
            <Stack gap="xs">
              {validationErrors.map((error, index) => (
                <Text key={index} size="sm">{error}</Text>
              ))}
            </Stack>
          </Alert>
        ) : (
          <Alert 
            icon={<IconCheck size={16} />} 
            title="Query Valid" 
            color="green"
            variant="light"
          >
            <Text size="sm">Your query parameters are valid and ready to execute.</Text>
          </Alert>
        )}
        
        {/* Query Summary */}
        <Card withBorder>
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text fw={600} size="sm">Query Summary</Text>
              <Badge variant="light" size="sm">
                {data?.meta?.count ? `~${data.meta.count.toLocaleString()} results` : 'Estimating...'}
              </Badge>
            </Group>
            
            {searchParams.search && (
              <div>
                <Text size="xs" c="dimmed" fw={500}>Search Terms:</Text>
                <Code block className={styles.queryDisplay}>
                  {searchParams.search}
                </Code>
              </div>
            )}
            
            {searchParams.filter && (
              <div>
                <Text size="xs" c="dimmed" fw={500}>Filters:</Text>
                <Code block className={styles.queryDisplay}>
                  {typeof searchParams.filter === 'string' 
                    ? formatFilter(searchParams.filter)
                    : JSON.stringify(searchParams.filter, null, 2)
                  }
                </Code>
              </div>
            )}
            
            {searchParams.sort && (
              <div>
                <Text size="xs" c="dimmed" fw={500}>Sort:</Text>
                <Code className={styles.queryDisplay}>{searchParams.sort}</Code>
              </div>
            )}
          </Stack>
        </Card>
        
        {/* API Request Preview */}
        {apiUrl && (
          <Card withBorder>
            <Stack gap="xs">
              <Text fw={600} size="sm">API Request</Text>
              <ScrollArea.Autosize mah={120}>
                <Code block className={styles.apiUrl}>
                  {apiUrl}
                </Code>
              </ScrollArea.Autosize>
            </Stack>
          </Card>
        )}
        
        <Divider />
        
        {/* Live Results Preview */}
        {showResults && (
          <div>
            <Group justify="space-between" align="center" mb="md">
              <Group gap="xs">
                <IconEye size={16} />
                <Text fw={600} size="sm">Live Preview</Text>
              </Group>
              <Badge variant="outline" size="xs">
                First {maxResults} results
              </Badge>
            </Group>
            
            {worksQuery.isLoading && (
              <Stack gap="md">
                {Array.from({ length: maxResults }).map((_, index) => (
                  <LoadingSkeleton key={index} height="120px" />
                ))}
              </Stack>
            )}
            
            {worksQuery.isError && (
              <Alert 
                icon={<IconAlertTriangle size={16} />} 
                title="Preview Error" 
                color="red"
                variant="light"
              >
                <Text size="sm">
                  Unable to load preview results. Please check your query parameters.
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  {worksQuery.error instanceof Error ? worksQuery.error.message : 'Unknown error'}
                </Text>
              </Alert>
            )}
            
            {data?.results && data.results.length > 0 && (
              <Stack gap="md">
                {data.results.slice(0, maxResults).map((work) => (
                  <div key={work.id} className={styles.previewResult}>
                    <SearchResultItem work={work} onClick={() => {}} />
                  </div>
                ))}
                
                {data.meta?.count && data.meta.count > maxResults && (
                  <Alert 
                    icon={<IconInfoCircle size={16} />} 
                    color="blue"
                    variant="light"
                  >
                    <Text size="sm">
                      Showing {maxResults} of {data.meta.count.toLocaleString()} total results.
                      Submit your search to see all results.
                    </Text>
                  </Alert>
                )}
              </Stack>
            )}
            
            {data && data.results?.length === 0 && (
              <Alert 
                icon={<IconInfoCircle size={16} />} 
                title="No Results" 
                color="yellow"
                variant="light"
              >
                <Text size="sm">
                  Your query returned no results. Try adjusting your search terms or filters.
                </Text>
              </Alert>
            )}
          </div>
        )}
      </Stack>
    </div>
  );
}