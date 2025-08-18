import { Skeleton, Stack } from '@mantine/core';
import { forwardRef } from 'react';

import type { SizeVariant } from '../types';

export interface LoadingSkeletonProps {
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' | string;
  height?: SizeVariant | string;
  shape?: 'rectangle' | 'rounded' | 'pill' | 'circle' | 'square';
  preset?: 'text' | 'title' | 'subtitle' | 'button' | 'avatar' | 'badge' | 'card';
  animation?: 'pulse' | 'wave' | 'none';
  inline?: boolean;
  className?: string;
  'data-testid'?: string;
  allowPresetOverride?: boolean;
}

export interface SkeletonGroupProps {
  lines?: number;
  children?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
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

export const LoadingSkeleton = forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ 
    width,
    height = 'md',
    shape = 'rectangle',
    preset,
    animation = 'wave',
    inline = false,
    className,
    'data-testid': testId,
    ...props 
  }, ref) => {
    let finalWidth = width;
    let finalHeight = height;
    
    // Apply preset dimensions if preset is specified
    if (preset && PRESET_DIMENSIONS[preset]) {
      const presetDims = PRESET_DIMENSIONS[preset];
      finalWidth = finalWidth || presetDims.width;
      finalHeight = finalHeight || presetDims.height;
    }
    
    // Map our width values to CSS values
    if (finalWidth && typeof finalWidth === 'string' && finalWidth in WIDTH_MAP) {
      finalWidth = WIDTH_MAP[finalWidth as keyof typeof WIDTH_MAP];
    }
    
    // Map our height values to CSS values
    if (finalHeight && typeof finalHeight === 'string' && finalHeight in HEIGHT_MAP) {
      finalHeight = HEIGHT_MAP[finalHeight as keyof typeof HEIGHT_MAP];
    }

    return (
      <Skeleton
        ref={ref}
        width={finalWidth}
        height={finalHeight}
        radius={shape === 'circle' ? 'xl' : shape === 'pill' ? 'xl' : 'sm'}
        animate={animation !== 'none'}
        className={className}
        data-testid={testId}
        style={{ display: inline ? 'inline-block' : 'block' }}
        {...props}
      />
    );
  }
);

LoadingSkeleton.displayName = 'LoadingSkeleton';

export const SkeletonGroup = forwardRef<HTMLDivElement, SkeletonGroupProps>(
  ({ 
    lines = 3, 
    children, 
    className,
    'data-testid': testId,
    ...props 
  }, ref) => {
    return (
      <Stack 
        ref={ref}
        gap="xs"
        className={className}
        data-testid={testId}
        {...props}
      >
        {children || Array.from({ length: lines }, (_, index) => (
          <LoadingSkeleton
            key={index}
            preset="text"
            width={index === lines - 1 ? '75%' : 'full'}
          />
        ))}
      </Stack>
    );
  }
);

SkeletonGroup.displayName = 'SkeletonGroup';

// Preset skeleton components for common patterns
export const TextSkeleton = (props: Omit<LoadingSkeletonProps, 'preset'>) => (
  <LoadingSkeleton {...props} preset="text" />
);

export const TitleSkeleton = (props: Omit<LoadingSkeletonProps, 'preset'>) => (
  <LoadingSkeleton {...props} preset="title" />
);

export const ButtonSkeleton = (props: Omit<LoadingSkeletonProps, 'preset'>) => (
  <LoadingSkeleton {...props} preset="button" />
);

export const AvatarSkeleton = (props: Omit<LoadingSkeletonProps, 'preset'>) => (
  <LoadingSkeleton {...props} preset="avatar" />
);

export const BadgeSkeleton = (props: Omit<LoadingSkeletonProps, 'preset'>) => (
  <LoadingSkeleton {...props} preset="badge" />
);

export const CardSkeleton = (props: Omit<LoadingSkeletonProps, 'preset'>) => (
  <LoadingSkeleton {...props} preset="card" />
);