import { createLazyFileRoute } from "@tanstack/react-router";
import { EntityList, type ColumnConfig } from '@/components/EntityList';
export const Route = createLazyFileRoute("/funders/")({
  component: FundersRoute,
});


const fundersColumns: ColumnConfig[] = [
  { key: 'id', header: 'ID' },
  { key: 'display_name', header: 'Name' },
  { key: 'country_code', header: 'Country' },
  { key: 'international', header: 'International' },
];

function FundersRoute() {
  return <EntityList entityType="funders" columns={fundersColumns} title="Funders" />;
}

export default FundersRoute;
