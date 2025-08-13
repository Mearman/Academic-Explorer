'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { parseEntityIdentifier, resolveEntityFromId } from '@/lib/openalex/utils/entity-detection';
import Link from 'next/link';

/**
 * Custom 404 page that acts as SPA fallback for dynamic routes
 * This handles client-side routing for entity IDs like /W1234, /doi/10.1234, etc.
 */
export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      const segments = pathname.split('/').filter(Boolean);
      
      if (segments.length === 1) {
        // Handle direct entity IDs like /W1234567890
        const entityId = segments[0];
        
        try {
          const result = parseEntityIdentifier(entityId);
          
          if (result && result.type) {
            const pluralType = `${result.type}s`;
            router.replace(`/${pluralType}/${result.id}`);
            return;
          }
        } catch {
          // Continue to show 404 if parsing fails
        }
      }
      
      if (segments.length >= 2) {
        // Handle external IDs like /doi/10.1234/example
        try {
          const [prefix, ...idParts] = segments;
          const fullId = idParts.join('/');
          const resolution = resolveEntityFromId(`${prefix}:${fullId}`);
          
          if (resolution && resolution.entityType && resolution.openAlexId) {
            const pluralType = `${resolution.entityType}s`;
            router.replace(`/${pluralType}/${resolution.openAlexId}`);
            return;
          }
        } catch {
          // Continue to show 404 if resolution fails
        }
      }
    }
  }, [pathname, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or the entity ID may be invalid.
        </p>
        
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </Link>
          
          <button
            onClick={() => router.back()}
            className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
          >
            Go Back
          </button>
        </div>
        
        <div className="mt-6 text-xs text-gray-500">
          <p>Looking for an entity? Try formats like:</p>
          <p className="font-mono">W123456789, A123456789, doi:10.1234/example</p>
        </div>
      </div>
    </div>
  );
}