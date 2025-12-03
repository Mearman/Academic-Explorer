import type { Bookmark, EntityType } from "@bibgraph/types";
import { ActionIcon, Badge, Box, Center, Group, Loader, Pagination, Select,Table, Text, Tooltip } from "@mantine/core";
import { IconSortAscending, IconSortDescending,IconTrash } from "@tabler/icons-react";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useMemo,useState } from "react";

import { TagList } from "./TagBadge";

export interface BookmarkTableProps {
	/**
	 * Array of bookmarks to display
	 */
	bookmarks: Bookmark[];

	/**
	 * Callback fired when a bookmark should be deleted
	 */
	onDeleteBookmark: (bookmarkId: string) => void;

	/**
	 * Callback fired when navigating to a bookmark
	 */
	onNavigate: (url: string) => void;

	/**
	 * Whether the list is in a loading state
	 * @default false
	 */
	loading?: boolean;

	/**
	 * Message to display when there are no bookmarks
	 * @default "No bookmarks yet"
	 */
	emptyMessage?: string;

	/**
	 * Test ID for E2E testing
	 */
	"data-testid"?: string;
}

/**
 * Get a display-friendly label for entity type
 * @param entityType
 */
const getEntityTypeLabel = (entityType: EntityType): string => entityType.charAt(0).toUpperCase() + entityType.slice(1);

/**
 * Get a color for entity type badges
 * @param entityType
 */
const getEntityTypeColor = (entityType: EntityType): string => {
	const colorMap: Record<EntityType, string> = {
		works: "blue",
		authors: "green",
		sources: "orange",
		institutions: "purple",
		topics: "pink",
		concepts: "cyan",
		publishers: "grape",
		funders: "yellow",
		keywords: "teal",
		domains: "indigo",
		fields: "lime",
		subfields: "violet",
	};
	return colorMap[entityType] || "gray";
};

/**
 * Format a date as relative time
 * @param date
 */
const formatRelativeTime = (date: Date): string => {
	if (!date || isNaN(date.getTime())) {
		return "Invalid date";
	}

	const now = Date.now();
	const timestamp = date.getTime();
	const diffMs = now - timestamp;

	if (diffMs < 0) {
		return "in the future";
	}

	const SECOND = 1000;
	const MINUTE = 60 * SECOND;
	const HOUR = 60 * MINUTE;
	const DAY = 24 * HOUR;
	const WEEK = 7 * DAY;
	const MONTH = 30 * DAY;
	const YEAR = 365 * DAY;

	if (diffMs < 10 * SECOND) return "just now";
	if (diffMs < MINUTE) {
		const seconds = Math.floor(diffMs / SECOND);
		return `${seconds}s ago`;
	}
	if (diffMs < HOUR) {
		const minutes = Math.floor(diffMs / MINUTE);
		return `${minutes}m ago`;
	}
	if (diffMs < DAY) {
		const hours = Math.floor(diffMs / HOUR);
		return `${hours}h ago`;
	}
	if (diffMs < WEEK) {
		const days = Math.floor(diffMs / DAY);
		return `${days}d ago`;
	}
	if (diffMs < MONTH) {
		const weeks = Math.floor(diffMs / WEEK);
		return `${weeks}w ago`;
	}
	if (diffMs < YEAR) {
		const months = Math.floor(diffMs / MONTH);
		return `${months}mo ago`;
	}
	const years = Math.floor(diffMs / YEAR);
	return `${years}y ago`;
};

/**
 * Table view for displaying bookmarks with sortable columns and pagination
 * @param root0
 * @param root0.bookmarks
 * @param root0.onDeleteBookmark
 * @param root0.onNavigate
 * @param root0.loading
 * @param root0.emptyMessage
 */
