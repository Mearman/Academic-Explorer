import { Box, Text, VisuallyHidden } from '@mantine/core';
import { useEffect, useState, useCallback, useRef } from 'react';

import * as styles from './accessible-loading-state.css';
import { EnhancedLoadingSkeleton } from './enhanced-loading-skeleton';

export interface LoadingPhase {
  label: string;
  description: string;
  duration: number;
}

export interface AccessibleLoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  
  // Accessibility props
  loadingLabel?: string;
  loadedLabel?: string;
  errorLabel?: string;
  progressDescription?: string;
  announceStateChanges?: boolean;
  
  // Progress tracking
  progress?: number;
  estimatedDuration?: number;
  loadingPhases?: LoadingPhase[];
  
  // Error handling
  error?: Error | string | null;
  onRetry?: () => void;
  retryLabel?: string;
  
  // Skeleton configuration
  skeletonType?: 'text' | 'card' | 'list' | 'custom';
  skeletonLines?: number;
  customSkeleton?: React.ReactNode;
  
  // Callbacks
  onLoadingComplete?: () => void;
  onError?: (error: Error | string) => void;
  
  // Advanced accessibility
  reducedMotion?: boolean;
  highContrast?: boolean;
  verboseAnnouncements?: boolean;
  keyboardNavigable?: boolean;
}

interface LoadingAnnouncementProps {
  message: string;
  priority: 'polite' | 'assertive';
  onAnnounced?: () => void;
}

/**
 * Accessible announcement component for screen readers
 */
const LoadingAnnouncement = ({ message, priority, onAnnounced }: LoadingAnnouncementProps) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (message && message !== currentMessage) {
      setCurrentMessage(message);
      
      // Clear message after announcement to prevent repetition
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        onAnnounced?.();
      }, 1000);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, currentMessage, onAnnounced]);

  if (!currentMessage) return null;

  return (
    <VisuallyHidden>
      <div 
        role="status" 
        aria-live={priority}
        aria-atomic="true"
        className={styles.announcement}
      >
        {currentMessage}
      </div>
    </VisuallyHidden>
  );
};

/**
 * Progress announcer for detailed progress updates
 */
const ProgressAnnouncer = ({ 
  progress, 
  phases, 
  currentPhase,
  verboseMode = false 
}: {
  progress: number;
  phases?: Array<{ label: string; description: string; duration: number }>;
  currentPhase?: number;
  verboseMode?: boolean;
}) => {
  const [lastAnnounced, setLastAnnounced] = useState<number>(-1);
  const [announcements, setAnnouncements] = useState<string[]>([]);

  interface ShouldAnnounceParams {
    current: number;
    last: number;
  }

  const shouldAnnounce = useCallback(({ current, last }: ShouldAnnounceParams) => {
    // Announce at 0%, 25%, 50%, 75%, and 100%
    const milestones = [0, 25, 50, 75, 100];
    return milestones.some(milestone => 
      last < milestone && current >= milestone
    );
  }, []);

  useEffect(() => {
    if (shouldAnnounce({ current: progress, last: lastAnnounced })) {
      const roundedProgress = Math.round(progress / 25) * 25;
      let announcement = `${roundedProgress}% complete`;
      
      if (phases && currentPhase !== undefined && phases[currentPhase]) {
        const phase = phases[currentPhase];
        announcement += `. ${phase.label}`;
        
        if (verboseMode && phase.description) {
          announcement += `. ${phase.description}`;
        }
      }
      
      setAnnouncements(prev => [...prev.slice(-2), announcement]);
      setLastAnnounced(progress);
    }
  }, [progress, lastAnnounced, phases, currentPhase, verboseMode, shouldAnnounce]);

  return (
    <>
      {announcements.map((announcement, index) => (
        <LoadingAnnouncement
          key={`${announcement}-${index}`}
          message={announcement}
          priority="polite"
        />
      ))}
    </>
  );
};

/**
 * Error state component with accessible retry functionality
 */
