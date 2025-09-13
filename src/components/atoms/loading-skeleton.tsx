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

/**
 * Apply preset dimensions to width and height
 */
interface ApplyPresetDimensionsParams {
  width: string | undefined;
  height: string | SizeVariant;
  preset: LoadingSkeletonProps['preset'];
}

function applyPresetDimensions(params: ApplyPresetDimensionsParams): { width: string | undefined; height: string | SizeVariant } {
  const { width, height, preset } = params;
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
interface MapDimensionValueParams {
  value: string | undefined;
  map: Record<string, string>;
}

function mapDimensionValue(params: MapDimensionValueParams): string | undefined {
  const { value, map } = params;
  if (!value || typeof value !== 'string' || !(value in map)) {
    return value;
  }
  return map[value as keyof typeof map];
}

/**
 * Get border radius based on shape
 */
function getShapeRadius(shape: LoadingSkeletonProps['shape']): string {
  switch (shape) {
    case 'circle':
    case 'pill':
      return 'xl';
    default:
      return 'sm';
  }
}

export const LoadingSkeleton = forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  (props, ref) => {
    const { 
      width,
      height = 'md',
      shape = 'rectangle',
      preset,
      animation = 'wave',
      inline = false,
      className,
      'data-testid': testId,
      ...restProps 
    } = props;
    // Apply preset dimensions if preset is specified
    const { width: finalWidth, height: finalHeight } = applyPresetDimensions({ width, height, preset });
    
    // Map dimension values to CSS values
    const mappedWidth = mapDimensionValue({ value: finalWidth, map: WIDTH_MAP });
    const mappedHeight = mapDimensionValue({ value: finalHeight as string, map: HEIGHT_MAP });

    return (
      <Skeleton
        ref={ref}
        width={mappedWidth}
        height={mappedHeight}
        radius={getShapeRadius(shape)}
        animate={animation !== 'none'}
        {...(className && { className })}
        {...(testId && { 'data-testid': testId })}
        style={{ display: inline ? 'inline-block' : 'block' }}
        {...restProps}
      />
    );
  }
);

LoadingSkeleton.displayName = 'LoadingSkeleton';

export const SkeletonGroup = forwardRef<HTMLDivElement, SkeletonGroupProps>(
  (props, ref) => {
    const { 
      lines = 3, 
      children, 
      className,
      'data-testid': testId,
      ...restProps 
    } = props;
    return (
      <Stack
        ref={ref}
        gap="xs"
        {...(className && { className })}
        {...(testId && { 'data-testid': testId })}
        {...restProps}
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