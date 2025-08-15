'use client';

import { forwardRef } from 'react';

import type { SizeVariant } from '../types';

import * as styles from './loading-skeleton.css';

export interface LoadingSkeletonProps {
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' | string;
  height?: SizeVariant | string;
  shape?: 'rectangle' | 'rounded' | 'pill' | 'circle' | 'square';
  preset?: 'text' | 'title' | 'subtitle' | 'button' | 'avatar' | 'badge' | 'card';
  animation?: 'pulse' | 'wave' | 'none';
  inline?: boolean;
  className?: string;
  'data-testid'?: string;
}

export interface SkeletonGroupProps {
  lines?: number;
  children?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

/**
 * Get width CSS class for given width value
 */
function getWidthClass(widthProp?: string): string {
  if (!widthProp) return '';
  
  if (widthProp in styles.widthVariants) {
    return styles.widthVariants[widthProp as keyof typeof styles.widthVariants];
  }
  
  return '';
}

/**
 * Get height CSS class for given height value
 */
function getHeightClass(heightProp: string): string {
  if (heightProp in styles.sizeVariants) {
    return styles.sizeVariants[heightProp as SizeVariant];
  }
  
  return '';
}

/**
 * Build CSS classes for skeleton
 */
function buildSkeletonClasses(
  preset?: string,
  height?: string,
  width?: string,
  shape?: string,
  animation?: string,
  inline?: boolean,
  className?: string
): string {
  const classes = [styles.base];
  
  if (preset) {
    classes.push(styles.presetVariants[preset as keyof typeof styles.presetVariants]);
  } else {
    if (height) classes.push(getHeightClass(height));
    if (width) classes.push(getWidthClass(width));
    if (shape) classes.push(styles.shapeVariants[shape as keyof typeof styles.shapeVariants]);
  }
  
  if (animation) classes.push(styles.animationVariants[animation as keyof typeof styles.animationVariants]);
  classes.push(inline ? styles.inlineStyle : styles.blockStyle);
  if (className) classes.push(className);
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Build custom inline styles for skeleton
 */
function buildCustomStyles(
  preset?: string,
  width?: string,
  height?: string | SizeVariant
): React.CSSProperties {
  if (preset) return {};
  
  const customStyle: React.CSSProperties = {};
  
  if (width && !getWidthClass(width)) {
    customStyle.width = width;
  }
  
  if (typeof height === 'string' && !getHeightClass(height)) {
    customStyle.height = height;
  }
  
  return customStyle;
}

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
    const cssClasses = buildSkeletonClasses(preset, height, width, shape, animation, inline, className);
    const customStyle = buildCustomStyles(preset, width, height);
    const hasCustomStyle = Object.keys(customStyle).length > 0;

    return (
      <div
        ref={ref}
        className={cssClasses}
        style={hasCustomStyle ? customStyle : undefined}
        data-testid={testId}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

LoadingSkeleton.displayName = 'LoadingSkeleton';

/**
 * Render default skeleton lines
 */
function renderDefaultLines(lines: number) {
  return Array.from({ length: lines }, (_, index) => (
    <LoadingSkeleton
      key={index}
      preset="text"
      width={index === lines - 1 ? '75%' : 'full'}
    />
  ));
}

export const SkeletonGroup = forwardRef<HTMLDivElement, SkeletonGroupProps>(
  ({ 
    lines = 3, 
    children, 
    className,
    'data-testid': testId,
    ...props 
  }, ref) => {
    const cssClasses = [styles.groupStyle, className].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={cssClasses}
        data-testid={testId}
        aria-hidden="true"
        {...props}
      >
        {children || renderDefaultLines(lines)}
      </div>
    );
  }
);

SkeletonGroup.displayName = 'SkeletonGroup';

// Preset skeleton components for common patterns
export const TextSkeleton = (props: Omit<LoadingSkeletonProps, 'preset'>) => (
  <LoadingSkeleton preset="text" {...props} />
);

export const TitleSkeleton = (props: Omit<LoadingSkeletonProps, 'preset'>) => (
  <LoadingSkeleton preset="title" {...props} />
);

export const ButtonSkeleton = (props: Omit<LoadingSkeletonProps, 'preset'>) => (
  <LoadingSkeleton preset="button" {...props} />
);

export const AvatarSkeleton = (props: Omit<LoadingSkeletonProps, 'preset'>) => (
  <LoadingSkeleton preset="avatar" {...props} />
);

export const BadgeSkeleton = (props: Omit<LoadingSkeletonProps, 'preset'>) => (
  <LoadingSkeleton preset="badge" {...props} />
);

export const CardSkeleton = (props: Omit<LoadingSkeletonProps, 'preset'>) => (
  <LoadingSkeleton preset="card" {...props} />
);