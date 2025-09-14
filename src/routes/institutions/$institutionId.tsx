import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useGraphData } from '@/hooks/use-graph-data';
import { logError } from '@/lib/logger';

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
        logError('Failed to load institution', error, 'InstitutionRoute', 'routing');
      }
    };

    void loadInstitution();
  }, [institutionId, loadEntity]);

  // Return null - the graph is visible from MainLayout
  // The route content is just for triggering the data load
  return null;
}