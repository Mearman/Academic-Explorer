/**
 * Component tests for ErrorMessage atom
 * Tests React component rendering and behavior in isolation
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import type { IconProps, SizeVariant } from '../types';

import { 
  ErrorMessage,
  ErrorAlert,
  WarningAlert,
  InfoAlert,
  SuccessAlert
} from './error-message';

type SeverityType = 'error' | 'warning' | 'info' | 'success';

// Mock Icon component to avoid CSS/style dependencies
vi.mock('./icon', () => ({
  Icon: ({ name, 'aria-hidden': ariaHidden, ...props }: IconProps & { 'aria-hidden'?: boolean }) => (
    <span data-testid="mock-icon" data-icon={name} aria-hidden={ariaHidden} {...props}>
      {name}
    </span>
  ),
}));

// Mock utility functions to focus on component behavior
vi.mock('./utils/error-render-utils', () => ({
  renderTitle: (config: { title?: string; compact?: boolean }) => 
    config.title ? <div data-testid="error-title" className={config.compact ? 'compact' : ''}>{config.title}</div> : null,
  renderDetails: (config: { details?: string; compact?: boolean }) => 
    config.details ? <div data-testid="error-details" className={config.compact ? 'compact' : ''}>{config.details}</div> : null,
  renderActions: (config: { actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary' }>; compact?: boolean }) => 
    config.actions ? (
      <div data-testid="error-actions" className={config.compact ? 'compact' : ''}>
        {config.actions.map((action, index) => (
            <button 
              key={index} 
              onClick={action.onClick}
              data-testid={`action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={action.variant || 'primary'}
            >
              {action.label}
            </button>
          ))}
      </div>
    ) : null,
  renderDismissButton: (config: { dismissible?: boolean; onDismiss?: () => void }) => 
    config.dismissible ? (
      <button 
        data-testid="dismiss-button" 
        onClick={config.onDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    ) : null,
}));

vi.mock('./utils/error-utils', () => ({
  SEVERITY_ICONS: {
    error: 'alert-circle',
    warning: 'alert-triangle',
    info: 'info',
    success: 'check-circle',
  },
  mapSizeToVariant: (size: string) => size as SizeVariant,
  getAriaAttributes: (severity: string) => ({
    role: severity === 'error' ? 'alert' : 'status',
    ariaLive: severity === 'error' ? 'assertive' : 'polite',
  }),
}));

describe('ErrorMessage Basic Rendering', () => {
  it('should render with required message prop', () => {
    render(<ErrorMessage message="Test error message" data-testid="error-message" />);
    
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    render(<ErrorMessage message="Test" className="custom-error" data-testid="error-message" />);
    
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toHaveClass('custom-error');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ErrorMessage message="Test" ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('should render with default severity (error)', () => {
    render(<ErrorMessage message="Test error" data-testid="error-message" />);
    
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toHaveAttribute('data-icon', 'alert-circle');
  });
});

describe('ErrorMessage Severity Variants', () => {
  const severities: SeverityType[] = ['error', 'warning', 'info', 'success'];
  const expectedIcons = {
    error: 'alert-circle',
    warning: 'alert-triangle',
    info: 'info',
    success: 'check-circle',
  };

  severities.forEach(severity => {
    it(`should render with ${severity} severity`, () => {
      render(<ErrorMessage severity={severity} message="Test message" data-testid="error-message" />);
      
      const errorMessage = screen.getByTestId('error-message');
      const icon = screen.getByTestId('mock-icon');
      
      expect(errorMessage).toBeInTheDocument();
      expect(icon).toHaveAttribute('data-icon', expectedIcons[severity]);
    });
  });
});

describe('ErrorMessage Size Variants', () => {
  const sizes = ['sm', 'md', 'lg'] as const;

  sizes.forEach(size => {
    it(`should render with ${size} size`, () => {
      render(<ErrorMessage message="Test" size={size} data-testid="error-message" />);
      
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toBeInTheDocument();
    });
  });
});

describe('ErrorMessage Optional Content', () => {
  it('should render with title', () => {
    render(<ErrorMessage message="Test" title="Error Title" data-testid="error-message" />);
    
    expect(screen.getByTestId('error-title')).toBeInTheDocument();
    expect(screen.getByText('Error Title')).toBeInTheDocument();
  });

  it('should render with details', () => {
    render(<ErrorMessage message="Test" details="Error details here" data-testid="error-message" />);
    
    expect(screen.getByTestId('error-details')).toBeInTheDocument();
    expect(screen.getByText('Error details here')).toBeInTheDocument();
  });

  it('should render with both title and details', () => {
    render(<ErrorMessage message="Test" title="Title" details="Details" data-testid="error-message" />);
    
    expect(screen.getByTestId('error-title')).toBeInTheDocument();
    expect(screen.getByTestId('error-details')).toBeInTheDocument();
  });

  it('should pass compact flag to title and details', () => {
    render(<ErrorMessage message="Test" title="Title" details="Details" compact data-testid="error-message" />);
    
    const title = screen.getByTestId('error-title');
    const details = screen.getByTestId('error-details');
    
    expect(title).toHaveClass('compact');
    expect(details).toHaveClass('compact');
  });
});

describe('ErrorMessage Actions', () => {
  it('should render actions when provided', () => {
    const actions = [
      { label: 'Retry', onClick: vi.fn() },
      { label: 'Cancel', onClick: vi.fn(), variant: 'secondary' as const },
    ];

    render(<ErrorMessage message="Test" actions={actions} data-testid="error-message" />);
    
    expect(screen.getByTestId('error-actions')).toBeInTheDocument();
    expect(screen.getByTestId('action-retry')).toBeInTheDocument();
    expect(screen.getByTestId('action-cancel')).toBeInTheDocument();
  });

  it('should call action onClick when clicked', async () => {
    const user = userEvent.setup();
    const mockRetry = vi.fn();
    const actions = [{ label: 'Retry', onClick: mockRetry }];

    render(<ErrorMessage message="Test" actions={actions} data-testid="error-message" />);
    
    const retryButton = screen.getByTestId('action-retry');
    await user.click(retryButton);
    
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('should apply correct variant classes to action buttons', () => {
    const actions = [
      { label: 'Primary', onClick: vi.fn(), variant: 'primary' as const },
      { label: 'Secondary', onClick: vi.fn(), variant: 'secondary' as const },
    ];

    render(<ErrorMessage message="Test" actions={actions} data-testid="error-message" />);
    
    expect(screen.getByTestId('action-primary')).toHaveClass('primary');
    expect(screen.getByTestId('action-secondary')).toHaveClass('secondary');
  });

  it('should pass compact flag to actions', () => {
    const actions = [{ label: 'Test', onClick: vi.fn() }];
    render(<ErrorMessage message="Test" actions={actions} compact data-testid="error-message" />);
    
    const actionsContainer = screen.getByTestId('error-actions');
    expect(actionsContainer).toHaveClass('compact');
  });
});

describe('ErrorMessage Dismissible Functionality', () => {
  it('should render dismiss button when dismissible is true', () => {
    render(<ErrorMessage message="Test" dismissible data-testid="error-message" />);
    
    expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
  });

  it('should not render dismiss button when dismissible is false', () => {
    render(<ErrorMessage message="Test" dismissible={false} data-testid="error-message" />);
    
    expect(screen.queryByTestId('dismiss-button')).not.toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    const mockDismiss = vi.fn();

    render(<ErrorMessage message="Test" dismissible onDismiss={mockDismiss} data-testid="error-message" />);
    
    const dismissButton = screen.getByTestId('dismiss-button');
    await user.click(dismissButton);
    
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('should have correct accessibility attributes on dismiss button', () => {
    render(<ErrorMessage message="Test" dismissible data-testid="error-message" />);
    
    const dismissButton = screen.getByTestId('dismiss-button');
    expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss');
  });
});

describe('ErrorMessage Layout Modifiers', () => {
  it('should render in compact mode', () => {
    render(<ErrorMessage message="Test" compact data-testid="error-message" />);
    
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toBeInTheDocument();
  });

  it('should render in full mode by default', () => {
    render(<ErrorMessage message="Test" data-testid="error-message" />);
    
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toBeInTheDocument();
  });
});

describe('ErrorMessage Accessibility', () => {
  it('should have correct role for error severity', () => {
    render(<ErrorMessage severity="error" message="Test" data-testid="error-message" />);
    
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toHaveAttribute('role', 'alert');
  });

  it('should have correct role for non-error severity', () => {
    render(<ErrorMessage severity="info" message="Test" data-testid="error-message" />);
    
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toHaveAttribute('role', 'status');
  });

  it('should have correct aria-live attribute', () => {
    render(<ErrorMessage severity="error" message="Test" data-testid="error-message" />);
    
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
  });
});

describe('ErrorMessage Event Handling', () => {
  it('should forward custom props', () => {
    render(<ErrorMessage message="Test" id="custom-id" title="Custom title" data-testid="error-message" />);
    
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toHaveAttribute('id', 'custom-id');
    expect(errorMessage).toHaveAttribute('title', 'Custom title');
  });
});

describe('ErrorAlert Component', () => {
  it('should render with error severity', () => {
    render(<ErrorAlert message="Error message" data-testid="error-alert" />);
    
    const alert = screen.getByTestId('error-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('role', 'alert');
    expect(screen.getByTestId('mock-icon')).toHaveAttribute('data-icon', 'alert-circle');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ErrorAlert message="Test" ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('WarningAlert Component', () => {
  it('should render with warning severity', () => {
    render(<WarningAlert message="Warning message" data-testid="warning-alert" />);
    
    const alert = screen.getByTestId('warning-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('mock-icon')).toHaveAttribute('data-icon', 'alert-triangle');
  });
});

describe('InfoAlert Component', () => {
  it('should render with info severity', () => {
    render(<InfoAlert message="Info message" data-testid="info-alert" />);
    
    const alert = screen.getByTestId('info-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('mock-icon')).toHaveAttribute('data-icon', 'info');
  });
});

describe('SuccessAlert Component', () => {
  it('should render with success severity', () => {
    render(<SuccessAlert message="Success message" data-testid="success-alert" />);
    
    const alert = screen.getByTestId('success-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('mock-icon')).toHaveAttribute('data-icon', 'check-circle');
  });
});

describe('Alert Components Props Inheritance', () => {
  it('should inherit all ErrorMessage props', () => {
    const mockDismiss = vi.fn();
    render(
      <ErrorAlert 
        message="Test" 
        title="Alert Title"
        details="Alert details"
        dismissible
        onDismiss={mockDismiss}
        compact
        data-testid="error-alert"
      />
    );
    
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByTestId('error-title')).toBeInTheDocument();
    expect(screen.getByTestId('error-details')).toBeInTheDocument();
    expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
  });
});

describe('ErrorMessage Complex Scenarios', () => {
  it('should render with all props combined', () => {
    const mockAction = vi.fn();
    const mockDismiss = vi.fn();
    const actions = [{ label: 'Action', onClick: mockAction }];

    render(
      <ErrorMessage
        severity="warning"
        message="Complex error message"
        title="Error occurred"
        details="Detailed error information"
        actions={actions}
        dismissible
        onDismiss={mockDismiss}
        size="lg"
        compact
        className="custom-error"
        data-testid="complex-error"
      />
    );

    const errorMessage = screen.getByTestId('complex-error');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveClass('custom-error');
    expect(screen.getByText('Complex error message')).toBeInTheDocument();
    expect(screen.getByTestId('error-title')).toBeInTheDocument();
    expect(screen.getByTestId('error-details')).toBeInTheDocument();
    expect(screen.getByTestId('error-actions')).toBeInTheDocument();
    expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toHaveAttribute('data-icon', 'alert-triangle');
  });

  it('should handle empty actions array', () => {
    render(<ErrorMessage message="Test" actions={[]} data-testid="error-message" />);
    
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.queryByTestId('error-actions')).not.toBeInTheDocument();
  });
});

describe('ErrorMessage Error Handling', () => {
  it('should handle undefined severity gracefully', () => {
    expect(() => {
      render(<ErrorMessage severity={undefined as unknown as SeverityType} message="Test" />);
    }).not.toThrow();
  });

  it('should handle invalid severity gracefully', () => {
    expect(() => {
      render(<ErrorMessage severity={'invalid' as SeverityType} message="Test" />);
    }).not.toThrow();
  });

  it('should handle undefined message gracefully', () => {
    expect(() => {
      render(<ErrorMessage message={undefined as unknown as string} />);
    }).not.toThrow();
  });
});