import { Skeleton, Stack, Progress, Text, Box } from '@mantine/core';
import { forwardRef, useEffect, useState } from 'react';

import type { SizeVariant } from '../types';

import * as styles from './enhanced-loading-skeleton.css';

export interface EnhancedLoadingSkeletonProps {
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' | string;
  height?: SizeVariant | string;
  shape?: 'rectangle' | 'rounded' | 'pill' | 'circle' | 'square';
  preset?: 'text' | 'title' | 'subtitle' | 'button' | 'avatar' | 'badge' | 'card';
  animation?: 'pulse' | 'wave' | 'shimmer' | 'none';
  inline?: boolean;
  className?: string;
  'data-testid'?: string;
  allowPresetOverride?: boolean;
  
  // Enhanced features
  withProgress?: boolean;
  progressValue?: number;
  progressLabel?: string;
  loadingText?: string;
  estimatedDuration?: number;
  respectMotionPreference?: boolean;
  highContrast?: boolean;
  semanticRole?: 'status' | 'progressbar' | 'img' | 'none';
  ariaLabel?: string;
  
  // Callbacks
  onAnimationComplete?: () => void;
  onProgressChange?: (progress: number) => void;
}

export interface EnhancedSkeletonGroupProps {
  lines?: number;
  children?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
  
  // Enhanced features
  withProgress?: boolean;
  progressValue?: number;
  staggerAnimation?: boolean;
  animationDelay?: number;
  loadingPhases?: Array<{
    label: string;
    duration: number;
  }>;
  
  // Accessibility
  announcement?: string;
  liveRegion?: boolean;
}

const WIDTH_MAP = {
  xs: '4rem',
  sm: '8rem',
  md: '12rem',
  lg: '16rem',
  xl: '20rem',
  '2xl': '24rem',
  '3xl': '32rem',
  full: '100%',
} as const;

const HEIGHT_MAP = {
  xs: '1rem',
  sm: '1.25rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '2.5rem',
} as const;

const PRESET_DIMENSIONS = {
  text: { height: '1rem', width: '100%' },
  title: { height: '2rem', width: '60%' },
  subtitle: { height: '1.5rem', width: '40%' },
  button: { height: '2.25rem', width: '6rem' },
  avatar: { height: '2.5rem', width: '2.5rem' },
  badge: { height: '1.25rem', width: '4rem' },
  card: { height: '8rem', width: '100%' },
} as const;

/**
 * Hook to detect user motion preferences
 */
function useMotionPreference() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to detect high contrast preference
 */
function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
}

/**
 * Apply preset dimensions to width and height
 */
function applyPresetDimensions(
  width: string | undefined,
  height: string | SizeVariant,
  preset: EnhancedLoadingSkeletonProps['preset']
): { width: string | undefined; height: string | SizeVariant } {
  if (!preset || !PRESET_DIMENSIONS[preset]) {
    return { width, height };
  }

  const presetDims = PRESET_DIMENSIONS[preset];
  return {
    width: width || presetDims.width,
    height: height || presetDims.height,
  };
}

/**
 * Map dimension value to CSS value using appropriate map
 */
function mapDimensionValue(value: string | undefined, map: Record<string, string>): string | undefined {
  if (!value || typeof value !== 'string' || !(value in map)) {
    return value;
  }
  return map[value as keyof typeof map];
}

/**
 * Get border radius based on shape
 */
function getShapeRadius(shape: EnhancedLoadingSkeletonProps['shape']): string {
  switch (shape) {
    case 'circle':
    case 'pill':
      return 'xl';
    case 'rounded':
      return 'md';
    case 'square':
      return 'sm';
    default:
      return 'sm';
  }
}

/**
 * Get animation type based on preferences and settings
 */
function getEffectiveAnimation(
  animation: EnhancedLoadingSkeletonProps['animation'],
  respectMotionPreference: boolean,
  prefersReducedMotion: boolean
): EnhancedLoadingSkeletonProps['animation'] {
  if (respectMotionPreference && prefersReducedMotion) {
    return 'none';
  }
  return animation;
}

/**
 * Progress indicator component
 */
const ProgressIndicator = ({ 
  value, 
  label, 
  estimatedDuration,
  className 
}: {
  value?: number;
  label?: string;
  estimatedDuration?: number;
  className?: string;
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (estimatedDuration && value !== undefined) {
      const remaining = Math.round((estimatedDuration * (100 - value)) / 100);
      setTimeRemaining(remaining);
    }
  }, [value, estimatedDuration]);

  return (
    <Box {...(className && { className })}>
      <Progress
        value={value ?? 0}
        aria-label={label || 'Loading progress'}
        className={styles.progressBar}
        size="sm"
        radius="sm"
      />
      {(label || timeRemaining !== null) && (
        <Text size="sm" c="dimmed" mt="xs" className={styles.progressText}>
          {label}
          {timeRemaining !== null && ` (${timeRemaining}s remaining)`}
        </Text>
      )}
    </Box>
  );
};

