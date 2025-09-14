import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useGraphData } from '@/hooks/use-graph-data';

export const Route = createFileRoute('/works/$workId')({
  component: WorkRoute,
});

function WorkRoute() {
  const { workId } = Route.useParams();
  const { loadEntity } = useGraphData();

  useEffect(() => {
    const loadWork = async () => {
      try {
        // Load work entity into the graph
        await loadEntity(workId);
      } catch (error) {
        console.error('Failed to load work:', error);
      }
    };

    loadWork();
  }, [workId, loadEntity]);

  // Return null - the graph is visible from MainLayout
  // The route content is just for triggering the data load
  return null;
}