const ErrorState = ({ 
  error, 
  onRetry, 
  retryLabel = 'Try again',
  keyboardNavigable = true 
}: {
  error: Error | string;
  onRetry?: () => void;
  retryLabel?: string;
  keyboardNavigable?: boolean;
}) => {
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const errorMessage = typeof error === 'string' ? error : error.message;

  useEffect(() => {
    // Focus retry button when error appears for keyboard users
    if (keyboardNavigable && retryButtonRef.current) {
      retryButtonRef.current.focus();
    }
  }, [keyboardNavigable]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRetry?.();
    }
  };

  return (
    <Box className={styles.errorContainer} role="alert" aria-live="assertive">
      <Text className={styles.errorMessage}>
        Failed to load content: {errorMessage}
      </Text>
      {onRetry && (
        <button
          ref={retryButtonRef}
          onClick={onRetry}
          onKeyDown={handleKeyDown}
          className={styles.retryButton}
          aria-label={`${retryLabel}. ${errorMessage}`}
        >
          {retryLabel}
        </button>
      )}
    </Box>
  );
};

/**
 * Skeleton renderer based on type
 */
const SkeletonRenderer = ({ 
  type, 
  lines, 
  customSkeleton,
  reducedMotion,
  highContrast 
}: {
  type: 'text' | 'card' | 'list' | 'custom';
  lines: number;
  customSkeleton?: React.ReactNode;
  reducedMotion?: boolean;
  highContrast?: boolean;
}) => {
  if (type === 'custom' && customSkeleton) {
    return <>{customSkeleton}</>;
  }

  const commonProps = {
    respectMotionPreference: reducedMotion,
    highContrast,
    semanticRole: 'status' as const,
  };

  switch (type) {
    case 'card':
      return (
        <EnhancedLoadingSkeleton
          {...commonProps}
          preset="card"
          ariaLabel="Loading card content"
        />
      );
    
    case 'list':
      return (
        <Box className={styles.listSkeleton}>
          {Array.from({ length: lines }, (_, index) => (
            <Box key={index} className={styles.listItem}>
              <EnhancedLoadingSkeleton
                {...commonProps}
                preset="avatar"
                inline
                ariaLabel={`Loading list item ${index + 1} avatar`}
              />
              <Box className={styles.listItemContent}>
                <EnhancedLoadingSkeleton
                  {...commonProps}
                  preset="title"
                  width="60%"
                  ariaLabel={`Loading list item ${index + 1} title`}
                />
                <EnhancedLoadingSkeleton
                  {...commonProps}
                  preset="text"
                  width="80%"
                  ariaLabel={`Loading list item ${index + 1} description`}
                />
              </Box>
            </Box>
          ))}
        </Box>
      );
    
    default: // text
      return (
        <Box className={styles.textSkeleton}>
          {Array.from({ length: lines }, (_, index) => (
            <EnhancedLoadingSkeleton
              key={index}
              {...commonProps}
              preset="text"
              width={index === lines - 1 ? '75%' : 'full'}
              ariaLabel={`Loading text line ${index + 1} of ${lines}`}
            />
          ))}
        </Box>
      );
  }
};

/**
 * Custom hook for managing loading phases
 */
