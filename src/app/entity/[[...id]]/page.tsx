import { Suspense } from 'react';
import CatchAllClient from './client-page';

/**
 * Universal catch-all route for handling all entity patterns
 * This route catches any URL that doesn't match explicit routes
 * and attempts to resolve it as an OpenAlex entity
 * 
 * Examples:
 * - /W123456 → Work entity
 * - /A123456 → Author entity
 * - /10.1234/example → DOI resolution
 * - /0000-0002-1825-0097 → ORCID resolution
 */

export async function generateStaticParams() {
  // Return empty array since we can't pre-generate all possible entity combinations
  // This allows the route to work with static export but pages will be generated on demand
  return [];
}

export default function CatchAllPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CatchAllClient />
    </Suspense>
  );
}