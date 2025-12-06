/**
 * PostHog Analytics Provider for BibGraph
 *
 * Integrates official @posthog/react provider with custom privacy-compliant configuration
 * Uses EU hosting, cookieless mode, and GDPR-compliant settings
 */

import { PostHogProvider as PostHogReactProvider } from '@posthog/react'
import React, { ReactNode } from 'react'

import { logger } from '@bibgraph/utils'
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
 * @param children - React components that will have access to PostHog analytics
 * @param children.children
 */
export const PostHogProvider = ({ children }: { children: ReactNode }) => {
  // Only initialize PostHog if enabled and configured
  if (!POSTHOG_ENABLED || !shouldInitializePostHog()) {
    if (import.meta.env.DEV) {
      logger.info('analytics', 'PostHog analytics disabled - missing API key or invalid configuration', {}, 'PostHogProvider')
    }
    return <>{children}</>
  }

  try {
    return (
      <PostHogReactProvider
        apiKey={POSTHOG_API_KEY}
        options={POSTHOG_CONFIG}
      >
        {children}
      </PostHogReactProvider>
    )
  } catch (error) {
    // Log PostHog initialization error but don't break the app
    logger.error('analytics', 'PostHog initialization failed', { error }, 'PostHogProvider')
    if (import.meta.env.DEV) {
      logger.warn('analytics', 'PostHog analytics disabled due to initialization error', {}, 'PostHogProvider')
    }
    return <>{children}</>
  }
};

// Re-export the official usePostHog hook for convenience

// Re-export PostHogErrorBoundary from @posthog/react

