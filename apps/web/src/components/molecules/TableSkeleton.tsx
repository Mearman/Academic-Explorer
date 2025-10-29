import { Table, Skeleton } from "@mantine/core";

interface TableSkeletonProps {
  columnCount: number;
  rowCount?: number;
}

/**
 * Skeleton loading state for tables
 * Provides better perceived performance than a simple "Loading..." message
 */
export function TableSkeleton({
  columnCount,
  rowCount = 5,
}: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <Table.Tr key={rowIndex}>
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <Table.Td key={colIndex}>
              <Skeleton height={20} radius="sm" />
            </Table.Td>
          ))}
        </Table.Tr>
      ))}
    </>
  );
}
