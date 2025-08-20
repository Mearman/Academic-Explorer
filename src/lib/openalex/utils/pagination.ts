/**
 * Pagination utilities for OpenAlex API
 * Handles both page-based and cursor-based pagination
 */

import type { OpenAlexClient } from '../client';
import type { ApiResponse, BaseParams } from '../types';

export interface PaginationOptions {
  perPage?: number;
  maxResults?: number;
  useCursor?: boolean;
  onPage?: (page: number, results: unknown[]) => void;
  onProgress?: (current: number, total: number) => void;
}

interface PaginatorConstructorOptions {
  client: OpenAlexClient;
  endpoint: string;
  method: keyof OpenAlexClient;
  params?: BaseParams;
  options?: PaginationOptions;
}

export class Paginator<T> {
  private client: OpenAlexClient;
  private endpoint: string;
  private method: keyof OpenAlexClient;
  private baseParams: BaseParams;
  private options: PaginationOptions;

  constructor(constructorOptions: PaginatorConstructorOptions) {
    const { client, endpoint, method, params = {}, options = {} } = constructorOptions;
    this.client = client;
    this.endpoint = endpoint;
    this.method = method;
    this.baseParams = params;
    this.options = {
      perPage: options.perPage || 200, // Max allowed by OpenAlex
      maxResults: options.maxResults || Infinity,
      useCursor: options.useCursor !== false, // Default to cursor pagination
      onPage: options.onPage,
      onProgress: options.onProgress,
    };
  }

  // Get all results (use with caution for large datasets)
  async all(): Promise<T[]> {
    const results: T[] = [];
    
    for await (const batch of this) {
      results.push(...batch);
      if (results.length >= this.options.maxResults!) {
        return results.slice(0, this.options.maxResults);
      }
    }
    
    return results;
  }

  // Get a specific number of results
  async take(count: number): Promise<T[]> {
    const results: T[] = [];
    
    for await (const batch of this) {
      results.push(...batch);
      if (results.length >= count) {
        return results.slice(0, count);
      }
    }
    
    return results;
  }

  // Async iterator implementation
  async *[Symbol.asyncIterator](): AsyncGenerator<T[], void, unknown> {
    if (this.options.useCursor) {
      yield* this.cursorPaginate();
    } else {
      yield* this.pagePaginate();
    }
  }

  // Cursor-based pagination (more efficient)
  private async *cursorPaginate(): AsyncGenerator<T[], void, unknown> {
    let cursor: string | undefined;
    let totalRetrieved = 0;
    let page = 1;

    while (totalRetrieved < this.options.maxResults!) {
      const params: BaseParams = {
        ...this.baseParams,
        per_page: Math.min(
          this.options.perPage!,
          this.options.maxResults! - totalRetrieved
        ),
      };

      if (cursor) {
        params.cursor = cursor;
      }

      try {
        // Call the method dynamically
        const method = this.client[this.method as keyof OpenAlexClient] as (params: BaseParams) => Promise<ApiResponse<T>>;
        const response = await method.call(this.client, params);
        
        if (!response.results || response.results.length === 0) {
          break;
        }

        totalRetrieved += response.results.length;
        
        // Call callbacks
        this.options.onPage?.(page, response.results);
        this.options.onProgress?.(totalRetrieved, response.meta.count);
        
        yield response.results;
        
        // Check if there are more results
        if (!response.meta.next_cursor || totalRetrieved >= response.meta.count) {
          break;
        }
        
        cursor = response.meta.next_cursor;
        page++;
      } catch (error) {
        throw new PaginationError(`Pagination failed at cursor: ${cursor}`, error);
      }
    }
  }

  // Page-based pagination (fallback)
  private async *pagePaginate(): AsyncGenerator<T[], void, unknown> {
    let page = 1;
    let totalRetrieved = 0;
    let totalCount: number | undefined;

    while (totalRetrieved < this.options.maxResults!) {
      const params: BaseParams = {
        ...this.baseParams,
        page,
        per_page: Math.min(
          this.options.perPage!,
          this.options.maxResults! - totalRetrieved
        ),
      };

      try {
        const method = this.client[this.method as keyof OpenAlexClient] as (params: BaseParams) => Promise<ApiResponse<T>>;
        const response = await method.call(this.client, params);
        
        if (!response.results || response.results.length === 0) {
          break;
        }

        totalCount = response.meta.count;
        totalRetrieved += response.results.length;
        
        // Call callbacks
        this.options.onPage?.(page, response.results);
        this.options.onProgress?.(totalRetrieved, totalCount);
        
        yield response.results;
        
        // Check if there are more results
        if (totalRetrieved >= totalCount) {
          break;
        }
        
        page++;
      } catch (error) {
        throw new PaginationError(`Pagination failed at page ${page}`, error);
      }
    }
  }

  // Stream results one by one
  async *stream(): AsyncGenerator<T, void, unknown> {
    for await (const batch of this) {
      for (const item of batch) {
        yield item;
      }
    }
  }

  // Process results in batches with a callback
  async processBatches(
    callback: (batch: T[], batchNumber: number) => Promise<void> | void
  ): Promise<void> {
    let batchNumber = 1;
    
    for await (const batch of this) {
      await callback(batch, batchNumber);
      batchNumber++;
    }
  }

  // Process results one by one with a callback
  async processItems(
    callback: (item: T, index: number) => Promise<void> | void
  ): Promise<void> {
    let index = 0;
    
    for await (const item of this.stream()) {
      await callback(item, index);
      index++;
    }
  }

  // Collect results into pages
  async pages(pageCount?: number): Promise<T[][]> {
    const pages: T[][] = [];
    let count = 0;
    
    for await (const batch of this) {
      pages.push(batch);
      count++;
      if (pageCount && count >= pageCount) {
        break;
      }
    }
    
    return pages;
  }
}

// Custom error class for pagination
export class PaginationError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'PaginationError';
  }
}

interface PaginateOptions {
  client: OpenAlexClient;
  endpoint: string;
  method: keyof OpenAlexClient;
  params?: BaseParams;
  options?: PaginationOptions;
}

// Helper function to create a paginator
export function paginate<T>(paginateOptions: PaginateOptions): Paginator<T> {
  return new Paginator<T>({
    client: paginateOptions.client,
    endpoint: paginateOptions.endpoint,
    method: paginateOptions.method,
    params: paginateOptions.params,
    options: paginateOptions.options,
  });
}

// Batch processor for handling large result sets efficiently
export class BatchProcessor<T> {
  private queue: T[] = [];
  private batchSize: number;
  private processor: (batch: T[]) => Promise<void>;
  private processing = false;

  constructor(
    batchSize: number,
    processor: (batch: T[]) => Promise<void>
  ) {
    this.batchSize = batchSize;
    this.processor = processor;
  }

  async add(items: T | T[]): Promise<void> {
    const itemsArray = Array.isArray(items) ? items : [items];
    this.queue.push(...itemsArray);
    
    if (this.queue.length >= this.batchSize && !this.processing) {
      await this.processBatch();
    }
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      await this.processor(batch);
    } finally {
      this.processing = false;
      
      // Process next batch if queue has enough items
      if (this.queue.length >= this.batchSize) {
        await this.processBatch();
      }
    }
  }

  async flush(): Promise<void> {
    while (this.queue.length > 0) {
      await this.processBatch();
    }
  }

  get queueSize(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}