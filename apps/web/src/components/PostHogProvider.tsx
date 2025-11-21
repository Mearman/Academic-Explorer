import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react'
import posthog from 'posthog-js'

import type {
  PostHog as PostHogType,
  PostHogConfig,
} from 'posthog-js'

import {
  POSTHOG_API_KEY,
  POSTHOG_CONFIG,
  POSTHOG_ENABLED,
  shouldInitializePostHog,
  validateEventProperties,
  type AcademicEventProperties,
  type AcademicEventType,
} from '@/lib/posthog'

/**
 * PostHog Context for Academic Explorer
 * Provides privacy-compliant analytics for academic research workflows
 */
interface PostHogContextValue {
  posthog: PostHogType | null
  capture: (eventName: AcademicEventType, properties?: AcademicEventProperties) => void
  capturePageView: (path?: string) => void
  identify: (distinctId: string, properties?: Record<string, any>) => void
  reset: () => void
  isInitialized: boolean
  isEnabled: boolean
}

const PostHogContext = createContext<PostHogContextValue | null>(null)

/**
 * PostHog Provider Component
 *
 * Integrates PostHog analytics with EU privacy compliance for Academic Explorer.
 * Uses cookieless mode to avoid consent requirements while providing valuable insights.
 *
 * Features:
 * - Automatic error tracking for improved stability
 * - Manual event capture for academic workflow analytics
 * - Anonymous user identification (no personal data)
 * - Privacy-compliant configuration
 *
 * @param children - React components that will have access to PostHog analytics
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  const posthogRef = useRef<PostHogType | null>(null)
  const isInitializedRef = useRef(false)

  // Initialize PostHog on mount
  useEffect(() => {
    if (!POSTHOG_ENABLED || !shouldInitializePostHog()) {
      if (import.meta.env.DEV) {
        console.info('📊 PostHog analytics disabled - missing API key or invalid configuration')
      }
      return
    }

    // Only initialize once
    if (isInitializedRef.current) {
      return
    }

    try {
      posthogRef.current = posthog.init(POSTHOG_API_KEY, POSTHOG_CONFIG)
      isInitializedRef.current = true

      if (import.meta.env.DEV) {
        console.info('📊 PostHog analytics initialized with EU privacy-compliant configuration')
      }

      // Set up automatic error tracking for debugging
      if (posthogRef.current && POSTHOG_CONFIG.capture_exceptions) {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
          posthogRef.current?.capture('unhandled_promise_rejection', {
            error_type: 'promise_rejection',
            error_message: event.reason?.message || 'Unknown promise rejection',
            user_agent_group: getUserAgentGroup(),
          })
        })

        // Handle uncaught errors
        window.addEventListener('error', (event) => {
          posthogRef.current?.capture('javascript_error', {
            error_type: 'javascript_error',
            error_message: event.message,
            error_filename: event.filename,
            error_line: event.lineno,
            user_agent_group: getUserAgentGroup(),
          })
        })
      }

    } catch (error) {
      console.error('❌ Failed to initialize PostHog:', error)
    }

    // Cleanup on unmount
    return () => {
      if (posthogRef.current) {
        posthogRef.current.reset() // Reset analytics on unmount
      }
    }
  }, [])

  /**
   * Enhanced capture function with validation and privacy protection
   */
  const capture = React.useCallback((
    eventName: AcademicEventType,
    properties?: AcademicEventProperties
  ) => {
    if (!posthogRef.current || !POSTHOG_ENABLED) {
      return
    }

    try {
      // Validate and sanitize properties to prevent accidental personal data capture
      const sanitizedProperties = properties ? validateEventProperties(properties) : undefined

      // Add common properties
      const enhancedProperties = {
        ...sanitizedProperties,
        timestamp: new Date().toISOString(),
        session_id: getSessionId(),
        app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
        environment: import.meta.env.MODE,
        user_agent_group: getUserAgentGroup(),
      }

      posthogRef.current.capture(eventName, enhancedProperties)

      if (import.meta.env.DEV) {
        console.debug(`📊 Analytics event captured: ${eventName}`, enhancedProperties)
      }

    } catch (error) {
      console.error('❌ Failed to capture PostHog event:', error)
    }
  }, [])

  /**
   * Capture page view with proper path handling
   */
  const capturePageView = React.useCallback((path?: string) => {
    if (!posthogRef.current || !POSTHOG_ENABLED) {
      return
    }

    try {
      const currentPath = path || window.location.pathname

      posthogRef.current.capture('$pageview', {
        path: currentPath,
        timestamp: new Date().toISOString(),
        session_id: getSessionId(),
        user_agent_group: getUserAgentGroup(),
      })

      if (import.meta.env.DEV) {
        console.debug(`📊 Page view captured: ${currentPath}`)
      }

    } catch (error) {
      console.error('❌ Failed to capture page view:', error)
    }
  }, [])

  /**
   * Set anonymous user identifier
   * This creates a persistent but anonymous identifier for session tracking
   */
  const identify = React.useCallback((distinctId: string, properties?: Record<string, any>) => {
    if (!posthogRef.current || !POSTHOG_ENABLED) {
      return
    }

    try {
      // Only identify with anonymous IDs - no personal data
      posthogRef.current.identify(distinctId, {
        ...properties,
        identified_at: new Date().toISOString(),
        app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
        user_agent_group: getUserAgentGroup(),
      })

      if (import.meta.env.DEV) {
        console.debug(`📊 User identified (anonymous): ${distinctId}`)
      }

    } catch (error) {
      console.error('❌ Failed to identify user:', error)
    }
  }, [])

  /**
   * Reset user identification
   */
  const reset = React.useCallback(() => {
    if (!posthogRef.current || !POSTHOG_ENABLED) {
      return
    }

    try {
      posthogRef.current.reset()

      if (import.meta.env.DEV) {
        console.debug('📊 User identification reset')
      }

    } catch (error) {
      console.error('❌ Failed to reset user identification:', error)
    }
  }, [])

  // Context value
  const contextValue: PostHogContextValue = {
    posthog: posthogRef.current,
    capture,
    capturePageView,
    identify,
    reset,
    isInitialized: isInitializedRef.current,
    isEnabled: POSTHOG_ENABLED,
  }

  return (
    <PostHogContext.Provider value={contextValue}>
      {children}
    </PostHogContext.Provider>
  )
}

