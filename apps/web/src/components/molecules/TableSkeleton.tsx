import { Skeleton,Table } from "@mantine/core";

interface TableSkeletonProps {
  columnCount: number;
  rowCount?: number;
}

/**
 * Skeleton loading state for tables
 * Provides better perceived performance than a simple "Loading..." message
 * @param root0
 * @param root0.columnCount
 * @param root0.rowCount
 */
export const TableSkeleton = ({
  columnCount,
  rowCount = 5,
}: TableSkeletonProps) => <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <Table.Tr key={rowIndex}>
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <Table.Td key={colIndex}>
              <Skeleton height={20} radius="sm" />
            </Table.Td>
          ))}
        </Table.Tr>
      ))}
    </>;
