import { Box, Text, Group, Stack } from '@mantine/core';
import { useState } from 'react';

import { EnhancedLoadingSkeleton, EnhancedSkeletonGroup, ProgressAwareSkeleton } from './enhanced-loading-skeleton';
import { AccessibleLoadingState, useAccessibleLoading } from './accessible-loading-state';
import { MobileResponsiveWrapper, TouchOptimizedButton, useResponsiveBreakpoint } from './mobile-responsive-wrapper';
import { FocusManagement } from './focus-management';
import { VisualFeedback, FeedbackButton, ProgressFeedback, MicroInteraction } from './visual-feedback';

/**
 * Enhanced UI Showcase Component
 * Demonstrates integration of all enhanced UI/UX patterns
 */
export const EnhancedUIShowcase = () => {
  const [currentDemo, setCurrentDemo] = useState<'loading' | 'accessibility' | 'mobile' | 'focus' | 'feedback'>('loading');
  const [progress, setProgress] = useState(0);
  const { isMobile, isTablet, isDesktop } = useResponsiveBreakpoint();
  const loadingManager = useAccessibleLoading();

  // Demo functions
  const simulateLoading = () => {
    loadingManager.startLoading('Simulating data fetch...');
    let currentProgress = 0;
    
    const interval = setInterval(() => {
      currentProgress += 10;
      loadingManager.updateProgress(currentProgress);
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        loadingManager.stopLoading('Data loaded successfully');
        setTimeout(() => setProgress(0), 2000);
      }
    }, 200);
  };

  const simulateError = () => {
    loadingManager.setLoadingError('Network connection failed. Please try again.');
  };

  const LoadingDemo = () => (
    <Stack gap="lg">
      <Text size="lg" fw={600}>Enhanced Loading States</Text>
      
      <Group justify="space-between" wrap="wrap">
        <FeedbackButton
          variant="primary"
          onClick={simulateLoading}
          isLoading={loadingManager.isLoading}
          disabled={loadingManager.isLoading}
        >
          Start Loading Demo
        </FeedbackButton>
        
        <FeedbackButton
          variant="secondary"
          onClick={simulateError}
          disabled={loadingManager.isLoading}
        >
          Simulate Error
        </FeedbackButton>
        
        <FeedbackButton
          variant="ghost"
          onClick={loadingManager.retry}
          disabled={!loadingManager.error}
        >
          Retry
        </FeedbackButton>
      </Group>

      {progress > 0 && progress < 100 && (
        <ProgressFeedback
          progress={progress}
          message="Loading academic data"
          variant="default"
          animated
        />
      )}

      <AccessibleLoadingState
        isLoading={loadingManager.isLoading}
        error={loadingManager.error}
        onRetry={loadingManager.retry}
        skeletonType="list"
        skeletonLines={3}
        announceStateChanges
        verboseAnnouncements
      >
        <Stack gap="md">
          <Text>✅ Content loaded successfully!</Text>
          <Text size="sm" c="dimmed">
            This content appears after loading completes.
          </Text>
        </Stack>
      </AccessibleLoadingState>

      <Box>
        <Text size="md" fw={500} mb="sm">Progress-Aware Skeleton</Text>
        <ProgressAwareSkeleton
          phases={[
            { label: 'Connecting to API', duration: 1000 },
            { label: 'Fetching data', duration: 1500 },
            { label: 'Processing results', duration: 800 },
          ]}
          preset="card"
          onComplete={() => console.log('Loading complete!')}
        />
      </Box>

      <Box>
        <Text size="md" fw={500} mb="sm">Enhanced Skeleton Group</Text>
        <EnhancedSkeletonGroup
          lines={4}
          withProgress
          staggerAnimation
          loadingPhases={[
            { label: 'Loading titles', duration: 800 },
            { label: 'Loading content', duration: 1200 },
            { label: 'Finalizing', duration: 500 },
          ]}
          liveRegion
        />
      </Box>
    </Stack>
  );

  const AccessibilityDemo = () => (
    <FocusManagement
      navigationMode="list"
      enableArrowNavigation
      enableEscapeKey
      provideFocusIndicators
      announceChanges
      onKeyboardNavigation={(direction, event) => {
        console.log(`Navigated: ${direction}`, event);
      }}
    >
      <Stack gap="lg">
        <Text size="lg" fw={600}>Accessibility Features</Text>
        
        <Box>
          <Text size="md" fw={500} mb="sm">
            WCAG 2.1 AA Compliant Components
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Use arrow keys to navigate, Tab to focus, Enter/Space to activate
          </Text>
          
          <Stack gap="sm">
            <VisualFeedback
              enableRipple
              enableHover
              enableFocus
            >
              <button style={{ padding: '12px 24px', border: '1px solid #ccc', borderRadius: '6px' }}>
                Accessible Button 1
              </button>
            </VisualFeedback>
            
            <VisualFeedback
              enableRipple
              enableHover
              enableFocus
            >
              <button style={{ padding: '12px 24px', border: '1px solid #ccc', borderRadius: '6px' }}>
                Accessible Button 2
              </button>
            </VisualFeedback>
            
            <VisualFeedback
              enableRipple
              enableHover
              enableFocus
            >
              <button style={{ padding: '12px 24px', border: '1px solid #ccc', borderRadius: '6px' }}>
                Accessible Button 3
              </button>
            </VisualFeedback>
          </Stack>
        </Box>

        <Box>
          <Text size="md" fw={500} mb="sm">Screen Reader Support</Text>
          <Text size="sm" c="dimmed">
            All components include proper ARIA labels, live regions, and semantic markup
          </Text>
        </Box>

        <Box>
          <Text size="md" fw={500} mb="sm">Reduced Motion Support</Text>
          <Text size="sm" c="dimmed">
            Respects prefers-reduced-motion: reduce setting
          </Text>
        </Box>
      </Stack>
    </FocusManagement>
  );

  const MobileDemo = () => (
    <MobileResponsiveWrapper
      enableTouchGestures
      optimizeForTouch
      touchFeedback
      adaptToOrientation
      adaptToSafeArea
    >
      <Stack gap="lg">
        <Text size="lg" fw={600}>Mobile Responsiveness</Text>
        
        <Box>
          <Text size="md" fw={500} mb="sm">
            Current Breakpoint: {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
          </Text>
          <Text size="sm" c="dimmed">
            Resize window to see responsive behavior
          </Text>
        </Box>

        <Group gap="sm" wrap="wrap">
          <TouchOptimizedButton
            variant="primary"
            size="medium"
            onClick={() => console.log('Touch optimized click!')}
          >
            Touch Button
          </TouchOptimizedButton>
          
          <TouchOptimizedButton
            variant="secondary"
            size="large"
            onClick={() => console.log('Large touch target!')}
          >
            Large Target
          </TouchOptimizedButton>
        </Group>

        <Box>
          <Text size="md" fw={500} mb="sm">Touch Gestures</Text>
          <Text size="sm" c="dimmed">
            Tap, swipe, and pinch gestures are optimized for mobile devices
          </Text>
        </Box>

        <Box>
          <Text size="md" fw={500} mb="sm">Safe Area Support</Text>
          <Text size="sm" c="dimmed">
            Adapts to device notches and safe areas (iPhone X+)
          </Text>
        </Box>
      </Stack>
    </MobileResponsiveWrapper>
  );

  const FocusDemo = () => (
    <FocusManagement
      navigationMode="grid"
      gridColumns={3}
      enableArrowNavigation
      trapFocus
      autoFocus
      provideFocusIndicators
      onFocusEnter={(element) => {
        console.log('Focus entered:', element);
      }}
    >
      <Stack gap="lg">
        <Text size="lg" fw={600}>Focus Management</Text>
        
        <Box>
          <Text size="md" fw={500} mb="sm">Grid Navigation</Text>
          <Text size="sm" c="dimmed" mb="md">
            Use arrow keys to navigate in a grid pattern
          </Text>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '12px' 
          }}>
            {Array.from({ length: 9 }, (_, i) => (
              <VisualFeedback key={i} enableFocus enableHover>
                <button style={{ 
                  padding: '20px', 
                  border: '1px solid #ccc', 
                  borderRadius: '6px',
                  width: '100%'
                }}>
                  Item {i + 1}
                </button>
              </VisualFeedback>
            ))}
          </div>
        </Box>

        <Box>
          <Text size="md" fw={500} mb="sm">Focus Trapping</Text>
          <Text size="sm" c="dimmed">
            Focus is trapped within this component
          </Text>
        </Box>
      </Stack>
    </FocusManagement>
  );

  const FeedbackDemo = () => {
    const [buttonState, setButtonState] = useState<'default' | 'loading' | 'success' | 'error'>('default');

    const handleButtonClick = async () => {
      setButtonState('loading');
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Random success/error
      const success = Math.random() > 0.3;
      setButtonState(success ? 'success' : 'error');
      
      // Reset after 2 seconds
      setTimeout(() => setButtonState('default'), 2000);
    };

    return (
      <Stack gap="lg">
        <Text size="lg" fw={600}>Visual Feedback</Text>
        
        <Group gap="sm" wrap="wrap">
          <FeedbackButton
            variant="primary"
            isLoading={buttonState === 'loading'}
            isSuccess={buttonState === 'success'}
            isError={buttonState === 'error'}
            onClick={handleButtonClick}
            successMessage="Operation completed successfully!"
            errorMessage="Something went wrong. Please try again."
            loadingMessage="Processing your request..."
          >
            Interactive Button
          </FeedbackButton>
        </Group>

        <Box>
          <Text size="md" fw={500} mb="sm">Micro-interactions</Text>
          <Group gap="md">
            <MicroInteraction trigger="hover" animation="bounce">
              <span style={{ 
                display: 'inline-block', 
                padding: '8px 16px', 
                backgroundColor: '#f0f0f0', 
                borderRadius: '4px' 
              }}>
                Hover me
              </span>
            </MicroInteraction>
            
            <MicroInteraction trigger="click" animation="shake">
              <span style={{ 
                display: 'inline-block', 
                padding: '8px 16px', 
                backgroundColor: '#f0f0f0', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}>
                Click me
              </span>
            </MicroInteraction>
            
            <MicroInteraction trigger="focus" animation="glow">
              <button style={{ 
                padding: '8px 16px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                backgroundColor: '#f9f9f9'
              }}>
                Focus me
              </button>
            </MicroInteraction>
          </Group>
        </Box>

        <Box>
          <Text size="md" fw={500} mb="sm">Ripple Effects</Text>
          <Text size="sm" c="dimmed">
            Click anywhere in the feedback containers to see ripple effects
          </Text>
        </Box>
      </Stack>
    );
  };

  return (
    <Box p="xl" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Text size="xl" fw={700} mb="xl" ta="center">
        Enhanced UI/UX Component Showcase
      </Text>
      
      <Group justify="center" mb="xl" wrap="wrap">
        <button
          onClick={() => setCurrentDemo('loading')}
          style={{
            padding: '8px 16px',
            backgroundColor: currentDemo === 'loading' ? '#228be6' : '#f8f9fa',
            color: currentDemo === 'loading' ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Loading States
        </button>
        
        <button
          onClick={() => setCurrentDemo('accessibility')}
          style={{
            padding: '8px 16px',
            backgroundColor: currentDemo === 'accessibility' ? '#228be6' : '#f8f9fa',
            color: currentDemo === 'accessibility' ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Accessibility
        </button>
        
        <button
          onClick={() => setCurrentDemo('mobile')}
          style={{
            padding: '8px 16px',
            backgroundColor: currentDemo === 'mobile' ? '#228be6' : '#f8f9fa',
            color: currentDemo === 'mobile' ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Mobile
        </button>
        
        <button
          onClick={() => setCurrentDemo('focus')}
          style={{
            padding: '8px 16px',
            backgroundColor: currentDemo === 'focus' ? '#228be6' : '#f8f9fa',
            color: currentDemo === 'focus' ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Focus Management
        </button>
        
        <button
          onClick={() => setCurrentDemo('feedback')}
          style={{
            padding: '8px 16px',
            backgroundColor: currentDemo === 'feedback' ? '#228be6' : '#f8f9fa',
            color: currentDemo === 'feedback' ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Visual Feedback
        </button>
      </Group>

      <Box
        style={{
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '24px',
          backgroundColor: '#ffffff',
        }}
      >
        {currentDemo === 'loading' && <LoadingDemo />}
        {currentDemo === 'accessibility' && <AccessibilityDemo />}
        {currentDemo === 'mobile' && <MobileDemo />}
        {currentDemo === 'focus' && <FocusDemo />}
        {currentDemo === 'feedback' && <FeedbackDemo />}
      </Box>

      <Box mt="xl" p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
        <Text size="sm" fw={500} mb="xs">Features Demonstrated:</Text>
        <Text size="xs" c="dimmed">
          • WCAG 2.1 AA accessibility compliance • Mobile-responsive design • Touch interactions
          • Progressive enhancement • Reduced motion support • Screen reader compatibility
          • Keyboard navigation • Focus management • Visual feedback • Performance optimization
          • GPU-accelerated animations • Cross-browser compatibility
        </Text>
      </Box>
    </Box>
  );
};