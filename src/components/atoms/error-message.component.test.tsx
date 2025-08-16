/**
 * Component tests for ErrorMessage atom
 * Tests React component rendering and behavior in isolation
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { 
  ErrorMessage,
  ErrorAlert,
  WarningAlert,
  InfoAlert,
  SuccessAlert
} from './error-message';

// Mock Icon component to avoid CSS/style dependencies
vi.mock('./icon', () => ({
  Icon: ({ name, 'aria-hidden': ariaHidden, ...props }: any) => (
    <span data-testid="mock-icon" data-icon={name} aria-hidden={ariaHidden} {...props}>
      {name}
    </span>
  ),
}));

// Mock utility functions to focus on component behavior
vi.mock('./utils/error-render-utils', () => ({
  renderTitle: (title?: string, compact?: boolean) => 
    title ? <div data-testid="error-title" className={compact ? 'compact' : ''}>{title}</div> : null,
  renderDetails: (details?: string, compact?: boolean) => 
    details ? <div data-testid="error-details" className={compact ? 'compact' : ''}>{details}</div> : null,
  renderActions: (actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary' }>, compact?: boolean) => 
    actions ? (
      <div data-testid="error-actions" className={compact ? 'compact' : ''}>
        {actions.map((action, index) => (
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
  renderDismissButton: (dismissible?: boolean, onDismiss?: () => void) => 
    dismissible ? (
      <button 
        data-testid="dismiss-button" 
        onClick={onDismiss}
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
  mapSizeToVariant: (size: string) => size as any,
  getAriaAttributes: (severity: string) => ({
    role: severity === 'error' ? 'alert' : 'status',
    ariaLive: severity === 'error' ? 'assertive' : 'polite',
  }),
}));

describe('ErrorMessage Component', () => {
  describe('Basic Rendering', () => {
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

  describe('Severity Variants', () => {
    const severities = [
      { severity: 'error', icon: 'alert-circle', role: 'alert' },
      { severity: 'warning', icon: 'alert-triangle', role: 'status' },
      { severity: 'info', icon: 'info', role: 'status' },
      { severity: 'success', icon: 'check-circle', role: 'status' },
    ] as const;

    severities.forEach(({ severity, icon, role }) => {
      it(`should render with ${severity} severity`, () => {
        render(<ErrorMessage message="Test message" severity={severity} data-testid="error-message" />);
        
        const errorMessage = screen.getByTestId('error-message');
        const iconElement = screen.getByTestId('mock-icon');
        
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveAttribute('role', role);
        expect(iconElement).toHaveAttribute('data-icon', icon);
      });
    });
  });

  describe('Size Variants', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

    sizes.forEach(size => {
      it(`should render with ${size} size`, () => {
        render(<ErrorMessage message="Test message" size={size} data-testid="error-message" />);
        
        const errorMessage = screen.getByTestId('error-message');
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Optional Content', () => {
    it('should render with title', () => {
      render(<ErrorMessage message="Test message" title="Error Title" />);
      
      expect(screen.getByTestId('error-title')).toBeInTheDocument();
      expect(screen.getByText('Error Title')).toBeInTheDocument();
    });

    it('should render with details', () => {
      render(<ErrorMessage message="Test message" details="Error details here" />);
      
      expect(screen.getByTestId('error-details')).toBeInTheDocument();
      expect(screen.getByText('Error details here')).toBeInTheDocument();
    });

    it('should not render title when not provided', () => {
      render(<ErrorMessage message="Test message" />);
      
      expect(screen.queryByTestId('error-title')).not.toBeInTheDocument();
    });

    it('should not render details when not provided', () => {
      render(<ErrorMessage message="Test message" />);
      
      expect(screen.queryByTestId('error-details')).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render action buttons when actions are provided', () => {
      const actions = [
        { label: 'Retry', onClick: vi.fn() },
        { label: 'Cancel', onClick: vi.fn(), variant: 'secondary' as const },
      ];

      render(<ErrorMessage message="Test message" actions={actions} />);
      
      expect(screen.getByTestId('error-actions')).toBeInTheDocument();
      expect(screen.getByTestId('action-retry')).toBeInTheDocument();
      expect(screen.getByTestId('action-cancel')).toBeInTheDocument();
    });

    it('should call action onClick when button is clicked', async () => {
      const user = userEvent.setup();
      const retryAction = vi.fn();
      const actions = [{ label: 'Retry', onClick: retryAction }];

      render(<ErrorMessage message="Test message" actions={actions} />);
      
      const retryButton = screen.getByTestId('action-retry');
      await user.click(retryButton);
      
      expect(retryAction).toHaveBeenCalledTimes(1);
    });

    it('should apply correct variant classes to action buttons', () => {
      const actions = [
        { label: 'Primary Action', onClick: vi.fn() },
        { label: 'Secondary Action', onClick: vi.fn(), variant: 'secondary' as const },
      ];

      render(<ErrorMessage message="Test message" actions={actions} />);
      
      const primaryButton = screen.getByTestId('action-primary-action');
      const secondaryButton = screen.getByTestId('action-secondary-action');
      
      expect(primaryButton).toHaveClass('primary');
      expect(secondaryButton).toHaveClass('secondary');
    });
  });

  describe('Dismissible Functionality', () => {
    it('should render dismiss button when dismissible is true', () => {
      render(<ErrorMessage message="Test message" dismissible />);
      
      const dismissButton = screen.getByTestId('dismiss-button');
      expect(dismissButton).toBeInTheDocument();
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss');
    });

    it('should not render dismiss button when dismissible is false', () => {
      render(<ErrorMessage message="Test message" dismissible={false} />);
      
      expect(screen.queryByTestId('dismiss-button')).not.toBeInTheDocument();
    });

    it('should hide component when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      render(<ErrorMessage message="Test message" dismissible data-testid="error-message" />);
      
      const errorMessage = screen.getByTestId('error-message');
      const dismissButton = screen.getByTestId('dismiss-button');
      
      expect(errorMessage).toBeInTheDocument();
      
      await user.click(dismissButton);
      
      expect(errorMessage).not.toBeInTheDocument();
    });

    it('should call onDismiss callback when dismissed', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      
      render(<ErrorMessage message="Test message" dismissible onDismiss={onDismiss} />);
      
      const dismissButton = screen.getByTestId('dismiss-button');
      await user.click(dismissButton);
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Layout Modifiers', () => {
    it('should apply compact styling when compact prop is true', () => {
      render(<ErrorMessage message="Test message" title="Title" details="Details" compact />);
      
      const title = screen.getByTestId('error-title');
      const details = screen.getByTestId('error-details');
      
      expect(title).toHaveClass('compact');
      expect(details).toHaveClass('compact');
    });

    it('should apply inline styling when inline prop is true', () => {
      render(<ErrorMessage message="Test message" inline data-testid="error-message" />);
      
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes for error severity', () => {
      render(<ErrorMessage message="Test message" severity="error" data-testid="error-message" />);
      
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have correct ARIA attributes for non-error severities', () => {
      render(<ErrorMessage message="Test message" severity="info" data-testid="error-message" />);
      
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveAttribute('role', 'status');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });

    it('should hide icon from screen readers', () => {
      render(<ErrorMessage message="Test message" />);
      
      const icon = screen.getByTestId('mock-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Event Handling', () => {
    it('should pass through custom props', () => {
      render(<ErrorMessage message="Test" id="custom-id" title="Custom title" />);
      
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveAttribute('id', 'custom-id');
      expect(errorMessage).toHaveAttribute('title', 'Custom title');
    });
  });
});

describe('Semantic Alert Components', () => {
  describe('ErrorAlert', () => {
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

  describe('WarningAlert', () => {
    it('should render with warning severity', () => {
      render(<WarningAlert message="Warning message" data-testid="warning-alert" />);
      
      const alert = screen.getByTestId('warning-alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('role', 'status');
      expect(screen.getByTestId('mock-icon')).toHaveAttribute('data-icon', 'alert-triangle');
    });
  });

  describe('InfoAlert', () => {
    it('should render with info severity', () => {
      render(<InfoAlert message="Info message" data-testid="info-alert" />);
      
      const alert = screen.getByTestId('info-alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('role', 'status');
      expect(screen.getByTestId('mock-icon')).toHaveAttribute('data-icon', 'info');
    });
  });

  describe('SuccessAlert', () => {
    it('should render with success severity', () => {
      render(<SuccessAlert message="Success message" data-testid="success-alert" />);
      
      const alert = screen.getByTestId('success-alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('role', 'status');
      expect(screen.getByTestId('mock-icon')).toHaveAttribute('data-icon', 'check-circle');
    });
  });

  describe('Props Inheritance', () => {
    it('should inherit all ErrorMessage props except severity', () => {
      const onDismiss = vi.fn();
      render(
        <ErrorAlert 
          message="Test message" 
          title="Test Title"
          dismissible 
          onDismiss={onDismiss}
          data-testid="error-alert"
        />
      );
      
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
      expect(screen.getByTestId('error-title')).toBeInTheDocument();
      expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
    });
  });
});

describe('Complex Scenarios', () => {
  it('should render with all props combined', () => {
    const actions = [{ label: 'Retry', onClick: vi.fn() }];
    const onDismiss = vi.fn();

    render(
      <ErrorMessage
        message="Complex error message"
        title="Error Title"
        details="Detailed error information"
        severity="warning"
        size="lg"
        dismissible
        compact
        inline
        actions={actions}
        onDismiss={onDismiss}
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
  });

  it('should maintain visibility state correctly', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ErrorMessage message="Test message" dismissible data-testid="error-message" />
    );

    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toBeInTheDocument();

    // Dismiss the message
    const dismissButton = screen.getByTestId('dismiss-button');
    await user.click(dismissButton);

    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();

    // Rerender with same props should not show the message (state persists)
    rerender(<ErrorMessage message="Test message" dismissible data-testid="error-message" />);
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });
});

describe('Error Handling', () => {
  it('should handle missing message gracefully', () => {
    expect(() => {
      render(<ErrorMessage message="" />);
    }).not.toThrow();
  });

  it('should handle invalid severity gracefully', () => {
    expect(() => {
      render(<ErrorMessage message="Test" severity={'invalid' as any} />);
    }).not.toThrow();
  });

  it('should handle empty actions array', () => {
    render(<ErrorMessage message="Test message" actions={[]} />);
    
    expect(screen.queryByTestId('error-actions')).not.toBeInTheDocument();
  });
});