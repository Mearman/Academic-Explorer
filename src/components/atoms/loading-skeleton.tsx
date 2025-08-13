'use client';

import { forwardRef } from 'react';
import * as styles from './loading-skeleton.css';
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
}

export interface SkeletonGroupProps {
  lines?: number;
  children?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
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
    const getWidthClass = (widthProp?: string) => {
      if (!widthProp) return '';
      
      // Check if it's a preset width
      if (widthProp in styles.widthVariants) {
        return styles.widthVariants[widthProp as keyof typeof styles.widthVariants];
      }
      
      return '';
    };

    const getHeightClass = (heightProp: string) => {
      // Check if it's a size variant
      if (heightProp in styles.sizeVariants) {
        return styles.sizeVariants[heightProp as SizeVariant];
      }
      
      return '';
    };

    const baseClasses = [
      styles.base,
      preset ? styles.presetVariants[preset] : '',
      !preset && getHeightClass(height),
      !preset && width && getWidthClass(width),
      !preset && shape && styles.shapeVariants[shape],
      animation && styles.animationVariants[animation],
      inline ? styles.inlineStyle : styles.blockStyle,
      className,
    ].filter(Boolean).join(' ');

    const customStyle: React.CSSProperties = {};
    
    // Handle custom width/height values
    if (!preset) {
      if (width && !getWidthClass(width)) {
        customStyle.width = width;
      }
      if (typeof height === 'string' && !getHeightClass(height)) {
        customStyle.height = height;
      }
    }

    return (
      <div
        ref={ref}
        className={baseClasses}
        style={Object.keys(customStyle).length > 0 ? customStyle : undefined}
        data-testid={testId}
        aria-hidden="true"
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
    const baseClasses = [
      styles.groupStyle,
      className,
    ].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={baseClasses}
        data-testid={testId}
        aria-hidden="true"
        {...props}
      >
        {children || (
          Array.from({ length: lines }, (_, index) => (
            <LoadingSkeleton
              key={index}
              preset="text"
              width={index === lines - 1 ? '75%' : 'full'}
            />
          ))
        )}
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