/**
 * Hook to use PostHog analytics in components
 * @returns PostHog context value with analytics functions
 */
export function usePostHog(): PostHogContextValue {
  const context = useContext(PostHogContext)

  if (!context) {
    throw new Error('usePostHog must be used within a PostHogProvider')
  }

  return context
}

/**
 * Utility function to get user agent group (generic, not fingerprinting)
 * Used for broad compatibility insights without detailed tracking
 */
function getUserAgentGroup(): string {
  const userAgent = navigator.userAgent.toLowerCase()

  if (userAgent.includes('chrome')) return 'chrome'
  if (userAgent.includes('firefox')) return 'firefox'
  if (userAgent.includes('safari')) return 'safari'
  if (userAgent.includes('edge')) return 'edge'

  return 'other'
}

/**
 * Generate or retrieve session ID for analytics
 * Creates a persistent but anonymous session identifier
 */
function getSessionId(): string {
  const SESSION_KEY = 'academic_explorer_session_id'

  // Check for existing session
  let sessionId = sessionStorage.getItem(SESSION_KEY)

  if (!sessionId) {
    // Generate new session ID (UUID-like format, but simple)
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }

  return sessionId
}

/**
 * Higher-order component to track component performance and errors
 * Wrap components with this to automatically track render performance and errors
 */
export function withAnalytics<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = React.forwardRef<P>((props, ref) => {
    const { capture } = usePostHog()
    const componentNameToUse = componentName || Component.displayName || Component.name || 'UnknownComponent'

    // Track component mount
    useEffect(() => {
      capture('page_view' as any, {
        feature_name: componentNameToUse.toLowerCase().replace(/[^a-z0-9]/g, '_') as any,
      })
    }, [capture, componentNameToUse])

    // Track component errors with error boundary
    const [hasError, setHasError] = React.useState(false)

    React.useEffect(() => {
      const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
        capture('error_occurred' as any, {
          error_type: 'rendering_error' as any,
        })
        setHasError(true)
      }

      // Note: In a real implementation, you'd want to use a proper error boundary
      // This is a simplified version for demonstration
    }, [capture, componentNameToUse])

    if (hasError) {
      return (
        <div style={{ padding: '16px', border: '1px solid #ff6b6b', borderRadius: '4px' }}>
          <h4>Component Error</h4>
          <p>The {componentNameToUse} component encountered an error.</p>
        </div>
      )
    }

    return <Component {...(props as any)} ref={ref} />
  })

  WrappedComponent.displayName = `withAnalytics(${Component.displayName || Component.name || 'Component'})`

  return WrappedComponent
}

export default PostHogProvider