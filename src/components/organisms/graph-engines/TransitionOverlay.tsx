import React, { useEffect, useState } from 'react';

import type { GraphEngineType, GraphEngineTransitionOptions } from './provider';
import {
  transitionOverlay,
  transitionContent,
  transitionTitle,
  transitionDescription,
  progressContainer,
  progressBar,
  transitionDurationVar,
  transitionProgressVar,
  accessibleTransition,
  responsiveTransitionContent,
  darkModeOverrides,
  lightModeOverrides,
} from './transitions.css';

// ============================================================================
// Component Props
// ============================================================================

export interface TransitionOverlayProps {
  /** Whether the transition is currently active */
  isTransitioning: boolean;
  
  /** Current transition progress (0-100) */
  progress: number;
  
  /** Source engine being transitioned from */
  fromEngine: GraphEngineType;
  
  /** Target engine being transitioned to */
  toEngine: GraphEngineType;
  
  /** Transition options */
  options: GraphEngineTransitionOptions;
  
  /** Engine display names for better UX */
  engineDisplayNames: Record<GraphEngineType, string>;
  
  /** Callback when transition animation completes */
  onTransitionComplete?: () => void;
  
  /** Whether to show detailed progress information */
  showDetails?: boolean;
  
  /** Custom transition message */
  customMessage?: string;
}

// ============================================================================
// Engine Display Names
// ============================================================================

const DEFAULT_ENGINE_DISPLAY_NAMES: Record<GraphEngineType, string> = {
  'canvas-2d': 'Canvas 2D',
  'svg': 'SVG Renderer',
  'webgl': 'WebGL Accelerated',
  'd3-force': 'D3 Force Simulation',
  'cytoscape': 'Cytoscape.js',
  'vis-network': 'vis-network',
};

// ============================================================================
// Transition Messages
// ============================================================================

const getTransitionMessage = (
  fromEngine: GraphEngineType,
  toEngine: GraphEngineType,
  progress: number,
  customMessage?: string
): { title: string; description: string } => {
  if (customMessage) {
    return {
      title: customMessage,
      description: `Switching from ${DEFAULT_ENGINE_DISPLAY_NAMES[fromEngine]} to ${DEFAULT_ENGINE_DISPLAY_NAMES[toEngine]}`,
    };
  }
  
  if (progress < 25) {
    return {
      title: 'Preparing transition...',
      description: `Initialising ${DEFAULT_ENGINE_DISPLAY_NAMES[toEngine]} engine`,
    };
  }
  
  if (progress < 50) {
    return {
      title: 'Loading engine...',
      description: `Setting up ${DEFAULT_ENGINE_DISPLAY_NAMES[toEngine]} renderer`,
    };
  }
  
  if (progress < 75) {
    return {
      title: 'Transferring data...',
      description: 'Preserving graph state and settings',
    };
  }
  
  if (progress < 90) {
    return {
      title: 'Applying settings...',
      description: 'Configuring layout and visual preferences',
    };
  }
  
  return {
    title: 'Finalising...',
    description: `Almost ready with ${DEFAULT_ENGINE_DISPLAY_NAMES[toEngine]}`,
  };
};

// ============================================================================
// Component Implementation
// ============================================================================

