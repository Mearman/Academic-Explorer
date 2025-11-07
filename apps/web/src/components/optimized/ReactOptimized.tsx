import React, {
  memo,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
  ComponentType,
  ReactNode,
} from "react";
import { logger } from "@academic-explorer/utils/logger";

/**
 * Higher-order component to optimize component rendering
 */
export function withPerformanceOptimization<P extends object>(
  Component: ComponentType<P>,
  options: {
    memo?: boolean;
    displayName?: string;
    trackRenders?: boolean;
    maxRenders?: number;
  } = {}
): ComponentType<P> {
  const {
    memo: shouldMemo = true,
    displayName = (Component as any).displayName || (Component as any).name || 'Component',
    trackRenders = process.env.NODE_ENV === 'development',
    maxRenders = 100,
  } = options;

  const WrappedComponent = shouldMemo ? memo(Component) : Component;

  const OptimizedComponent = (props: P) => {
    const renderCountRef = useRef(0);

    if (trackRenders) {
      renderCountRef.current++;

      if (renderCountRef.current > maxRenders) {
        logger.warn("performance", `Component ${displayName} rendered too many times`, {
          renderCount: renderCountRef.current,
          component: displayName,
        });
      }

      if (renderCountRef.current % 10 === 0) {
        logger.debug("performance", `Component ${displayName} render count`, {
          renderCount: renderCountRef.current,
        });
      }
    }

    return <WrappedComponent {...props} />;
  };

  (OptimizedComponent as any).displayName = `withPerformanceOptimization(${displayName})`;
  return OptimizedComponent as ComponentType<P>;
}

/**
 * Optimized virtual list component for large datasets
 */
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  getItemKey?: (item: T, index: number) => string | number;
}

export const VirtualList = memo(function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  getItemKey = (_, index) => index,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight,
    }));
  }, [items, itemHeight, scrollTop, containerHeight, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={getItemKey(item, index)}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}) as <T>(props: VirtualListProps<T>) => React.ReactElement;

(VirtualList as any).displayName = 'VirtualList';

/**
 * Debounced hook for search inputs and other interactive elements
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Intersection observer hook for lazy loading
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [(node: HTMLElement | null) => void, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [node, options]);

  return [setNode, isIntersecting];
}

/**
 * Lazy image component with intersection observer
 */
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholder?: string;
  threshold?: number;
  fadeIn?: boolean;
}

export const LazyImage = memo(function LazyImage({
  src,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+',
  threshold = 0.1,
  fadeIn = true,
  className,
  style,
  ...props
}: LazyImageProps) {
  const [ref, isIntersecting] = useIntersectionObserver({ threshold });
  const [hasLoaded, setHasLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder);

  useEffect(() => {
    if (isIntersecting && currentSrc === placeholder) {
      const img = new Image();
      img.src = src;

      img.onload = () => {
        setCurrentSrc(src);
        setHasLoaded(true);
      };

      img.onerror = () => {
        logger.error("performance", "Failed to load image", { src });
      };
    }
  }, [isIntersecting, src, currentSrc, placeholder]);

  return (
    <img
      ref={ref}
      src={currentSrc}
      className={className}
      style={{
        ...style,
        transition: fadeIn ? 'opacity 0.3s ease-in-out' : undefined,
        opacity: hasLoaded || currentSrc === placeholder ? 1 : 0,
      }}
      {...props}
    />
  );
});

/**
 * Optimized pagination hook
 */
export function usePagination<T>(
  items: T[],
  itemsPerPage: number
) {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(items.length / itemsPerPage);
  }, [items.length, itemsPerPage]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

/**
 * Performance measurement hook
 */
export function usePerformanceMeasure(name: string) {
  const startTimeRef = useRef<number | undefined>(undefined);

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const end = useCallback(() => {
    if (startTimeRef.current) {
      const duration = performance.now() - startTimeRef.current;
      logger.debug("performance", `Performance: ${name}`, { duration: `${duration.toFixed(2)}ms` });
      return duration;
    }
    return 0;
  }, [name]);

  return { start, end };
}

/**
 * Window resize hook with debouncing
 */
export function useWindowResize(delay: number = 250) {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const debouncedWindowSize = useDebounce(windowSize, delay);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return debouncedWindowSize;
}

/**
 * Optimized dropdown component that only renders when open
 */
interface OptimizedDropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

export const OptimizedDropdown = memo(function OptimizedDropdown({
  trigger,
  children,
  isOpen,
  onToggle,
}: OptimizedDropdownProps) {
  return (
    <div className="relative">
      <div onClick={onToggle} style={{ cursor: 'pointer' }}>
        {trigger}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
});