export const EnhancedLoadingSkeleton = forwardRef<HTMLDivElement, EnhancedLoadingSkeletonProps>(
  ({
    width,
    height = 'md',
    shape = 'rectangle',
    preset,
    animation = 'wave',
    inline = false,
    className,
    'data-testid': testId,
    withProgress = false,
    progressValue,
    progressLabel,
    loadingText,
    estimatedDuration,
    respectMotionPreference = true,
    highContrast = false,
    semanticRole = 'none',
    ariaLabel,
    onAnimationComplete,
    onProgressChange,
    ...props
  }, ref) => {
    const prefersReducedMotion = useMotionPreference();
    const systemHighContrast = useHighContrast();
    const [internalProgress, setInternalProgress] = useState(progressValue || 0);

    // Apply user motion preferences
    const effectiveAnimation = getEffectiveAnimation(animation, respectMotionPreference, prefersReducedMotion);
    const useHighContrastMode = highContrast || systemHighContrast;

    // Apply preset dimensions if preset is specified
    const { width: finalWidth, height: finalHeight } = applyPresetDimensions(width, height, preset);

    // Map dimension values to CSS values
    const mappedWidth = mapDimensionValue(finalWidth, WIDTH_MAP);
    const mappedHeight = mapDimensionValue(finalHeight as string, HEIGHT_MAP);

    // Handle progress updates
    useEffect(() => {
      if (progressValue !== undefined) {
        setInternalProgress(progressValue);
        onProgressChange?.(progressValue);
      }
    }, [progressValue, onProgressChange]);

    // Auto-increment progress for demonstration (remove in production)
    useEffect(() => {
      if (withProgress && progressValue === undefined) {
        const interval = setInterval(() => {
          setInternalProgress(prev => {
            const next = Math.min(prev + 2, 100);
            onProgressChange?.(next);
            if (next === 100) {
              onAnimationComplete?.();
            }
            return next;
          });
        }, 100);

        return () => clearInterval(interval);
      }
      return undefined;
    }, [withProgress, progressValue, onProgressChange, onAnimationComplete]);

    // Determine ARIA attributes based on semantic role
    const getAriaAttributes = () => {
      const baseAttrs: Record<string, string | number | boolean | undefined> = {
        'data-testid': testId,
      };

      switch (semanticRole) {
        case 'status':
          return {
            ...baseAttrs,
            role: 'status',
            'aria-live': 'polite',
            'aria-label': ariaLabel || loadingText || 'Loading content',
          };
        case 'progressbar':
          return {
            ...baseAttrs,
            role: 'progressbar',
            'aria-valuenow': internalProgress,
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-label': ariaLabel || progressLabel || 'Loading progress',
          };
        case 'img':
          return {
            ...baseAttrs,
            role: 'img',
            'aria-label': ariaLabel || 'Loading placeholder image',
          };
        default:
          return {
            ...baseAttrs,
            'aria-hidden': 'true',
          };
      }
    };

    const skeletonClasses = [
      className,
      useHighContrastMode ? styles.highContrast : '',
      effectiveAnimation === 'shimmer' ? styles.shimmerAnimation : '',
    ].filter(Boolean).join(' ');

    return (
      <Box className={styles.container}>
        {withProgress && (
          <ProgressIndicator
            value={internalProgress}
            {...(progressLabel && { label: progressLabel })}
            {...(estimatedDuration !== undefined && { estimatedDuration })}
            className={styles.progressContainer}
          />
        )}
        
        {loadingText && semanticRole !== 'none' && (
          <Text size="sm" c="dimmed" mb="xs" className={styles.loadingText}>
            {loadingText}
          </Text>
        )}

        <Skeleton
          ref={ref}
          width={mappedWidth}
          height={mappedHeight}
          radius={getShapeRadius(shape)}
          animate={effectiveAnimation !== 'none'}
          className={skeletonClasses}
          style={{ display: inline ? 'inline-block' : 'block' }}
          {...(getAriaAttributes() as React.ComponentProps<typeof Skeleton>)}
          {...props}
        />
      </Box>
    );
  }
);

EnhancedLoadingSkeleton.displayName = 'EnhancedLoadingSkeleton';

