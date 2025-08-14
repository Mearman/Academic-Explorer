/**
 * Skeleton Atom
 * Basic skeleton loading placeholder
 */

import React from 'react';
import * as styles from './skeleton.css';

export interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export function Skeleton({ 
  className = '', 
  width, 
  height,
  rounded = false 
}: SkeletonProps) {
  const style = {
    ...(width && { width }),
    ...(height && { height }),
  };
  
  return (
    <div
      className={`${styles.skeleton} ${rounded ? styles.rounded : styles.base} ${className}`}
      style={style}
    />
  );
}