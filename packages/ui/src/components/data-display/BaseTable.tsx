import { useState } from 'react';
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
} from '@tanstack/react-table';
import { Table, Pagination, Group, TextInput, Select, Text, Box } from '@mantine/core';
import { IconSearch, IconSortAscending, IconSortDescending } from '@tabler/icons-react';

export interface BaseTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
}

export function BaseTable<T>({
  data,
  columns,
  isLoading = false,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = 'Search...',
  onRowClick,
}: BaseTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize,
  });

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    enableSorting: true,
    enableColumnFilters: true,
    enableGlobalFilter: searchable,
  });

  const handleRowClick = (row: T) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  return (
    <Box>
      {searchable && (
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
                setPagination(prev => ({ ...prev, pageSize: newSize, pageIndex: 0 }));
              }}
              data={[
                { value: '10', label: '10' },
                { value: '25', label: '25' },
                { value: '50', label: '50' },
                { value: '100', label: '100' },
              ]}
              w={100}
            />
          </Group>
        </Group>
      )}

      <Table
        striped
        highlightOnHover
        withTableBorder
        withColumnBorders
        stickyHeader
        style={{ minHeight: isLoading ? 400 : 'auto' }}
      >
        <Table.Thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Th
                  key={header.id}
                  style={{
                    cursor: header.column.getCanSort() ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <Group gap="xs" justify="space-between">
                    <Text fw={600}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </Text>
                    {header.column.getIsSorted() && (
                      header.column.getIsSorted() === 'asc'
                        ? <IconSortAscending size={14} />
                        : <IconSortDescending size={14} />
                    )}
                  </Group>
                </Table.Th>
              ))}
            </Table.Tr>
          ))}
        </Table.Thead>

        <Table.Tbody>
          {isLoading ? (
            <Table.Tr>
              <Table.Td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                <Text c="dimmed">Loading...</Text>
              </Table.Td>
            </Table.Tr>
          ) : table.getRowModel().rows.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                <Text c="dimmed">No data available</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <Table.Tr
                key={row.id}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                }}
                onClick={() => handleRowClick(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <Table.Td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {!isLoading && table.getRowModel().rows.length > 0 && (
        <Group justify="space-between" mt="md">
          <Text size="sm" c="dimmed">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} entries
          </Text>

          <Pagination
            value={table.getState().pagination.pageIndex + 1}
            onChange={(page) => table.setPageIndex(page - 1)}
            total={table.getPageCount()}
            size="sm"
            withEdges
          />
        </Group>
      )}
    </Box>
  );
}