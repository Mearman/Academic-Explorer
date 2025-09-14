import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useGraphData } from '@/hooks/use-graph-data';
import { logError } from '@/lib/logger';

export const Route = createFileRoute('/topics/$topicId')({
  component: TopicRoute,
});

function TopicRoute() {
  const { topicId } = Route.useParams();
  const { loadEntity } = useGraphData();

  useEffect(() => {
    const loadTopic = async () => {
      try {
        // Load topic entity into the graph
        await loadEntity(topicId);
      } catch (error) {
        logError('Failed to load topic:', error, 'TopicRoute', 'routing');
      }
    };

    void loadTopic();
  }, [topicId, loadEntity]);

  // Return null - the graph is visible from MainLayout
  // The route content is just for triggering the data load
  return null;
}