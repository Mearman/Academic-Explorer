/**
 * Algorithms route - entry point for graph algorithms page
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

import { LazyRoute } from '@/components/routing/LazyRoute';

const AlgorithmsPage = lazy(() => import('./algorithms.lazy'));

export const Route = createFileRoute('/algorithms')({
  component: () => (
    <LazyRoute>
      <AlgorithmsPage />
    </LazyRoute>
  ),
});