export const EnhancedSkeletonGroup = forwardRef<HTMLDivElement, EnhancedSkeletonGroupProps>(
  ({
    lines = 3,
    children,
    className,
    'data-testid': testId,
    withProgress = false,
    progressValue,
    staggerAnimation = false,
    animationDelay = 100,
    loadingPhases,
    announcement,
    liveRegion = false,
    ...props
  }, ref) => {
    const [_currentPhase, setCurrentPhase] = useState(0);
    const [announceText, setAnnounceText] = useState(announcement || '');

    // Handle loading phases
    useEffect(() => {
      if (loadingPhases && loadingPhases.length > 0) {
        let phaseIndex = 0;
        const cyclePhases = () => {
          if (loadingPhases && phaseIndex < loadingPhases.length && loadingPhases[phaseIndex]) {
            const currentPhaseData = loadingPhases[phaseIndex];
            if (currentPhaseData) {
              setAnnounceText(currentPhaseData.label);
              setCurrentPhase(phaseIndex);
              const phaseDuration = currentPhaseData.duration;

              setTimeout(() => {
                phaseIndex++;
                if (loadingPhases && phaseIndex < loadingPhases.length) {
                  cyclePhases();
                }
              }, phaseDuration);
            }
          }
        };
        
        cyclePhases();
      }
    }, [loadingPhases]);

    const containerProps = {
      ref,
      className: [styles.groupContainer, className].filter(Boolean).join(' '),
      'data-testid': testId,
      ...(liveRegion && {
        'aria-live': 'polite' as const,
        'aria-label': 'Loading content',
      }),
      ...props,
    };

    return (
      <Box {...containerProps}>
        {liveRegion && announceText && (
          <Text className={styles.srOnly}>{announceText}</Text>
        )}
        
        <Stack gap="xs" className={styles.skeletonStack}>
          {children || Array.from({ length: lines }, (_, index) => (
            <EnhancedLoadingSkeleton
              key={index}
              preset="text"
              width={index === lines - 1 ? '75%' : 'full'}
              withProgress={withProgress && index === 0}
              {...(progressValue !== undefined && { progressValue })}
              {...(staggerAnimation && { 'data-stagger-delay': index * animationDelay })}
              respectMotionPreference
            />
          ))}
        </Stack>
      </Box>
    );
  }
);

EnhancedSkeletonGroup.displayName = 'EnhancedSkeletonGroup';

// Enhanced preset skeleton components
export const EnhancedTextSkeleton = (props: Omit<EnhancedLoadingSkeletonProps, 'preset'>) => (
  <EnhancedLoadingSkeleton {...props} preset="text" semanticRole="status" />
);

export const EnhancedTitleSkeleton = (props: Omit<EnhancedLoadingSkeletonProps, 'preset'>) => (
  <EnhancedLoadingSkeleton {...props} preset="title" semanticRole="status" />
);

export const EnhancedButtonSkeleton = (props: Omit<EnhancedLoadingSkeletonProps, 'preset'>) => (
  <EnhancedLoadingSkeleton {...props} preset="button" semanticRole="status" />
);

export const EnhancedAvatarSkeleton = (props: Omit<EnhancedLoadingSkeletonProps, 'preset'>) => (
  <EnhancedLoadingSkeleton {...props} preset="avatar" semanticRole="img" />
);

export const EnhancedBadgeSkeleton = (props: Omit<EnhancedLoadingSkeletonProps, 'preset'>) => (
  <EnhancedLoadingSkeleton {...props} preset="badge" semanticRole="status" />
);

export const EnhancedCardSkeleton = (props: Omit<EnhancedLoadingSkeletonProps, 'preset'>) => (
  <EnhancedLoadingSkeleton {...props} preset="card" semanticRole="status" />
);

// Progress-aware skeleton with automatic state management
export const ProgressAwareSkeleton = ({
  phases,
  onComplete,
  ...props
}: {
  phases: Array<{ label: string; duration: number }>;
  onComplete?: () => void;
} & Omit<EnhancedLoadingSkeletonProps, 'withProgress' | 'progressValue'>) => {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!phases || phases.length === 0) return;

    let totalDuration = 0;
    const _currentDuration = 0;

    phases.forEach(phase => {
      totalDuration += phase.duration;
    });

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + (100 / totalDuration) * 50, 100);
        
        // Update current phase
        let accumulatedDuration = 0;
        for (let i = 0; i < phases.length; i++) {
          const phase = phases[i];
          if (phase) {
            accumulatedDuration += phase.duration;
            if ((newProgress / 100) * totalDuration <= accumulatedDuration) {
              setCurrentPhase(i);
              break;
            }
          }
        }

        if (newProgress >= 100) {
          clearInterval(interval);
          onComplete?.();
        }

        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [phases, onComplete]);

  return (
    <EnhancedLoadingSkeleton
      {...props}
      withProgress
      progressValue={progress}
      progressLabel={phases[currentPhase]?.label || 'Loading...'}
      semanticRole="progressbar"
    />
  );
};