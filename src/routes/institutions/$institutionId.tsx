import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useGraphData } from '@/hooks/use-graph-data';

export const Route = createFileRoute('/institutions/$institutionId')({
  component: InstitutionRoute,
});

function InstitutionRoute() {
  const { institutionId } = Route.useParams();
  const { loadEntity } = useGraphData();

  useEffect(() => {
    const loadInstitution = async () => {
      try {
        // Load institution entity into the graph
        await loadEntity(institutionId);
      } catch (error) {
        console.error('Failed to load institution:', error);
      }
    };

    loadInstitution();
  }, [institutionId, loadEntity]);

  // Return null - the graph is visible from MainLayout
  // The route content is just for triggering the data load
  return null;
}