export const BookmarkTable = ({
	bookmarks,
	onDeleteBookmark,
	onNavigate,
	loading = false,
	emptyMessage = "No bookmarks yet",
	...restProps
}: BookmarkTableProps) => {
	const [sorting, setSorting] = useState<SortingState>([{ id: "addedAt", desc: true }]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const handleDelete = async (event: React.MouseEvent, bookmarkId: string) => {
		event.stopPropagation();
		setDeletingId(bookmarkId);
		try {
			await onDeleteBookmark(bookmarkId);
		} finally {
			setDeletingId(null);
		}
	};

	const columns = useMemo<ColumnDef<Bookmark>[]>(
		() => [
			{
				accessorKey: "entityType",
				header: "Type",
				size: 100,
				cell: ({ row }) => (
					<Badge color={getEntityTypeColor(row.original.entityType)} variant="light" size="sm">
						{getEntityTypeLabel(row.original.entityType)}
					</Badge>
				),
			},
			{
				accessorKey: "metadata.title",
				header: "Title",
				size: 300,
				cell: ({ row }) => (
					<Text size="sm" lineClamp={2} style={{ maxWidth: 300 }}>
						{row.original.metadata.title}
					</Text>
				),
			},
			{
				accessorKey: "metadata.tags",
				header: "Tags",
				size: 200,
				enableSorting: false,
				cell: ({ row }) =>
					row.original.metadata.tags && row.original.metadata.tags.length > 0 ? (
						<TagList tags={row.original.metadata.tags} size="xs" variant="light" maxVisible={3} />
					) : (
						<Text size="xs" c="dimmed">
							-
						</Text>
					),
			},
			{
				accessorKey: "addedAt",
				header: "Added",
				size: 100,
				cell: ({ row }) => (
					<Tooltip label={row.original.addedAt.toLocaleString()}>
						<Text size="xs" c="dimmed">
							{formatRelativeTime(row.original.addedAt)}
						</Text>
					</Tooltip>
				),
				sortingFn: (rowA, rowB) => rowA.original.addedAt.getTime() - rowB.original.addedAt.getTime(),
			},
			{
				id: "actions",
				header: "",
				size: 50,
				enableSorting: false,
				cell: ({ row }) => {
					const bookmarkId = row.original.id;
					if (!bookmarkId) return null;
					return (
						<Tooltip label="Delete bookmark" withinPortal>
							<ActionIcon
								variant="subtle"
								color="red"
								size="sm"
								onClick={(e) => handleDelete(e, bookmarkId)}
								loading={deletingId === bookmarkId}
								disabled={deletingId === bookmarkId}
								aria-label="Delete bookmark"
							>
								<IconTrash size={16} />
							</ActionIcon>
						</Tooltip>
					);
				},
			},
		],
		[deletingId]
	);

	const table = useReactTable({
		data: bookmarks,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		state: {
			sorting,
			pagination,
		},
		enableSorting: true,
	});

	// Loading state
	if (loading) {
		return (
			<Center p="xl" {...restProps}>
				<Loader size="md" />
			</Center>
		);
	}

	// Empty state
	if (bookmarks.length === 0) {
		return (
			<Center p="xl" {...restProps}>
				<Text size="sm" c="dimmed" ta="center">
					{emptyMessage}
				</Text>
			</Center>
		);
	}

	return (
		<Box {...restProps}>
			<Table striped highlightOnHover withTableBorder withColumnBorders stickyHeader>
				<Table.Thead>
					{table.getHeaderGroups().map((headerGroup) => (
						<Table.Tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<Table.Th
									key={header.id}
									style={{
										cursor: header.column.getCanSort() ? "pointer" : "default",
										userSelect: "none",
										width: header.column.getSize(),
									}}
									onClick={header.column.getToggleSortingHandler()}
								>
									<Group gap="xs" justify="space-between" wrap="nowrap">
										<Text fw={600} size="sm">
											{flexRender(header.column.columnDef.header, header.getContext())}
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

				<Table.Tbody>
					{table.getRowModel().rows.map((row) => (
						<Table.Tr
							key={row.id}
							style={{ cursor: "pointer" }}
							onClick={() => onNavigate(row.original.metadata.url)}
						>
							{row.getVisibleCells().map((cell) => (
								<Table.Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Table.Td>
							))}
						</Table.Tr>
					))}
				</Table.Tbody>
			</Table>

			{table.getRowModel().rows.length > 0 && (
				<Group justify="space-between" mt="md">
					<Group gap="md">
						<Text size="sm" c="dimmed">
							Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
							{Math.min(
								(table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
								bookmarks.length
							)}{" "}
							of {bookmarks.length}
						</Text>
						<Select
							size="xs"
							value={pagination.pageSize.toString()}
							onChange={(value) => {
								const newSize = Number(value) || 10;
								setPagination((prev) => ({ ...prev, pageSize: newSize, pageIndex: 0 }));
							}}
							data={[
								{ value: "10", label: "10 / page" },
								{ value: "25", label: "25 / page" },
								{ value: "50", label: "50 / page" },
							]}
							w={100}
						/>
					</Group>

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
};
