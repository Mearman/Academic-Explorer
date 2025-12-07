/**
 * Data Fetcher Component
 *
 * Provides a unified component for data fetching operations with integrated
 * error handling, loading states, and toast notifications. Improves both
 * user experience and developer experience by standardizing common patterns.
 */

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import { ErrorBoundary } from "./ErrorBoundary";
import { CardSkeleton, ListSkeleton, GraphSkeleton, StatsSkeleton } from "./LoadingSkeleton";
import { ToastManager, useToast } from "./ToastNotification";

export interface DataFetcherConfig<T> {
  /** Function to fetch data */
  fetchFn: () => Promise<T>;
  /** Dependencies that should trigger refetch */
  deps?: unknown[];
  /** Initial data to use before first fetch */
  initialData?: T;
  /** Whether to fetch on mount */
  fetchOnMount?: boolean;
  /** Custom error message for display */
  errorMessage?: string;
  /** Custom loading message */
  loadingMessage?: string;
  /** Whether to show success toast on fetch */
  showSuccessToast?: boolean;
  /** Success toast message */
  successMessage?: string;
  /** Whether to show error toast on failure */
  showErrorToast?: boolean;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delay: number;
  };
  /** Loading skeleton type */
  skeletonType?: "text" | "card" | "list" | "table" | "graph" | "stats";
  /** Number of skeleton items to show */
  skeletonCount?: number;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Custom error component */
  errorComponent?: ReactNode;
  /** Custom empty component */
  emptyComponent?: ReactNode;
  /** Function to determine if data is empty */
  isEmpty?: (data: T) => boolean;
}

export interface DataFetcherProps<T> {
  /** Configuration object */
  config: DataFetcherConfig<T>;
  /** Render function with data state */
  children: (state: {
    data: T | undefined;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    retryCount: number;
  }) => ReactNode;
}

/**
 * Hook for data fetching with integrated error handling and toasts
 */
export function useDataFetcher<T>(config: DataFetcherConfig<T>) {
  const toast = useToast();
  const [data, setData] = useState<T | undefined>(config.initialData);
  const [loading, setLoading] = useState(config.fetchOnMount ?? true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const executeFetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await config.fetchFn();
      setData(result);

      // Show success toast if enabled
      if (config.showSuccessToast && retryCount === 0) {
        toast.success(config.successMessage || "Data loaded successfully");
      }

      setRetryCount(0);
      return result;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error("Unknown error occurred");
      setError(errorObj);

      // Show error toast if enabled
      if (config.showErrorToast) {
        toast.error(config.errorMessage || errorObj.message);
      }

      // Handle retry logic
      if (config.retry && retryCount < config.retry.maxAttempts) {
        setRetryCount((prev) => prev + 1);
        setTimeout(() => {
          executeFetch();
        }, config.retry.delay);
      }

      throw errorObj;
    } finally {
      setLoading(false);
    }
  }, [config, toast, retryCount]);

  const refetch = useCallback(async () => {
    setRetryCount(0);
    await executeFetch();
  }, [executeFetch]);

  useEffect(() => {
    if (config.fetchOnMount !== false) {
      executeFetch();
    }
  }, [executeFetch, ...(config.deps || [])]);

  return {
    data,
    loading,
    error,
    refetch,
    retryCount,
  };
};

/**
 * Data Fetcher Component that provides integrated UI and state management
 */
export function DataFetcher<T>({ config, children }: DataFetcherProps<T>) {
  const { data, loading, error, refetch, retryCount } = useDataFetcher(config);

  // Check if data is empty
  const isEmpty = config.isEmpty ? (data !== undefined && config.isEmpty(data)) : !data;

  // Handle loading state
  if (loading) {
    if (config.loadingComponent) {
      return <>{config.loadingComponent}</>;
    }

    const SkeletonComponent = {
      card: CardSkeleton,
      list: ListSkeleton,
      graph: GraphSkeleton,
      stats: StatsSkeleton,
      text: ListSkeleton,
      table: ListSkeleton,
    }[config.skeletonType || "card"] || CardSkeleton;

    if (config.skeletonType === "list" || config.skeletonType === "text" || config.skeletonType === "table") {
      return <SkeletonComponent items={config.skeletonCount || 3} />;
    }
    return <SkeletonComponent />;
  }

  // Handle error state
  if (error && !config.retry?.maxAttempts) {
    if (config.errorComponent) {
      return <>{config.errorComponent}</>;
    }

    return (
      <ErrorBoundary
        showRetry={true}
        title="Data Loading Error"
        description={config.errorMessage || error.message}
        onError={() => refetch()}
      >
        <div>Failed to load data</div>
      </ErrorBoundary>
    );
  }

  // Handle empty state
  if (isEmpty && !loading && !error) {
    if (config.emptyComponent) {
      return <>{config.emptyComponent}</>;
    }
  }

  // Render children with state
  return <>{children({ data, loading, error, refetch, retryCount })}</>;
};

