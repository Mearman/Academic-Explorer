import { Link } from '@tanstack/react-router';

interface ErrorActionsProps {
  onRetry: () => void;
}

export function ErrorActions({ onRetry }: ErrorActionsProps) {
  return (
    <div className="space-y-3">
      <button
        onClick={onRetry}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
      
      <button
        onClick={() => window.history.back()}
        className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
      >
        Go Back
      </button>
      
      <Link
        to="/"
        className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
      >
        Home
      </Link>
    </div>
  );
}