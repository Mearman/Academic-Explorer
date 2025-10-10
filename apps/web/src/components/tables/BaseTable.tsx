import { useState, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import {
  Table,
  Pagination,
  Group,
  TextInput,
  Select,
  Text,
  Box,
  ScrollArea,
} from "@mantine/core";
import {
  IconSearch,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import { logger } from "@academic-explorer/utils";
import { BORDER_GRAY_LIGHT } from "@/constants/styles";

interface BaseTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  // Virtualization options
  enableVirtualization?: boolean;
  estimateSize?: number;
  maxHeight?: number;
}

export function BaseTable<T>({
  data,
  columns,
  isLoading = false,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = "Search...",
  onRowClick,
  enableVirtualization = false,
  estimateSize = 50,
  maxHeight = 600,
}: BaseTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize,
  });

  // Virtualization setup
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = enableVirtualization && data.length > 100;

  // Use virtualization when enabled and dataset is large
  const effectivePageSize = shouldVirtualize ? data.length : pageSize;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: shouldVirtualize
      ? undefined
      : getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination: {
        ...pagination,
        pageSize: effectivePageSize,
      },
    },
    enableSorting: true,
    enableColumnFilters: true,
    enableGlobalFilter: searchable,
  });

  // Get rows for virtualization
  const { rows } = table.getRowModel();

  // Setup virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
    enabled: shouldVirtualize,
  });

  // Log performance metrics
  useEffect(() => {
    if (shouldVirtualize) {
      const virtualItems = rowVirtualizer.getVirtualItems();
      logger.debug("table-virtualization", "Virtualized table active", {
        totalRows: rows.length,
        visibleRange: virtualItems.length,
        estimateSize,
        maxHeight,
      });
    }
  }, [shouldVirtualize, rows.length, estimateSize, maxHeight, rowVirtualizer]);

  const handleRowClick = (row: T) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  // Helper function to render search controls
  const renderSearchControls = () => {
    if (!searchable) return null;

    return (
      <Group mb="md" justify="space-between">
        <TextInput
          placeholder={searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          style={{ minWidth: 300 }}
        />

        <Group>
          <Select
            label="Page size"
            value={pagination.pageSize.toString()}
            onChange={(value) => {
              const newSize = Number(value) || 10;
              setPagination((prev) => ({
                ...prev,
                pageSize: newSize,
                pageIndex: 0,
              }));
            }}
            data={[
              { value: "10", label: "10" },
              { value: "25", label: "25" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
            ]}
            w={100}
          />
        </Group>
      </Group>
    );
  };

  // Helper function to render table header
  const renderTableHeader = () => (
    <Table.Thead>
      {table.getHeaderGroups().map((headerGroup) => (
        <Table.Tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <Table.Th
              key={header.id}
              style={{
                cursor: header.column.getCanSort() ? "pointer" : "default",
                userSelect: "none",
              }}
              onClick={header.column.getToggleSortingHandler()}
            >
              <Group gap="xs" justify="space-between">
                <Text fw={600}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </Text>
                {header.column.getIsSorted() &&
                  (header.column.getIsSorted() === "asc" ? (
                    <IconSortAscending size={14} />
                  ) : (
                    <IconSortDescending size={14} />
                  ))}
              </Group>
            </Table.Th>
          ))}
        </Table.Tr>
      ))}
    </Table.Thead>
  );

  // Helper function to render loading state
  const renderLoadingState = (colSpan: number) => (
    <Table.Tr>
      <Table.Td
        colSpan={colSpan}
        style={{ textAlign: "center", padding: "2rem" }}
      >
        <Text c="dimmed">Loading...</Text>
      </Table.Td>
    </Table.Tr>
  );

  // Helper function to render empty state
  const renderEmptyState = (colSpan: number) => (
    <Table.Tr>
      <Table.Td
        colSpan={colSpan}
        style={{ textAlign: "center", padding: "2rem" }}
      >
        <Text c="dimmed">No data available</Text>
      </Table.Td>
    </Table.Tr>
  );

  // Helper function to get virtual row style
  const getVirtualRowStyle = (
    virtualRow: VirtualItem,
    hasOnRowClick: boolean,
  ) => ({
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: `${virtualRow.size}px`,
    transform: `translateY(${virtualRow.start}px)`,
    borderBottom: BORDER_GRAY_LIGHT,
    backgroundColor:
      virtualRow.index % 2 === 0
        ? "var(--mantine-color-gray-0)"
        : "transparent",
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    ...(hasOnRowClick ? { cursor: "pointer" } : {}),
  });

  // Helper function to get cell style
  const getCellStyle = (cellIndex: number, totalCells: number) => ({
    flex: cellIndex === 1 ? "1" : "0 0 auto",
    padding: "0 8px",
    borderRight: cellIndex < totalCells - 1 ? BORDER_GRAY_LIGHT : "none",
    minWidth: getMinWidthForCell(cellIndex),
  });

  // Helper function to get minimum width for cell
  const getMinWidthForCell = (cellIndex: number): string => {
    switch (cellIndex) {
      case 0:
        return "80px";
      case 2:
        return "120px";
      case 3:
        return "100px";
      case 4:
        return "120px";
      default:
        return "auto";
    }
  };

  // Helper function to render virtual row
  const renderVirtualRow = (virtualRow: VirtualItem) => {
    const row = rows[virtualRow.index];
    const hasOnRowClick = !!onRowClick;

    // Use descriptive aria-label for row selection
    const ariaLabel = hasOnRowClick ? "Select this table row" : undefined;

    return (
      <button
        key={row.id}
        type="button"
        aria-label={ariaLabel}
        style={{
          ...getVirtualRowStyle(virtualRow, hasOnRowClick),
          border: "none",
          background: "none",
          padding: 0,
          textAlign: "left",
          width: "100%",
          font: "inherit",
          color: "inherit",
        }}
        onClick={hasOnRowClick ? () => handleRowClick(row.original) : undefined}
        onKeyDown={hasOnRowClick ? handleRowKeyDown(row.original) : undefined}
        onKeyUp={hasOnRowClick ? handleRowKeyUp : undefined}
        disabled={!hasOnRowClick}
      >
        {row.getVisibleCells().map((cell, cellIndex) => (
          <div
            key={cell.id}
            style={getCellStyle(cellIndex, row.getVisibleCells().length)}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        ))}
      </button>
    );
  };

  // Helper functions for row event handlers
  const handleRowKeyDown = (rowData: T) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowClick(rowData);
    }
  };

  const handleRowKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") {
      e.currentTarget.blur();
    }
  };

  // Helper function to render virtualized table
  const renderVirtualizedTable = () => (
    <div>
      <Table withTableBorder withColumnBorders>
        {renderTableHeader()}
      </Table>

      <ScrollArea
        ref={parentRef}
        style={{
          height: `${maxHeight}px`,
          overflow: "auto",
          border: BORDER_GRAY_LIGHT,
          borderTop: "none",
        }}
      >
        {isLoading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <Text c="dimmed">Loading...</Text>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <Text c="dimmed">No data available</Text>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map(renderVirtualRow)}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // Helper function to render regular table
  const renderRegularTable = () => (
    <Table
      striped
      highlightOnHover
      withTableBorder
      withColumnBorders
      stickyHeader
      style={{ minHeight: isLoading ? 400 : "auto" }}
    >
      {renderTableHeader()}

      <Table.Tbody>
        {isLoading
          ? renderLoadingState(columns.length)
          : table.getRowModel().rows.length === 0
            ? renderEmptyState(columns.length)
            : table.getRowModel().rows.map((row) => {
                // Use descriptive aria-label for row selection
                const ariaLabel = onRowClick
                  ? "Select this table row"
                  : undefined;

                return (
                  <Table.Tr
                    key={row.id}
                    role={onRowClick ? "button" : undefined}
                    aria-label={ariaLabel}
                    tabIndex={onRowClick ? 0 : undefined}
                    style={{ cursor: onRowClick ? "pointer" : "default" }}
                    onClick={
                      onRowClick
                        ? () => handleRowClick(row.original)
                        : undefined
                    }
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleRowClick(row.original);
                            }
                          }
                        : undefined
                    }
                    onKeyUp={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Escape") {
                              (e.target as HTMLElement).blur();
                            }
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                );
              })}
      </Table.Tbody>
    </Table>
  );

  // Helper function to render pagination info
  const renderPaginationInfo = () => {
    if (isLoading || rows.length === 0) return null;

    return (
      <Group justify="space-between" mt="md">
        <Text size="sm" c="dimmed">
          {shouldVirtualize ? (
            <>
              Showing {rowVirtualizer.getVirtualItems().length} of {rows.length}{" "}
              entries (virtualized)
            </>
          ) : (
            <>
              Showing{" "}
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}{" "}
              to{" "}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length,
              )}{" "}
              of {table.getFilteredRowModel().rows.length} entries
            </>
          )}
        </Text>

        {!shouldVirtualize && (
          <Pagination
            value={table.getState().pagination.pageIndex + 1}
            onChange={(page) => table.setPageIndex(page - 1)}
            total={table.getPageCount()}
            size="sm"
            withEdges
          />
        )}
      </Group>
    );
  };

  return (
    <Box>
      {renderSearchControls()}
      {shouldVirtualize ? renderVirtualizedTable() : renderRegularTable()}
      {renderPaginationInfo()}
    </Box>
  );
}
