/**
 * PostHog Analytics Provider for BibGraph
 *
 * Integrates official @posthog/react provider with custom privacy-compliant configuration
 * Uses EU hosting, cookieless mode, and GDPR-compliant settings
 */

import { PostHogProvider as PostHogReactProvider } from '@posthog/react'
import React, { ReactNode } from 'react'

import {
  POSTHOG_API_KEY,
  POSTHOG_CONFIG,
  POSTHOG_ENABLED,
  shouldInitializePostHog,
} from '@/lib/posthog'

/**
 * PostHog Provider Component
 *
 * Wraps the official @posthog/react PostHogProvider with BibGraph's
 * privacy-compliant configuration.
 *
 * Features:
 * - Automatic error tracking via PostHog exception autocapture
 * - EU-hosted PostHog instance for GDPR compliance
 * - Cookieless mode (no consent required)
 * - Manual event capture for academic workflow analytics
 * - Anonymous user identification
 *
 * @param children - React components that will have access to PostHog analytics
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  // Only initialize PostHog if enabled and configured
  if (!POSTHOG_ENABLED || !shouldInitializePostHog()) {
    if (import.meta.env.DEV) {
      console.info('PostHog analytics disabled - missing API key or invalid configuration')
    }
    return <>{children}</>
  }

  return (
    <PostHogReactProvider
      apiKey={POSTHOG_API_KEY}
      options={POSTHOG_CONFIG}
    >
      {children}
    </PostHogReactProvider>
  )
}

// Re-export the official usePostHog hook for convenience

// Re-export PostHogErrorBoundary from @posthog/react

