/**
 * Validation Indicator Component Tests
 * 
 * Tests the validation indicator components that show validation status
 * for entities with badges, tooltips, and summary information.
 */

import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { EntityType } from '@/lib/openalex/utils/entity-detection';

import { ValidationIndicator, ValidationDot, ValidationSummary } from './validation-indicator';

// Mock the validation store
const mockValidationStore = {
  validationSettings: {
    enabled: true,
    showValidationIndicators: true,
    validatedEntityTypes: [EntityType.AUTHOR, EntityType.WORK],
    showInfo: true,
  },
  getValidationResult: vi.fn(),
  hasValidationIssues: vi.fn(),
  getEntityIssueCount: vi.fn(),
  getEntityHighestSeverity: vi.fn(),
};

vi.mock('@/stores/entity-validation-store', () => ({
  useEntityValidationStore: () => mockValidationStore,
}));

// Mock icons
vi.mock('@tabler/icons-react', () => ({
  IconCheck: () => <div data-testid="icon-check">✓</div>,
  IconAlertTriangle: () => <div data-testid="icon-warning">⚠</div>,
  IconX: () => <div data-testid="icon-error">✗</div>,
  IconInfoCircle: () => <div data-testid="icon-info">ℹ</div>,
}));

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

// Mock validation types
vi.mock('@/types/entity-validation', () => ({
  getValidationSeverityColor: (severity: string) => {
    switch (severity) {
      case 'error': return 'red';
      case 'warning': return 'orange';
      case 'info': return 'blue';
      default: return 'gray';
    }
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
};

describe('ValidationIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Display Logic', () => {
    it('should not render when validation is disabled', () => {
      mockValidationStore.validationSettings.enabled = false;
      
      render(
        <TestWrapper>
          <ValidationIndicator entityId="A123" entityType={EntityType.AUTHOR} />
        </TestWrapper>
      );
      
      // Component should not render - no validation indicators should be present
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(screen.queryByTestId('icon-check')).not.toBeInTheDocument();
      expect(screen.queryByTestId('icon-error')).not.toBeInTheDocument();
    });

    it('should not render when indicators are disabled', () => {
      mockValidationStore.validationSettings.enabled = true;
      mockValidationStore.validationSettings.showValidationIndicators = false;
      
      render(
        <TestWrapper>
          <ValidationIndicator entityId="A123" entityType={EntityType.AUTHOR} />
        </TestWrapper>
      );
      
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(screen.queryByTestId('icon-check')).not.toBeInTheDocument();
    });

    it('should not render when entity type is not validated', () => {
      mockValidationStore.validationSettings.enabled = true;
      mockValidationStore.validationSettings.showValidationIndicators = true;
      mockValidationStore.validationSettings.validatedEntityTypes = [EntityType.WORK];
      
      render(
        <TestWrapper>
          <ValidationIndicator entityId="A123" entityType={EntityType.AUTHOR} />
        </TestWrapper>
      );
      
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(screen.queryByTestId('icon-check')).not.toBeInTheDocument();
    });

    it('should not render when no validation result exists', () => {
      mockValidationStore.validationSettings.enabled = true;
      mockValidationStore.validationSettings.showValidationIndicators = true;
      mockValidationStore.validationSettings.validatedEntityTypes = [EntityType.AUTHOR];
      mockValidationStore.getValidationResult.mockReturnValue(null);
      
      render(
        <TestWrapper>
          <ValidationIndicator entityId="A123" entityType={EntityType.AUTHOR} />
        </TestWrapper>
      );
      
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(screen.queryByTestId('icon-check')).not.toBeInTheDocument();
    });
  });

  describe('Valid Status', () => {
    beforeEach(() => {
      mockValidationStore.validationSettings.enabled = true;
      mockValidationStore.validationSettings.showValidationIndicators = true;
      mockValidationStore.validationSettings.validatedEntityTypes = [EntityType.AUTHOR];
      mockValidationStore.getValidationResult.mockReturnValue({
        isValid: true,
        issueCounts: { errors: 0, warnings: 0, info: 0 },
        validatedAt: Date.now(),
      });
      mockValidationStore.hasValidationIssues.mockReturnValue(false);
      mockValidationStore.getEntityIssueCount.mockReturnValue(0);
      mockValidationStore.getEntityHighestSeverity.mockReturnValue(null);
    });

    it('should show valid status for entity without issues', () => {
      render(
        <TestWrapper>
          <ValidationIndicator entityId="A123" entityType={EntityType.AUTHOR} />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('icon-check')).toBeInTheDocument();
      // The badge shows the checkmark, both in icon and text - use getAllByText for multiple elements
      expect(screen.getAllByText('✓')).toHaveLength(2);
    });
  });

  describe('Error Status', () => {
    beforeEach(() => {
      mockValidationStore.validationSettings.enabled = true;
      mockValidationStore.validationSettings.showValidationIndicators = true;
      mockValidationStore.validationSettings.validatedEntityTypes = [EntityType.AUTHOR];
      mockValidationStore.getValidationResult.mockReturnValue({
        isValid: false,
        issueCounts: { errors: 2, warnings: 1, info: 0 },
        validatedAt: Date.now(),
      });
      mockValidationStore.hasValidationIssues.mockReturnValue(true);
      mockValidationStore.getEntityIssueCount.mockReturnValue(3);
      mockValidationStore.getEntityHighestSeverity.mockReturnValue('error');
    });

    it('should show error status for entity with errors', () => {
      render(
        <TestWrapper>
          <ValidationIndicator entityId="A123" entityType={EntityType.AUTHOR} />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('icon-error')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Warning Status', () => {
    beforeEach(() => {
      mockValidationStore.validationSettings.enabled = true;
      mockValidationStore.validationSettings.showValidationIndicators = true;
      mockValidationStore.validationSettings.validatedEntityTypes = [EntityType.AUTHOR];
      mockValidationStore.getValidationResult.mockReturnValue({
        isValid: false,
        issueCounts: { errors: 0, warnings: 2, info: 0 },
        validatedAt: Date.now(),
      });
      mockValidationStore.hasValidationIssues.mockReturnValue(true);
      mockValidationStore.getEntityIssueCount.mockReturnValue(2);
      mockValidationStore.getEntityHighestSeverity.mockReturnValue('warning');
    });

    it('should show warning status for entity with warnings', () => {
      render(
        <TestWrapper>
          <ValidationIndicator entityId="A123" entityType={EntityType.AUTHOR} />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('icon-warning')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});

describe('ValidationDot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidationStore.validationSettings.enabled = true;
    mockValidationStore.validationSettings.showValidationIndicators = true;
    mockValidationStore.validationSettings.validatedEntityTypes = [EntityType.AUTHOR];
  });

  it('should render colored dot for valid entity', () => {
    mockValidationStore.hasValidationIssues.mockReturnValue(false);
    mockValidationStore.getEntityHighestSeverity.mockReturnValue(null);
    
    const { container } = render(
      <TestWrapper>
        <ValidationDot entityId="A123" entityType={EntityType.AUTHOR} />
      </TestWrapper>
    );
    
    const dot = container.querySelector('div');
    expect(dot).toHaveStyle({
      width: '8px',
      height: '8px',
      borderRadius: '50%',
    });
  });

  it('should not render when validation is disabled', () => {
    mockValidationStore.validationSettings.enabled = false;
    
    const { container } = render(
      <TestWrapper>
        <ValidationDot entityId="A123" entityType={EntityType.AUTHOR} />
      </TestWrapper>
    );
    
    // Should not render any validation dot - check by looking for the specific style
    const dotElement = container.querySelector('div[style*="border-radius: 50%"]');
    expect(dotElement).not.toBeInTheDocument();
  });
});

describe('ValidationSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidationStore.validationSettings.enabled = true;
    mockValidationStore.validationSettings.validatedEntityTypes = [EntityType.AUTHOR];
  });

  it('should show summary for mixed validation results', () => {
    mockValidationStore.getValidationResult
      .mockReturnValueOnce({
        isValid: true,
        issueCounts: { errors: 0, warnings: 0, info: 0 },
      })
      .mockReturnValueOnce({
        isValid: false,
        issueCounts: { errors: 1, warnings: 2, info: 0 },
      })
      .mockReturnValueOnce(null);
    
    render(
      <TestWrapper>
        <ValidationSummary 
          entityIds={['A123', 'A456', 'A789']} 
          entityType={EntityType.AUTHOR} 
        />
      </TestWrapper>
    );
    
    expect(screen.getByText('Validation:')).toBeInTheDocument();
    expect(screen.getByText('(2/3 validated)')).toBeInTheDocument();
  });

  it('should not render when no entities are validated', () => {
    mockValidationStore.getValidationResult.mockReturnValue(null);
    
    render(
      <TestWrapper>
        <ValidationSummary 
          entityIds={['A123', 'A456']} 
          entityType={EntityType.AUTHOR} 
        />
      </TestWrapper>
    );
    
    expect(screen.queryByText('Validation:')).not.toBeInTheDocument();
  });
});