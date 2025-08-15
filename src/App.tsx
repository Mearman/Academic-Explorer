import { IconAlertTriangle } from '@tabler/icons-react';
import { createRouter, RouterProvider, createHashHistory } from '@tanstack/react-router';
import { ErrorBoundary } from 'react-error-boundary';

import { routeTree } from './routeTree.gen';

// Create a new router instance with hash routing for GitHub Pages
const router = createRouter({ 
  routeTree,
  history: createHashHistory(),
  // basepath removed - Vite's base config handles GitHub Pages deployment
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-red-600 text-4xl mb-4">
          <IconAlertTriangle size={48} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-600 mb-4">
          {error.message}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;