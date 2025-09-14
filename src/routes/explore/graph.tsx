/**
 * Integrated graph exploration route
 * Uses the MainLayout with full sidebar integration
 */

import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';

export const Route = createFileRoute('/explore/graph')({
  component: GraphExplorer,
});

function GraphExplorer() {
  return <MainLayout />;
}