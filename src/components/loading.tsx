/**
 * Loading Components for Entity Pages
 * Provides skeleton loading states and spinners
 */

import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`animate-spin ${sizeClasses[size]} ${className}`}>
      <svg
        className="w-full h-full text-blue-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

export interface EntityLoadingProps {
  entityType?: string;
  entityId?: string;
  message?: string;
}

export function EntityLoading({ 
  entityType = 'entity', 
  entityId,
  message 
}: EntityLoadingProps) {
  const displayMessage = message || `Loading ${entityType.slice(0, -1)}...`;
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          {displayMessage}
        </h2>
        {entityId && (
          <p className="text-sm text-gray-600">
            ID: <code className="bg-gray-100 px-1 rounded">{entityId}</code>
          </p>
        )}
      </div>
    </div>
  );
}

export interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  const style = {
    ...(width && { width }),
    ...(height && { height }),
  };
  
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      style={style}
    />
  );
}

export function EntityPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Skeleton width="80px" height="24px" />
          <Skeleton width="120px" height="20px" />
        </div>
        <Skeleton width="60%" height="32px" />
        <Skeleton width="40%" height="20px" />
      </div>
      
      {/* Metadata skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton width="80px" height="16px" />
            <Skeleton width="100%" height="20px" />
          </div>
        ))}
      </div>
      
      {/* Content skeleton */}
      <div className="space-y-4">
        <Skeleton width="30%" height="24px" />
        <div className="space-y-2">
          <Skeleton width="100%" height="16px" />
          <Skeleton width="100%" height="16px" />
          <Skeleton width="80%" height="16px" />
        </div>
      </div>
      
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center space-y-2">
            <Skeleton width="100%" height="32px" />
            <Skeleton width="80%" height="16px" className="mx-auto" />
          </div>
        ))}
      </div>
      
      {/* Related items skeleton */}
      <div className="space-y-4">
        <Skeleton width="25%" height="24px" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-3 p-3 border rounded">
              <Skeleton width="48px" height="48px" className="rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton width="70%" height="18px" />
                <Skeleton width="50%" height="14px" />
                <Skeleton width="30%" height="12px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CompactEntitySkeleton() {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-start space-x-3">
        <Skeleton width="40px" height="40px" className="rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton width="70%" height="18px" />
          <Skeleton width="50%" height="14px" />
          <div className="flex space-x-4">
            <Skeleton width="60px" height="12px" />
            <Skeleton width="80px" height="12px" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }, (_, i) => (
        <td key={i} className="p-3">
          <Skeleton width="100%" height="16px" />
        </td>
      ))}
    </tr>
  );
}

export default EntityLoading;