export function TransitionOverlay({
  isTransitioning,
  progress,
  fromEngine,
  toEngine,
  options,
  engineDisplayNames = DEFAULT_ENGINE_DISPLAY_NAMES,
  onTransitionComplete,
  showDetails = true,
  customMessage,
}: TransitionOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'fade-in' | 'progress' | 'fade-out'>('fade-in');
  
  // Handle transition visibility
  useEffect(() => {
    if (isTransitioning) {
      setIsVisible(true);
      setAnimationPhase('fade-in');
      
      // Small delay before showing progress to allow for fade-in
      const fadeInTimer = setTimeout(() => {
        setAnimationPhase('progress');
      }, 150);
      
      return () => clearTimeout(fadeInTimer);
    } else if (isVisible) {
      // Start fade-out animation
      setAnimationPhase('fade-out');
      
      // Hide overlay after fade-out completes
      const fadeOutTimer = setTimeout(() => {
        setIsVisible(false);
        onTransitionComplete?.();
      }, 300);
      
      return () => clearTimeout(fadeOutTimer);
    }
  }, [isTransitioning, isVisible, onTransitionComplete]);
  
  // Don't render if not visible
  if (!isVisible) {
    return null;
  }
  
  const duration = options.duration || 500;
  const { title, description } = getTransitionMessage(fromEngine, toEngine, progress, customMessage);
  
  // Determine opacity based on animation phase
  const overlayOpacity = animationPhase === 'fade-out' ? 0 : 1;
  const contentOpacity = animationPhase === 'fade-in' ? 0 : animationPhase === 'fade-out' ? 0 : 1;
  
  return (
    <div
      className={`${transitionOverlay} ${accessibleTransition}`}
      style={{
        opacity: overlayOpacity,
        transition: 'opacity 0.3s ease-in-out',
      }}
      role="dialog"
      aria-live="polite"
      aria-busy="true"
      aria-label="Graph engine transition in progress"
    >
      <div
        className={`${transitionContent} ${responsiveTransitionContent} ${darkModeOverrides} ${lightModeOverrides}`}
        style={{
          opacity: contentOpacity,
          transition: 'opacity 0.2s ease-in-out',
          transform: animationPhase === 'fade-in' 
            ? 'translateY(-10px) scale(0.95)' 
            : animationPhase === 'fade-out' 
            ? 'translateY(10px) scale(0.95)' 
            : 'translateY(0) scale(1)',
        }}
      >
        {/* Transition Title */}
        <h3 className={transitionTitle}>
          {title}
        </h3>
        
        {/* Progress Bar */}
        <div className={progressContainer} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div 
            className={progressBar}
            style={{
              width: `${progress}%`,
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>
        
        {/* Progress Percentage */}
        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: '500' }}>
          {Math.round(progress)}%
        </div>
        
        {/* Transition Description */}
        {showDetails && (
          <p className={transitionDescription}>
            {description}
          </p>
        )}
        
        {/* Engine Information */}
        {showDetails && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--color-subtle)',
            textAlign: 'center',
            lineHeight: 1.4,
          }}>
            <div>
              <strong>{engineDisplayNames[fromEngine]}</strong> → <strong>{engineDisplayNames[toEngine]}</strong>
            </div>
            {options.preservePositions && (
              <div style={{ marginTop: '4px' }}>
                ✓ Preserving vertex positions
              </div>
            )}
            {options.preserveSelection && (
              <div style={{ marginTop: '2px' }}>
                ✓ Preserving selection state  
              </div>
            )}
            {options.preserveViewport && (
              <div style={{ marginTop: '2px' }}>
                ✓ Preserving zoom and pan
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Reduced Motion Variant
// ============================================================================

export function ReducedMotionTransitionOverlay({
  isTransitioning,
  fromEngine,
  toEngine,
  engineDisplayNames = DEFAULT_ENGINE_DISPLAY_NAMES,
}: {
  isTransitioning: boolean;
  fromEngine: GraphEngineType;
  toEngine: GraphEngineType;
  engineDisplayNames?: Record<GraphEngineType, string>;
}) {
  if (!isTransitioning) {
    return null;
  }
  
  return (
    <div
      className={transitionOverlay}
      role="dialog"
      aria-live="polite"
      aria-label="Graph engine switching"
      style={{
        backgroundColor: 'var(--color-background)',
        backdropFilter: 'none',
      }}
    >
      <div className={`${transitionContent} ${responsiveTransitionContent}`}>
        <h3 className={transitionTitle}>
          Switching Engine
        </h3>
        <p className={transitionDescription}>
          Loading {engineDisplayNames[toEngine]}...
        </p>
        
        {/* Simple loading indicator for reduced motion */}
        <div style={{
          width: '8px',
          height: '8px',
          backgroundColor: 'var(--color-accent)',
          borderRadius: '50%',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
      </div>
    </div>
  );
}

// ============================================================================
// Hook for Managing Transitions
// ============================================================================

export function useTransitionAnimation(
  isTransitioning: boolean,
  options: GraphEngineTransitionOptions
) {
  const [phase, setPhase] = useState<'idle' | 'starting' | 'active' | 'completing' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (isTransitioning && phase === 'idle') {
      setPhase('starting');
      setProgress(0);
      
      // Simulate transition phases
      const duration = options.duration || 500;
      const steps = 20;
      const stepDuration = duration / steps;
      
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        const newProgress = (currentStep / steps) * 100;
        setProgress(newProgress);
        
        if (currentStep === 1) setPhase('active');
        if (currentStep >= steps - 2) setPhase('completing');
        if (currentStep >= steps) {
          setPhase('complete');
          clearInterval(interval);
        }
      }, stepDuration);
      
      return () => clearInterval(interval);
    } else if (!isTransitioning && phase !== 'idle') {
      setPhase('idle');
      setProgress(0);
    }
  }, [isTransitioning, phase, options.duration]);
  
  return { phase, progress };
}