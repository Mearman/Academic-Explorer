import { EntityList, type ColumnConfig } from '@/components/EntityList';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/publishers/')({
  component: PublishersRoute,
});

const publishersColumns: ColumnConfig[] = [
  { key: 'id', header: 'ID' },
  { key: 'display_name', header: 'Name' },
  { key: 'international_standard_identifier', header: 'International Standard Identifier' },
];

function PublishersRoute() {
  return <EntityList entityType="publishers" columns={publishersColumns} title="Publishers" />;
}
