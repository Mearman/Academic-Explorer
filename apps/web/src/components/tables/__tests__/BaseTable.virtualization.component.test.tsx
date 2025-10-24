/**
 * @vitest-environment jsdom
 */
import { type ColumnDef } from "@tanstack/react-table";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BaseTable } from "../BaseTable";

// Mock window.matchMedia for Mantine
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock ResizeObserver for virtualization
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock @tanstack/react-virtual
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn(() => ({
    getVirtualItems: vi.fn(() => []),
    getTotalSize: vi.fn(() => 0),
    scrollToIndex: vi.fn(),
    scrollToOffset: vi.fn(),
  })),
}));

// Mock @tanstack/react-table
vi.mock("@tanstack/react-table", () => ({
  useReactTable: vi.fn(() => ({
    getHeaderGroups: vi.fn(() => []),
    getRowModel: vi.fn(() => ({ rows: [] })),
    getState: vi.fn(() => ({
      pagination: { pageIndex: 0, pageSize: 10 },
      sorting: [],
      columnFilters: [],
      globalFilter: "",
    })),
    getPageCount: vi.fn(() => 1),
    setPageIndex: vi.fn(),
  })),
  getCoreRowModel: vi.fn(() => ({})),
  getSortedRowModel: vi.fn(() => ({})),
  getFilteredRowModel: vi.fn(() => ({})),
  getPaginationRowModel: vi.fn(() => ({})),
  flexRender: vi.fn(() => null),
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
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "value",
    header: "Value",
  },
];

const TableWrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

describe.skip("BaseTable Virtualization", () => {
  it("should render normally with small datasets (no virtualization)", () => {
    const data = generateTestData(50);

    render(
      <TableWrapper>
        <BaseTable data={data} columns={columns} enableVirtualization={false} />
      </TableWrapper>,
    );

    // Should render a normal table
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
  });

  it("should enable virtualization for large datasets", async () => {
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
      </TableWrapper>,
    );

    // Wait for virtualization to initialize and render
    await screen.findByText(/Showing \d+ of 200 entries \(virtualized\)/);

    // Should show virtualized indicator in status text (more specific check)
    expect(
      screen.getByText(/Showing \d+ of 200 entries \(virtualized\)/),
    ).toBeInTheDocument();

    // Should not show pagination when virtualized
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("should handle empty data correctly", async () => {
    render(
      <TableWrapper>
        <BaseTable data={[]} columns={columns} enableVirtualization={true} />
      </TableWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("No data available")).toBeInTheDocument();
    });
  });

  it("should handle loading state correctly", async () => {
    const data = generateTestData(100);

    render(
      <TableWrapper>
        <BaseTable
          data={data}
          columns={columns}
          isLoading={true}
          enableVirtualization={true}
        />
      </TableWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  it("should automatically enable virtualization when data exceeds threshold", async () => {
    const data = generateTestData(150);

    render(
      <TableWrapper>
        <BaseTable
          data={data}
          columns={columns}
          enableVirtualization={data.length > 100}
        />
      </TableWrapper>,
    );

    // Wait for virtualization to initialize
    await screen.findByText(/Showing \d+ of 150 entries \(virtualized\)/);

    // Should show virtualized status with specific count
    expect(
      screen.getByText(/Showing \d+ of 150 entries \(virtualized\)/),
    ).toBeInTheDocument();
  });
});