/**
 * Specialized fetcher for API responses with count and results
 */
export function usePaginatedFetcher<T>(
  fetchFn: (page?: number, perPage?: number) => Promise<{
    results: T[];
    count: number;
    page?: number;
    perPage?: number;
  }>,
  options?: {
    initialPage?: number;
    perPage?: number;
    autoFetch?: boolean;
  }
) {
  const [page, setPage] = useState(options?.initialPage || 1);
  const [perPage, setPerPage] = useState(options?.perPage || 25);
  const [pagination, setPagination] = useState<{
    results: T[];
    count: number;
    page?: number;
    perPage?: number;
  }>({
    results: [],
    count: 0,
    page: 1,
    perPage: 25,
  });

  const { loading, error, refetch } = useDataFetcher({
    fetchFn: () => fetchFn(page, perPage),
    deps: [page, perPage],
    fetchOnMount: options?.autoFetch !== false,
    showSuccessToast: false,
    showErrorToast: true,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchFn(page, perPage);
        setPagination(result);
      } catch (err) {
        // Error handled by useDataFetcher
      }
    };

    if (options?.autoFetch !== false) {
      loadData();
    }
  }, [page, perPage, fetchFn, options?.autoFetch]);

  const nextPage = () => setPage((prev) => prev + 1);
  const prevPage = () => setPage((prev) => Math.max(1, prev - 1));
  const goToPage = (newPage: number) => setPage(Math.max(1, newPage));
  const changePerPage = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1); // Reset to first page
  };

  return {
    data: pagination.results,
    count: pagination.count,
    page,
    perPage,
    totalPages: Math.ceil(pagination.count / perPage),
    loading,
    error,
    refetch,
    nextPage,
    prevPage,
    goToPage,
    changePerPage,
    hasNextPage: page * perPage < pagination.count,
    hasPrevPage: page > 1,
  };
};

/**
 * Higher-order component for adding data fetching to existing components
 */
export function withDataFetching<P extends object>(
  Component: React.ComponentType<P>,
  config: DataFetcherConfig<any>
) {
  const WrappedComponent = (props: Omit<P, keyof ReturnType<typeof useDataFetcher>>) => {
    return (
      <DataFetcher config={config}>
        {(state) => <Component {...(props as P)} {...state} />}
      </DataFetcher>
    );
  };

  WrappedComponent.displayName = `withDataFetching(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

/**
 * Predefined configurations for common use cases
 */
export const DataFetcherConfigs = {
  /** Configuration for entity list fetching */
  entityList: {
    skeletonType: "list" as const,
    skeletonCount: 5,
    showSuccessToast: false,
    showErrorToast: true,
    retry: {
      maxAttempts: 3,
      delay: 1000,
    },
  },

  /** Configuration for search results */
  search: {
    skeletonType: "card" as const,
    skeletonCount: 6,
    showSuccessToast: false,
    showErrorToast: true,
    errorMessage: "Search failed. Please try again.",
  },

  /** Configuration for entity details */
  entityDetails: {
    skeletonType: "card" as const,
    skeletonCount: 1,
    showSuccessToast: false,
    showErrorToast: true,
    retry: {
      maxAttempts: 2,
      delay: 500,
    },
  },

  /** Configuration for graph data */
  graphData: {
    skeletonType: "graph" as const,
    skeletonCount: 1,
    showSuccessToast: true,
    successMessage: "Graph data loaded successfully",
    showErrorToast: true,
    retry: {
      maxAttempts: 1,
      delay: 2000,
    },
  },
} as const;

export default DataFetcher;