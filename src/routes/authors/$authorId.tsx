import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useGraphData } from '@/hooks/use-graph-data';
import { logError } from '@/lib/logger';

export const Route = createFileRoute('/authors/$authorId')({
  component: AuthorRoute,
});

function AuthorRoute() {
  const { authorId } = Route.useParams();
  const { loadEntity } = useGraphData();

  useEffect(() => {
    const loadAuthor = async () => {
      try {
        // Load author entity into the graph
        await loadEntity(authorId);
      } catch (error) {
        logError('Failed to load author', error, 'AuthorRoute', 'routing');
      }
    };

    loadAuthor();
  }, [authorId, loadEntity]);

  // Return null - the graph is visible from MainLayout
  // The route content is just for triggering the data load
  return null;
}