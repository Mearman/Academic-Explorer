/**
 * Component tests for RelationshipTypeFilter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { RelationshipTypeFilter } from './RelationshipTypeFilter';
import { RelationType } from '@academic-explorer/types';

describe('RelationshipTypeFilter', () => {
  const mockOnChange = vi.fn();

  // Get unique relationship types (excluding deprecated aliases)
  const getUniqueTypes = (): RelationType[] => {
    const values = Object.values(RelationType);
    const seen = new Set<string>();
    return values.filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  };

  const renderComponent = (selectedTypes: RelationType[] = []) => {
    return render(
      <MantineProvider>
        <RelationshipTypeFilter
          selectedTypes={selectedTypes}
          onChange={mockOnChange}
        />
      </MantineProvider>
    );
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render filter component with title', () => {
    renderComponent();
    expect(screen.getByText('Filter by Relationship Type')).toBeInTheDocument();
  });

  it('should render checkboxes for all relationship types', () => {
    renderComponent();

    // Verify all unique RelationType values have checkboxes
    const allTypes = getUniqueTypes();
    allTypes.forEach((type) => {
      const checkbox = screen.getByTestId(`filter-checkbox-${type}`);
      expect(checkbox).toBeInTheDocument();
    });
  });

  it('should show all checkboxes as checked when selectedTypes is empty', () => {
    renderComponent([]);

    const allTypes = getUniqueTypes();
    allTypes.forEach((type) => {
      // Mantine passes data-testid to the wrapper, find input inside
      const checkboxWrapper = screen.getByTestId(`filter-checkbox-${type}`);
      const input = checkboxWrapper.closest('.mantine-Checkbox-root')?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(input).toBeChecked();
    });
  });

  it('should only check selected types when selectedTypes is not empty', () => {
    const selectedTypes = [RelationType.AUTHORSHIP, RelationType.REFERENCE];
    renderComponent(selectedTypes);

    const authorshipCheckbox = screen.getByTestId(`filter-checkbox-${RelationType.AUTHORSHIP}`);
    const referenceCheckbox = screen.getByTestId(`filter-checkbox-${RelationType.REFERENCE}`);
    const publicationCheckbox = screen.getByTestId(`filter-checkbox-${RelationType.PUBLICATION}`);

    const authorshipInput = authorshipCheckbox.closest('.mantine-Checkbox-root')?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const referenceInput = referenceCheckbox.closest('.mantine-Checkbox-root')?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const publicationInput = publicationCheckbox.closest('.mantine-Checkbox-root')?.querySelector('input[type="checkbox"]') as HTMLInputElement;

    expect(authorshipInput).toBeChecked();
    expect(referenceInput).toBeChecked();
    expect(publicationInput).not.toBeChecked();
  });

  it('should call onChange when checkbox is toggled', async () => {
    const user = userEvent.setup();
    renderComponent([]);

    const authorshipCheckbox = screen.getByTestId(`filter-checkbox-${RelationType.AUTHORSHIP}`);
    await user.click(authorshipCheckbox);

    // When empty array (all selected), clicking should select only that one type
    expect(mockOnChange).toHaveBeenCalledWith([RelationType.AUTHORSHIP]);
  });

  it('should add type when checkbox is clicked on unselected type', async () => {
    const user = userEvent.setup();
    const selectedTypes = [RelationType.AUTHORSHIP];
    renderComponent(selectedTypes);

    const referenceCheckbox = screen.getByTestId(`filter-checkbox-${RelationType.REFERENCE}`);
    await user.click(referenceCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith([RelationType.AUTHORSHIP, RelationType.REFERENCE]);
  });

  it('should remove type when checkbox is clicked on selected type', async () => {
    const user = userEvent.setup();
    const selectedTypes = [RelationType.AUTHORSHIP, RelationType.REFERENCE];
    renderComponent(selectedTypes);

    const authorshipCheckbox = screen.getByTestId(`filter-checkbox-${RelationType.AUTHORSHIP}`);
    await user.click(authorshipCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith([RelationType.REFERENCE]);
  });

  it('should clear all selections when Clear All is clicked', async () => {
    const user = userEvent.setup();
    const selectedTypes = [RelationType.AUTHORSHIP, RelationType.REFERENCE];
    renderComponent(selectedTypes);

    const clearButton = screen.getByTestId('clear-all-button');
    await user.click(clearButton);

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('should select all types when Select All is clicked', async () => {
    const user = userEvent.setup();
    const selectedTypes = [RelationType.AUTHORSHIP];
    renderComponent(selectedTypes);

    const selectAllButton = screen.getByTestId('select-all-button');
    await user.click(selectAllButton);

    const allTypes = getUniqueTypes();
    expect(mockOnChange).toHaveBeenCalledWith(allTypes);
  });

  it('should disable Clear All button when no types selected', () => {
    renderComponent([]);

    const clearButton = screen.getByTestId('clear-all-button');
    expect(clearButton).toBeDisabled();
  });

  it('should disable Select All button when all types selected', () => {
    const allTypes = getUniqueTypes();
    renderComponent(allTypes);

    const selectAllButton = screen.getByTestId('select-all-button');
    expect(selectAllButton).toBeDisabled();
  });

  it('should use custom title when provided', () => {
    render(
      <MantineProvider>
        <RelationshipTypeFilter
          selectedTypes={[]}
          onChange={mockOnChange}
          title="Custom Filter Title"
        />
      </MantineProvider>
    );

    expect(screen.getByText('Custom Filter Title')).toBeInTheDocument();
  });
});