function useLoadingPhases(isLoading: boolean, loadingPhases?: LoadingPhase[]) {
  const [currentPhase, setCurrentPhase] = useState(0);

  useEffect(() => {
    if (isLoading && loadingPhases && loadingPhases.length > 0) {
      let phaseIndex = 0;
      let _accumulatedTime = 0;

      const progressPhase = () => {
        if (phaseIndex < loadingPhases.length) {
          setCurrentPhase(phaseIndex);
          _accumulatedTime += loadingPhases[phaseIndex].duration;
          
          const timer = setTimeout(() => {
            phaseIndex++;
            if (phaseIndex < loadingPhases.length) {
              progressPhase();
            }
          }, loadingPhases[phaseIndex].duration);

          return timer;
        }
      };

      const timer = progressPhase();
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [isLoading, loadingPhases]);

  return currentPhase;
}

/**
 * Main accessible loading state component
 */
export const AccessibleLoadingState = ({
  isLoading,
  children,
  loadingLabel = 'Loading content',
  loadedLabel = 'Content loaded successfully',
  errorLabel = 'Failed to load content',
  progressDescription,
  announceStateChanges = true,
  progress,
  estimatedDuration,
  loadingPhases,
  error,
  onRetry,
  retryLabel = 'Try again',
  skeletonType = 'text',
  skeletonLines = 3,
  customSkeleton,
  onLoadingComplete,
  onError,
  reducedMotion = false,
  highContrast = false,
  verboseAnnouncements: _verboseAnnouncements = false,
  keyboardNavigable = true,
}: AccessibleLoadingStateProps) => {
  const currentPhase = useLoadingPhases(isLoading, loadingPhases);
  const [hasAnnounced, setHasAnnounced] = useState(false);
  const [loadingStartTime] = useState(() => Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle state change announcements
  useEffect(() => {
    if (!announceStateChanges) return;

    if (isLoading && !hasAnnounced) {
      setHasAnnounced(true);
    } else if (!isLoading && hasAnnounced) {
      setHasAnnounced(false);
      onLoadingComplete?.();
    }
  }, [isLoading, hasAnnounced, announceStateChanges, onLoadingComplete]);

  // Handle errors
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Calculate loading duration for accessibility
  const getLoadingDuration = () => {
    return Math.round((Date.now() - loadingStartTime) / 1000);
  };

  const getMainContentLabel = () => {
    if (error) return errorLabel;
    if (isLoading) return loadingLabel;
    return loadedLabel;
  };

  const getProgressInfo = () => {
    if (!progress) return '';
    
    let info = `${Math.round(progress)}% complete`;
    
    if (estimatedDuration && progress > 0) {
      const remaining = Math.round((estimatedDuration * (100 - progress)) / 100);
      info += `, approximately ${remaining} seconds remaining`;
    }
    
    if (loadingPhases && currentPhase < loadingPhases.length) {
      info += `. Currently: ${loadingPhases[currentPhase].label}`;
    }
    
    return info;
  };

  // Error state
  if (error) {
    return (
      <Box ref={containerRef} className={styles.container}>
        <ErrorState
          error={error}
          onRetry={onRetry}
          retryLabel={retryLabel}
          keyboardNavigable={keyboardNavigable}
        />
        {announceStateChanges && (
          <LoadingAnnouncement
            message={`${errorLabel}: ${typeof error === 'string' ? error : error.message}`}
            priority="assertive"
          />
        )}
      </Box>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Box ref={containerRef} className={styles.container}>
        {/* Main loading region */}
        <Box
          role="status"
          aria-live="polite"
          aria-label={getMainContentLabel()}
          className={styles.loadingRegion}
        >
          {/* Progress information for screen readers */}
          {(progress !== undefined || progressDescription) && (
            <VisuallyHidden>
              <div aria-live="polite" aria-atomic="false">
                {progressDescription || getProgressInfo()}
              </div>
            </VisuallyHidden>
          )}

          {/* Visual skeleton */}
          <SkeletonRenderer
            type={skeletonType}
            lines={skeletonLines}
            customSkeleton={customSkeleton}
            reducedMotion={reducedMotion}
            highContrast={highContrast}
          />

          {/* Detailed progress announcements */}
          {progress !== undefined && (
            <ProgressAnnouncer
              progress={progress}
              phases={loadingPhases}
              currentPhase={currentPhase}
              verboseMode={_verboseAnnouncements}
            />
          )}

          {/* Loading start announcement */}
          {announceStateChanges && hasAnnounced && (
            <LoadingAnnouncement
              message={loadingLabel}
              priority="polite"
            />
          )}
        </Box>
      </Box>
    );
  }

  // Loaded state
  return (
    <Box ref={containerRef} className={styles.container}>
      {/* Announce successful load */}
      {announceStateChanges && (
        <LoadingAnnouncement
          message={`${loadedLabel}. Loading took ${getLoadingDuration()} seconds.`}
          priority="polite"
        />
      )}
      
      {/* Actual content */}
      <Box role="main" aria-label="Main content">
        {children}
      </Box>
    </Box>
  );
};

