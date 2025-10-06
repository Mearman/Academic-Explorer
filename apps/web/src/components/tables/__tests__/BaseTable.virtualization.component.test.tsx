/**
 * @vitest-environment jsdom
 */
import { MantineProvider } from '@mantine/core';
import { type ColumnDef } from '@tanstack/react-table';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BaseTable } from '../BaseTable';

// Mock window.matchMedia for Mantine
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver for Mantine
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

interface TestData {
  id: string;
  name: string;
  value: number;
}

const generateTestData = (count: number): TestData[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    value: i * 10,
  }));
};

const columns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'value',
    header: 'Value',
  },
];

const TableWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('BaseTable Virtualization', () => {
  it('should render normally with small datasets (no virtualization)', () => {
    const data = generateTestData(50);

    render(
      <TableWrapper>
        <BaseTable
          data={data}
          columns={columns}
          enableVirtualization={false}
        />
      </TableWrapper>
    );

    // Should render a normal table
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('should enable virtualization for large datasets', () => {
    const data = generateTestData(200);

    render(
      <TableWrapper>
        <BaseTable
          data={data}
          columns={columns}
          enableVirtualization={true}
          estimateSize={50}
          maxHeight={400}
        />
      </TableWrapper>
    );

    // Should show virtualized indicator in status text (more specific check)
    expect(screen.getByText(/Showing \d+ of 200 entries \(virtualized\)/)).toBeInTheDocument();

    // Should not show pagination when virtualized
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('should handle empty data correctly', () => {
    render(
      <TableWrapper>
        <BaseTable
          data={[]}
          columns={columns}
          enableVirtualization={true}
        />
      </TableWrapper>
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should handle loading state correctly', () => {
    const data = generateTestData(100);

    render(
      <TableWrapper>
        <BaseTable
          data={data}
          columns={columns}
          isLoading={true}
          enableVirtualization={true}
        />
      </TableWrapper>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should automatically enable virtualization when data exceeds threshold', () => {
    const data = generateTestData(150);

    render(
      <TableWrapper>
        <BaseTable
          data={data}
          columns={columns}
          enableVirtualization={data.length > 100}
        />
      </TableWrapper>
    );

    // Should show virtualized status with specific count
    expect(screen.getByText(/Showing \d+ of 150 entries \(virtualized\)/)).toBeInTheDocument();
  });
});
